import type { ApiUsage, AppSettings, Bet, GameOdds, OddsCache } from "../types";

const ROUND_ROBIN_LEGS = 11;
const FEATURED_MARKETS = new Set(["h2h", "spreads", "totals"]);

export function getOddsCategory(odds: number): string {
  const absOdds = Math.abs(odds);
  if (odds > 0) return "plus100";
  if (absOdds <= 250) return "minus200";
  if (absOdds < 450) return "minus300";
  return "minus500";
}

function isValidOdds(odds: number): boolean {
  return Number.isFinite(odds) && odds !== 0;
}

function parseUsage(response: Response): ApiUsage {
  const parse = (name: string) => {
    const value = response.headers.get(name);
    if (value === null || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    used: parse("x-requests-used"),
    remaining: parse("x-requests-remaining"),
    last: parse("x-requests-last"),
    updatedAt: new Date().toISOString(),
  };
}

function mergeUsage(current: ApiUsage, next: ApiUsage): ApiUsage {
  return {
    used: next.used ?? current.used,
    remaining: next.remaining ?? current.remaining,
    last: next.last ?? current.last,
    updatedAt: next.updatedAt,
  };
}

function explainApiFailure(response: Response, usage: ApiUsage): string {
  if (response.status === 429 && usage.remaining === 0) {
    return `Odds API quota exhausted. Used: ${usage.used ?? "unknown"}, remaining: 0.`;
  }
  if (response.status === 429) {
    return `The Odds API temporarily rate-limited this refresh. Last confirmed remaining credits: ${usage.remaining ?? "unknown"}. Try refreshing again shortly.`;
  }
  if (response.status === 401)
    return "The Odds API rejected the saved API key.";
  if (response.status === 422)
    return "The Odds API rejected part of the odds request as invalid.";
  return `The Odds API request failed (${response.status}).`;
}

async function fetchWithRateLimitRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let response = await fetch(input, init);
  for (let attempt = 0; response.status === 429 && attempt < 2; attempt++) {
    const usage = parseUsage(response);
    if (usage.remaining === 0) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter)
      ? Math.max(1_000, retryAfter * 1_000)
      : 1_000 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delay));
    response = await fetch(input, init);
  }
  return response;
}

