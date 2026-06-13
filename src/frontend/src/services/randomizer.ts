import type { Bet, GameOdds, Market } from "../types";

const STRUCTURE = [
  { category: "minus200", count: 3 },
  { category: "minus300", count: 2 },
  { category: "minus500", count: 1 },
  { category: "plus100", count: 5 },
];

interface RawBet {
  sport: string;
  game: string;
  market: string;
  selection: string;
  odds: number;
  link?: string;
  marketType?: string;
  oppositeOdds?: number;
}

function getCategory(odds: number): string {
  const absOdds = Math.abs(odds);
  if (odds > 0) return "plus100";
  if (absOdds <= 250) return "minus200";
  if (absOdds <= 350) return "minus300";
  return "minus500";
}

function isValidOdds(odds: number): boolean {
  const absOdds = Math.abs(odds);
  if (odds > 0) return absOdds >= 80 && absOdds <= 120;
  return (
    (absOdds >= 150 && absOdds <= 250) ||
    (absOdds >= 250 && absOdds <= 350) ||
    (absOdds >= 450 && absOdds <= 550)
  );
}

function hasValidPlus100Pairing(
  outcome: { name: string; price: number },
  market: Market,
): boolean {
  if (outcome.price <= 0 || outcome.price > 150) return false;

  const oppositeOutcome = market.outcomes.find(
    (o) => o.name !== outcome.name && o.price < 0 && Math.abs(o.price) <= 200,
  );

  return !!oppositeOutcome;
}

async function fetchAllGames(apiKey: string): Promise<Map<string, GameOdds[]>> {
  try {
    const sportsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`,
    );
    if (!sportsRes.ok) throw new Error("Failed to fetch sports");
    const sports = await sportsRes.json();
    console.log(`Fetched ${sports.length} sports`);

    const gamesByMarket = new Map<string, GameOdds[]>();

    for (const sport of sports) {
      if (!sport.active) continue;

      const gamesRes = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sport.key}/events?apiKey=${apiKey}&includeLinks=true`,
      );

      if (gamesRes.ok) {
        const games = await gamesRes.json();
        console.log(`  ${sport.sport_title}: ${games.length} games`);
        if (games.length > 0) {
          gamesByMarket.set(sport.key, games);
        }
      } else {
        console.log(
          `  ${sport.sport_title}: fetch failed (${gamesRes.status})`,
        );
      }
    }

    console.log(`Total sports with games: ${gamesByMarket.size}`);
    return gamesByMarket;
  } catch (err) {
    console.error("fetchAllGames error:", err);
    throw new Error(
      `Failed to fetch games: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

function extractValidBets(gamesByMarket: Map<string, GameOdds[]>): RawBet[] {
  const allBets: RawBet[] = [];
  const seenBets = new Set<string>();
  let totalOutcomes = 0;
  let invalidOdds = 0;
  let invalidPairing = 0;
  let valid = 0;

  for (const [, games] of gamesByMarket) {
    for (const game of games) {
      for (const market of game.markets || []) {
        for (const outcome of market.outcomes || []) {
          totalOutcomes++;

          if (!isValidOdds(outcome.price)) {
            invalidOdds++;
            continue;
          }

          const category = getCategory(outcome.price);
          const betKey = `${game.home_team}|${game.away_team}|${market.key}|${outcome.name}|${outcome.price}`;

          if (seenBets.has(betKey)) continue;
          seenBets.add(betKey);

          // Validate +100 bets have proper pairing
          if (category === "plus100") {
            if (!hasValidPlus100Pairing(outcome, market)) {
              console.log(
                `  Rejected +100: ${game.home_team} vs ${game.away_team} - ${outcome.name} @ ${outcome.price}`,
              );
              invalidPairing++;
              continue;
            }
          }

          valid++;
          const bet: RawBet = {
            sport: game.sport_title,
            game: `${game.home_team} vs ${game.away_team}`,
            market: market.key,
            selection: outcome.name,
            odds: outcome.price,
            link: game.links?.[0],
            marketType: market.key,
          };

          allBets.push(bet);
        }
      }
    }
  }

  console.log(`Bet extraction: ${totalOutcomes} outcomes`);
  console.log(
    `  ✓ Valid odds: ${valid}, ✗ Invalid odds: ${invalidOdds}, ✗ Invalid +100 pairing: ${invalidPairing}`,
  );
  console.log(`Final valid bets: ${allBets.length}`);

  return allBets;
}

function buildRoundRobin(
  allBets: RawBet[],
  lockedBets: Map<string, Bet>,
): Bet[] {
  const result: Bet[] = Array.from(lockedBets.values());
  const usedBetKeys = new Set<string>(
    result.map((b) => `${b.game}|${b.market}|${b.selection}|${b.odds}`),
  );

  const categoryCounts: Record<string, number> = {
    minus200: 0,
    minus300: 0,
    minus500: 0,
    plus100: 0,
  };

  for (const bet of result) {
    const cat = getCategory(bet.odds);
    categoryCounts[cat]++;
  }

  const needed: Record<string, number> = {
    minus200: 3 - categoryCounts.minus200,
    minus300: 2 - categoryCounts.minus300,
    minus500: 1 - categoryCounts.minus500,
    plus100: 5 - categoryCounts.plus100,
  };

  const categorized: Record<string, RawBet[]> = {
    minus200: [],
    minus300: [],
    minus500: [],
    plus100: [],
  };

  for (const bet of allBets) {
    const cat = getCategory(bet.odds);
    if (
      !usedBetKeys.has(`${bet.game}|${bet.market}|${bet.selection}|${bet.odds}`)
    ) {
      categorized[cat].push(bet);
    }
  }

  // Shuffle each category
  for (const cat in categorized) {
    for (let i = categorized[cat].length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [categorized[cat][i], categorized[cat][j]] = [
        categorized[cat][j],
        categorized[cat][i],
      ];
    }
  }

  // Fill remaining slots
  for (const struct of STRUCTURE) {
    const cat = struct.category;
    const fillCount = needed[cat];

    for (let i = 0; i < fillCount && categorized[cat].length > 0; i++) {
      const rawBet = categorized[cat].pop()!;
      result.push({
        id: Math.random().toString(),
        ...rawBet,
      });
    }
  }

  return result.slice(0, 11);
}

export async function randomizeRoundRobin(
  apiKey: string,
  lockedBetIds: Set<string>,
  currentBets: Bet[],
): Promise<Bet[]> {
  const lockedBetsMap = new Map<string, Bet>();

  for (const bet of currentBets) {
    if (lockedBetIds.has(bet.id || "")) {
      lockedBetsMap.set(bet.id || "", bet);
    }
  }

  const gamesByMarket = await fetchAllGames(apiKey);
  const allBets = extractValidBets(gamesByMarket);

  if (allBets.length < 11) {
    throw new Error(`Not enough valid bets available (${allBets.length}/11)`);
  }

  const result = buildRoundRobin(allBets, lockedBetsMap);

  if (result.length !== 11) {
    throw new Error(`Could not generate 11 bets (got ${result.length})`);
  }

  return result;
}
