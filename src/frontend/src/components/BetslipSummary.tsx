import { useState } from "react";
import { Copy, X } from "lucide-react";
import type { Bet } from "../types";

interface BetslipSummaryProps {
  bets: Bet[];
  onRemoveBet: (id: string) => void;
}

export function BetslipSummary({ bets, onRemoveBet }: BetslipSummaryProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = bets
      .map((bet) => `${bet.sport} - ${bet.game}\n${bet.market}: ${bet.selection} (${bet.odds})`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getOddsCategory = (odds: number) => {
    const absOdds = Math.abs(odds);
    if (odds > 0) return "+100";
    if (absOdds <= 250) return "-200";
    if (absOdds <= 350) return "-300";
    return "-500";
  };

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide">Betslip</h2>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {bets.map((bet, idx) => (
          <div key={bet.id} className="p-4 hover:bg-accent/30 transition-colors">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="text-xs font-mono text-muted-foreground">
                  Bet {idx + 1} · {bet.sport}
                </p>
                <p className="text-sm font-semibold">{bet.game}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-background px-2 py-1 border border-border">
                    {bet.market.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {bet.selection}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">
                  {bet.odds > 0 ? "+" : ""}
                  {bet.odds}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getOddsCategory(bet.odds)}
                </div>
                <button
                  onClick={() => onRemoveBet(bet.id || "")}
                  className="mt-2 text-muted-foreground hover:text-red-500 transition-colors"
                  aria-label="Remove bet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4 bg-accent/20">
        <div className="text-xs font-mono text-muted-foreground mb-2">Summary</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Bets Selected:</span>
            <span className="ml-2 font-semibold">{bets.length}/11</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Odds:</span>
            <span className="ml-2 font-semibold">
              {(bets.reduce((sum, b) => sum + b.odds, 0) / bets.length).toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
