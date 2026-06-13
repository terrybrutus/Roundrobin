import { useState, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { OddsData, GameOdds, Bet } from "../types";

const ODD_RANGES = {
  minus200: [150, 250],
  minus300: [250, 350],
  minus500: [450, 550],
  plus100: [80, 120],
};

interface OddsExplorerProps {
  sports: OddsData[];
  onAddBet: (bet: Bet) => void;
  apiKey: string;
}

export function OddsExplorer({ sports, onAddBet, apiKey }: OddsExplorerProps) {
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [games, setGames] = useState<GameOdds[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedSport) {
      fetchGames(selectedSport);
    }
  }, [selectedSport]);

  const fetchGames = async (sportKey: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${apiKey}&includeLinks=true&includeSids=true`
      );
      if (!response.ok) throw new Error("Failed to fetch games");
      const data = await response.json();
      setGames(data.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGame = (gameId: string) => {
    const newSet = new Set(expandedGames);
    if (newSet.has(gameId)) {
      newSet.delete(gameId);
    } else {
      newSet.add(gameId);
    }
    setExpandedGames(newSet);
  };

  const oddsToBet = (outcome: string, odds: number, game: GameOdds, market: string) => ({
    sport: game.sport_title,
    game: `${game.home_team} vs ${game.away_team}`,
    market: market,
    selection: outcome,
    odds: odds,
  });

  const isValidOdds = (odds: number) => {
    const absOdds = Math.abs(odds);
    if (odds > 0) return absOdds >= 80 && absOdds <= 120;
    return (
      (absOdds >= 150 && absOdds <= 250) ||
      (absOdds >= 250 && absOdds <= 350) ||
      (absOdds >= 450 && absOdds <= 550)
    );
  };

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border p-4">
        <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Select Sport
        </label>
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        >
          <option value="">Choose a sport...</option>
          {sports.map((sport) => (
            <option key={sport.key} value={sport.key}>
              {sport.sport_title}
            </option>
          ))}
        </select>
      </div>

      {selectedSport && (
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            </div>
          ) : games.length > 0 ? (
            games.map((game) => (
              <div key={game.id}>
                <button
                  onClick={() => toggleGame(game.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {game.home_team} vs {game.away_team}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(game.commence_time).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 ml-2 transition-transform ${
                      expandedGames.has(game.id) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedGames.has(game.id) && (
                  <div className="border-t border-border p-4 bg-accent/30 space-y-3">
                    {game.markets?.map((market) => (
                      <div key={market.key}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                          {market.key.replace(/_/g, " ")}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {market.outcomes.map((outcome) => (
                            <button
                              key={`${outcome.name}-${outcome.price}`}
                              onClick={() =>
                                isValidOdds(outcome.price) &&
                                onAddBet(
                                  oddsToBet(
                                    outcome.name,
                                    outcome.price,
                                    game,
                                    market.key
                                  )
                                )
                              }
                              disabled={!isValidOdds(outcome.price)}
                              className={`text-xs py-2 px-2 border transition-colors ${
                                isValidOdds(outcome.price)
                                  ? "border-border bg-background hover:border-primary hover:text-primary cursor-pointer"
                                  : "border-border/50 bg-background/50 text-muted-foreground/50 cursor-not-allowed opacity-50"
                              }`}
                              title={
                                !isValidOdds(outcome.price)
                                  ? "Odds outside allowed ranges"
                                  : ""
                              }
                            >
                              <div className="font-semibold truncate">
                                {outcome.name}
                              </div>
                              <div className="text-muted-foreground">
                                {outcome.price > 0 ? "+" : ""}
                                {outcome.price}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No games available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
