import type {
  ApiUsage,
  AppSettings,
  Bet,
  GameOdds,
  OddsCache,
  OddsData,
} from "../types";

const STRUCTURE = [
  { category: "minus200", count: 3 },
  { category: "minus300", count: 2 },
  { category: "minus500", count: 1 },
  { category: "plus100", count: 5 },
];
const SPORT_REQUEST_DELAY_MS = 350;
const FEATURED_MARKETS = new Set(["h2h", "spreads", "totals"]);

export function getOddsCategory(odds: number): string {
  const absOdds = Math.abs(odds);
  if (odds > 0) return "plus100";
  if (absOdds <= 250) return "minus200";
  if (absOdds < 450) return "minus300";
  return "minus500";
}

function isValidOdds(odds: number): boolean {
  const absOdds = Math.abs(odds);
  if (odds > 0) return absOdds >= 80 && absOdds <= 120;
  return (
    (absOdds >= 150 && absOdds <= 250) ||
    (absOdds > 250 && absOdds < 450) ||
    (absOdds >= 450 && absOdds <= 550)
  );
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

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
    await wait(delay);
    response = await fetch(input, init);
  }
  return response;
}

function eventAllowed(startsAt: number, settings: AppSettings): boolean {
  const now = Date.now();
  const live = startsAt <= now;
  if (settings.timingMode === "upcoming" && live) return false;
  if (settings.timingMode === "live" && !live) return false;
  if (!live && startsAt < now + settings.minimumLeadMinutes * 60_000)
    return false;
  return startsAt <= now + settings.timeWindowHours * 3_600_000;
}