function extractValidBets(games: GameOdds[], settings: AppSettings): Bet[] {
  const now = Date.now();
  const seen = new Set<string>();
  const bets: Bet[] = [];

  for (const game of games) {
    const startsAt = new Date(game.commence_time).getTime();

    for (const bookmaker of game.bookmakers || []) {
      if (bookmaker.key !== settings.bookmaker) continue;
      for (const market of bookmaker.markets || []) {
        for (const outcome of market.outcomes || []) {
          if (!isValidOdds(outcome.price)) continue;
          const key = `${game.id}|${market.key}|${outcome.name}|${outcome.description ?? ""}|${outcome.point ?? ""}|${outcome.price}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const link = outcome.link || market.link || bookmaker.link;
          bets.push({
            id: key,
            eventId: game.id,
            sportKey: game.sport_key,
            sport: game.sport_title,
            game: `${game.away_team} @ ${game.home_team}`,
            market: market.key,
            selection: outcome.name,
            description: outcome.description,
            odds: outcome.price,
            point: outcome.point,
            link,
            marketType: market.key,
            commenceTime: game.commence_time,
            lastUpdate: market.last_update || bookmaker.last_update,
            isLive: startsAt <= now,
          });
        }
      }
    }
  }
  return bets;
}

function requestedMarkets(settings: AppSettings): string[] {
  const markets = settings.markets.filter((market) =>
    FEATURED_MARKETS.has(market),
  );
  return markets.length ? markets : ["h2h"];
}

export function estimatedRefreshCost(settings: AppSettings): number {
  return new Set(requestedMarkets(settings)).size;
}

function baseOddsQuery(apiKey: string, settings: AppSettings): URLSearchParams {
  return new URLSearchParams({
    apiKey,
    bookmakers: settings.bookmaker,
    markets: [...new Set(requestedMarkets(settings))].join(","),
    oddsFormat: "american",
    includeLinks: "true",
    includeSids: "true",
  });
}

export async function refreshOdds(
  apiKey: string,
  settings: AppSettings,
  previousUsage?: ApiUsage,
): Promise<OddsCache> {
  const response = await fetchWithRateLimitRetry(
    `https://api.the-odds-api.com/v4/sports/upcoming/odds?${baseOddsQuery(apiKey, settings)}`,
  );
  let usage = previousUsage
    ? mergeUsage(previousUsage, parseUsage(response))
    : parseUsage(response);
  if (!response.ok) throw new Error(explainApiFailure(response, usage));
  const games = (await response.json()) as GameOdds[];
  const bets = extractValidBets(games, settings);
  const links = bets.filter((bet) => bet.link).length;
  const notice = `Simple refresh returned ${games.length} events and ${bets.length} usable bets. ${links} include sportsbook links; Gambly output works for every generated leg.`;
  if (bets.length === 0) {
    throw new Error(
      `The simple upcoming refresh returned no usable ${settings.bookmaker} bets. Remaining API credits: ${usage.remaining ?? "unknown"}.`,
    );
  }
  return { bets, usage, fetchedAt: new Date().toISOString(), notice };
}

export async function refreshSelectedBets(
  apiKey: string,
  settings: AppSettings,
  selected: Bet[],
): Promise<OddsCache> {
  const uniqueEvents = new Map<string, Bet>();
  for (const bet of selected) {
    if (bet.eventId && bet.sportKey) uniqueEvents.set(bet.eventId, bet);
  }
  const games: GameOdds[] = [];
  let usage: ApiUsage = {
    used: null,
    remaining: null,
    last: null,
    updatedAt: new Date().toISOString(),
  };
  for (const bet of uniqueEvents.values()) {
    const response = await fetchWithRateLimitRetry(
      `https://api.the-odds-api.com/v4/sports/${bet.sportKey}/events/${bet.eventId}/odds?${baseOddsQuery(apiKey, settings)}`,
    );
    usage = parseUsage(response);
    if (response.ok) games.push(await response.json());
  }
  return {
    bets: extractValidBets(games, settings),
    usage,
    fetchedAt: new Date().toISOString(),
  };
}

function priorityScore(bet: Bet, settings: AppSettings): number {
  const now = Date.now();
  const startsAt = new Date(bet.commenceTime || 0).getTime();
  const minutesAway = Math.max(0, (startsAt - now) / 60_000);
  const preferredWindowMinutes = settings.timeWindowHours * 60;
  const updateAge = bet.lastUpdate
    ? Math.max(0, (now - new Date(bet.lastUpdate).getTime()) / 60_000)
    : 120;
  if (settings.strategyMode === "random") return Math.random() * 100;
  let score = 10_000 - minutesAway;
  if (settings.timingMode === "live") score += bet.isLive ? 2_000 : -2_000;
  if (settings.timingMode === "upcoming") score += bet.isLive ? -2_000 : 2_000;
  if (minutesAway > preferredWindowMinutes)
    score -= minutesAway - preferredWindowMinutes;
  if (!bet.isLive && minutesAway < settings.minimumLeadMinutes) score -= 1_000;
  if (
    settings.todayFirst &&
    new Date(startsAt).toDateString() === new Date().toDateString()
  )
    score += 500;
  if (settings.strategyMode === "placement") {
    if (bet.isLive) score -= 2_000;
    if (bet.market.includes("player")) score -= 350;
    score -= updateAge * 2;
    if (bet.link) score += 100;
  }
  return score + Math.random() * 20;
}

function opposingSelection(candidate: Bet, result: Bet[]): boolean {
  return result.some(
    (bet) =>
      bet.eventId === candidate.eventId &&
      bet.market === candidate.market &&
      bet.selection !== candidate.selection,
  );
}

function canAdd(candidate: Bet, result: Bet[], settings: AppSettings): boolean {
  if (settings.avoidOpposingSelections && opposingSelection(candidate, result))
    return false;
  return true;
}

function rankCandidates(
  candidates: Bet[],
  selected: Bet[],
  settings: AppSettings,
  attempt: number,
): Bet[] {
  const ranked = candidates
    .map((bet) => {
      const eventCount = selected.filter(
        (selectedBet) => selectedBet.eventId === bet.eventId,
      ).length;
      const sportCount = selected.filter(
        (selectedBet) => selectedBet.sport === bet.sport,
      ).length;
      return {
        bet,
        score:
          priorityScore(bet, settings) - eventCount * 1_000 - sportCount * 100,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ bet }) => bet);
  if (!ranked.length) return ranked;
  const offset = attempt % ranked.length;
  return [...ranked.slice(offset), ...ranked.slice(0, offset)];
}

function tryBuildRoundRobin(
  allBets: Bet[],
  lockedBets: Bet[],
  settings: AppSettings,
  attempt: number,
): Bet[] | null {
  const result = [...lockedBets];
  const used = new Set(result.map((bet) => bet.id));
  while (result.length < ROUND_ROBIN_LEGS) {
    const candidate = rankCandidates(
      allBets.filter(
        (bet) => !used.has(bet.id) && canAdd(bet, result, settings),
      ),
      result,
      settings,
      attempt + result.length,
    )[0];
    if (!candidate) return null;
    result.push({ ...candidate, id: candidate.id || crypto.randomUUID() });
    used.add(candidate.id);
  }
  return result.slice(0, ROUND_ROBIN_LEGS);
}

export function randomizeRoundRobin(
  allBets: Bet[],
  lockedBetIds: Set<string>,
  currentBets: Bet[],
  settings: AppSettings,
): Bet[] {
  const lockedBets = currentBets.filter((bet) =>
    lockedBetIds.has(bet.id || ""),
  );
  if (lockedBets.length > ROUND_ROBIN_LEGS)
    throw new Error(
      `Unlock bets until no more than ${ROUND_ROBIN_LEGS} remain.`,
    );

  let result: Bet[] | null = null;
  for (let attempt = 0; attempt < 100 && !result; attempt++) {
    result = tryBuildRoundRobin(allBets, lockedBets, settings, attempt);
  }
  if (!result) {
    throw new Error(
      `Could not find ${ROUND_ROBIN_LEGS} non-duplicate bets${settings.avoidOpposingSelections ? " without opposing selections" : ""}. Refresh again or enable more markets.`,
    );
  }
  return result;
}
