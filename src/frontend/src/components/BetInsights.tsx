import type { Bet } from "../types";

export function BetInsights({ bets }: { bets: Bet[] }) {
  const gameCounts = bets.reduce<Record<string, number>>((counts, bet) => {
    counts[bet.game] = (counts[bet.game] || 0) + 1;
    return counts;
  }, {});
  const concentrated = Object.entries(gameCounts).filter(([, count]) => count > 1);
  const live = bets.filter((bet) => bet.isLive).length;
  const linked = bets.filter((bet) => bet.link).length;
  const props = bets.filter((bet) => bet.description || bet.market.includes("player")).length;

  return (
    <div className="border border-border bg-card p-4">
      <h2 className="font-bold uppercase mb-3">Set Insights</h2>
      <ul className="space-y-2 text-xs text-muted-foreground">
        <li>{live} live selections; {bets.length - live} upcoming selections.</li>
        <li>{linked}/{bets.length} selections have a direct bookmaker link.</li>
        <li>{props} player-prop or described selections.</li>
        <li>{concentrated.length ? `${concentrated.length} games contain multiple selections, increasing correlation risk.` : "No game has multiple selections in this set."}</li>
      </ul>
      <p className="text-xs text-muted-foreground mt-3">AI-generated gambling advice is intentionally disabled until a secure backend secret proxy is available. These insights are deterministic and do not predict outcomes.</p>
    </div>
  );
}