function extractValidBets(games: GameOdds[], settings: AppSettings): Bet[] {
  const now = Date.now();
  const seen = new Set<string>();
  const bets: Bet[] = [];

  for (const game of games) {
    const startsAt = new Date(game.commence_time).getTime();
    if (!eventAllowed(startsAt, settings)) continue;

    for (const bookmaker of game.bookmakers || []) {
      if (bookmaker.key !== settings.bookmaker) continue;
      for (const market of bookmaker.markets || []) {
        for (const outcome of market.outcomes || []) {
          if (!isValidOdds(outcome.price)) continue;
          const key = `${game.id}|${market.key}|${outcome.name}|${outcome.description ?? ""}|${outcome.point ?? ""}|${outcome.price}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const link = outcome.link || market.link || bookmaker.link;
          if (settings.requireDeepLink && !link) continue;
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
  return [
    ...settings.markets,
    ...settings.customMarkets
      .split(",")
      .map((market) => market.trim())
      .filter(Boolean),
  ];
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

function sportOddsQuery(
  apiKey: string,
  settings: AppSettings,
  hasOutrights: boolean,
): URLSearchParams {
  const now = Date.now();
  const query = baseOddsQuery(apiKey, settings);
  const markets = hasOutrights
    ? ["outrights"]
    : requestedMarkets(settings).filter((market) =>
        FEATURED_MARKETS.has(market),
      );
  query.set("markets", [...new Set(markets)].join(","));
  query.set(
    "commenceTimeTo",
    new Date(now + settings.timeWindowHours * 3_600_000).toISOString(),
  );
  if (settings.timingMode === "upcoming") {
    query.set(
      "commenceTimeFrom",
      new Date(now + settings.minimumLeadMinutes * 60_000).toISOString(),
    );
  }
  return query;
}

function poolMeetsGenerationMinimums(
  bets: Bet[],
  settings: AppSettings,
): boolean {
  if (poolShortage(bets, []) !== null) return false;
  for (let attempt = 0; attempt < 10; attempt++) {
    if (tryBuildRoundRobin(bets, [], settings, attempt)) return true;
  }
  return false;
}

export async function refreshOdds(
  apiKey: string,
  settings: AppSettings,
  previousUsage?: ApiUsage,
): Promise<OddsCache> {
  const sportsResponse = await fetchWithRateLimitRetry(
    `https://api.the-odds-api.com/v4/sports?apiKey=${encodeURIComponent(apiKey)}`,
  );
  let usage = previousUsage
    ? mergeUsage(previousUsage, parseUsage(sportsResponse))
    : parseUsage(sportsResponse);
  if (!sportsResponse.ok)
    throw new Error(explainApiFailure(sportsResponse, usage));
  const sports: OddsData[] = await sportsResponse.json();
  const includeOutrights = requestedMarkets(settings).includes("outrights");
  const activeSports = sports.filter(
    (sport) => sport.active && (!sport.has_outrights || includeOutrights),
  );

  const games: GameOdds[] = [];
  let bets: Bet[] = [];
  let checkedSports = 0;
  let sportsWithOdds = 0;
  const failedSports: string[] = [];
  for (const sport of activeSports) {
    const sportMarkets = sport.has_outrights
      ? includeOutrights
      : requestedMarkets(settings).some((market) =>
          FEATURED_MARKETS.has(market),
        );
    if (!sportMarkets) continue;
    if (checkedSports > 0) await wait(SPORT_REQUEST_DELAY_MS);
    const response = await fetchWithRateLimitRetry(
      `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sport.key)}/odds?${sportOddsQuery(apiKey, settings, Boolean(sport.has_outrights))}`,
    );
    checkedSports++;
    const responseUsage = parseUsage(response);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          explainApiFailure(response, mergeUsage(usage, responseUsage)),
        );
      }
      failedSports.push(`${sport.key} (${response.status})`);
      continue;
    }
    usage = mergeUsage(usage, responseUsage);
    const sportGames = (await response.json()) as GameOdds[];
    if (!sportGames.length) continue;
    sportsWithOdds++;
    games.push(...sportGames);
    bets = extractValidBets(games, settings);
    if (poolMeetsGenerationMinimums(bets, settings)) break;
  }

  const withoutLinkRequirement = settings.requireDeepLink
    ? extractValidBets(games, { ...settings, requireDeepLink: false })
    : bets;
  const removedForMissingLinks = withoutLinkRequirement.length - bets.length;
  const remainingShortage = poolShortage(bets, []);
  const failureNotice = failedSports.length
    ? ` Skipped failed sport requests: ${failedSports.slice(0, 5).join(", ")}${failedSports.length > 5 ? `, plus ${failedSports.length - 5} more` : ""}.`
    : "";
  const notice = `Checked ${checkedSports} active sport odds endpoints; ${sportsWithOdds} returned events in the configured window.${failureNotice} Retained ${bets.length} eligible bets${removedForMissingLinks ? `; the deep-link requirement removed ${removedForMissingLinks}` : ""}.${remainingShortage ? ` Remaining shortage: ${remainingShortage}.` : ""}`;
  if (bets.length === 0) {
    throw new Error(
      `No eligible ${settings.bookmaker} bets remained after directly checking ${checkedSports} active sport odds endpoints; ${sportsWithOdds} returned events in the configured timing window.${failureNotice} ${removedForMissingLinks ? `The deep-link requirement removed ${removedForMissingLinks} otherwise-valid bets. ` : ""}Remaining API credits: ${usage.remaining ?? "unknown"}.`,
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
  const updateAge = bet.lastUpdate
    ? Math.max(0, (now - new Date(bet.lastUpdate).getTime()) / 60_000)
    : 120;
  if (settings.strategyMode === "random") return Math.random() * 100;
  let score = 10_000 - minutesAway;
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
  if (
    result.filter((bet) => bet.eventId === candidate.eventId).length >=
    settings.maxPerEvent
  )
    return false;
  if (
    result.filter((bet) => bet.sport === candidate.sport).length >=
    settings.maxPerSport
  )
    return false;
  if (settings.avoidOpposingSelections && opposingSelection(candidate, result))
    return false;
  return true;
}

function categoryCount(bets: Bet[], category: string): number {
  return bets.filter((bet) => getOddsCategory(bet.odds) === category).length;
}

function poolShortage(allBets: Bet[], lockedBets: Bet[]): string | null {
  const shortages = STRUCTURE.flatMap((item) => {
    const locked = categoryCount(lockedBets, item.category);
    const required = Math.max(0, item.count - locked);
    const available = categoryCount(
      allBets.filter(
        (bet) => !lockedBets.some((lockedBet) => lockedBet.id === bet.id),
      ),
      item.category,
    );
    return available < required
      ? [`${item.category}: ${available} available, ${required} needed`]
      : [];
  });
  return shortages.length ? shortages.join("; ") : null;
}

function rankCandidates(
  candidates: Bet[],
  settings: AppSettings,
  attempt: number,
): Bet[] {
  const ranked = candidates
    .map((bet) => ({ bet, score: priorityScore(bet, settings) }))
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
  const remaining = STRUCTURE.map((item) => ({
    ...item,
    needed: Math.max(0, item.count - categoryCount(result, item.category)),
    candidates: rankCandidates(
      allBets.filter(
        (bet) =>
          getOddsCategory(bet.odds) === item.category && !used.has(bet.id),
      ),
      settings,
      attempt,
    ),
  })).sort(
    (a, b) => a.candidates.length - a.needed - (b.candidates.length - b.needed),
  );

  for (const item of remaining) {
    for (const bet of item.candidates) {
      if (categoryCount(result, item.category) >= item.count) break;
      if (!canAdd(bet, result, settings)) continue;
      result.push({ ...bet, id: bet.id || crypto.randomUUID() });
      used.add(bet.id);
    }
    if (categoryCount(result, item.category) < item.count) return null;
  }
  if (
    new Set(result.map((bet) => bet.eventId)).size <
    settings.minimumUniqueEvents
  )
    return null;
  return result;
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
  const shortage = poolShortage(allBets, lockedBets);
  if (shortage) {
    throw new Error(
      `The refreshed odds pool cannot fill the required 11-leg structure (${shortage}). Review the refresh diagnostics above to see how many sports were checked and whether the deep-link requirement removed otherwise-valid bets.`,
    );
  }

  let result: Bet[] | null = null;
  for (let attempt = 0; attempt < 100 && !result; attempt++) {
    result = tryBuildRoundRobin(allBets, lockedBets, settings, attempt);
  }
  if (!result) {
    throw new Error(
      `The pool has enough odds in each category, but no combination satisfies max ${settings.maxPerEvent}/event, max ${settings.maxPerSport}/sport, and opposing-selection rules. Increase those maximums, lower minimum unique events, or disable opposing-selection avoidance.`,
    );
  }
  return result;
}
