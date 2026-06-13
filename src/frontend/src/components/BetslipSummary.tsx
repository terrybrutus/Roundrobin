import { Copy, ExternalLink, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import type { Bet } from "../types";

interface BetslipSummaryProps {
  bets: Bet[];
  lockedBetIds: Set<string>;
  onToggleLock: (id: string) => void;
}

export function BetslipSummary({
  bets,
  lockedBetIds,
  onToggleLock,
}: BetslipSummaryProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = bets
      .map(
        (bet) =>
          `${bet.sport} - ${bet.game}\n${bet.market}: ${bet.selection} (${bet.odds})`,
      )
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

  const getFanduelUrl = () => "https://sportsbook.fanduel.com/";

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide">Betslip</h2>
        <button
          type="button"
          onClick={copyToClipboard}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {bets.map((bet, idx) => (
          <div
            key={bet.id}
            className={`p-4 transition-colors ${
              lockedBetIds.has(bet.id || "")
                ? "bg-blue-500/10 border-l-2 border-l-blue-500"
                : "hover:bg-accent/30"
            }`}
          >
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
              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <div className="text-sm font-bold">
                    {bet.odds > 0 ? "+" : ""}
                    {bet.odds}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getOddsCategory(bet.odds)}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleLock(bet.id || "")}
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                    aria-label={
                      lockedBetIds.has(bet.id || "") ? "Unlock bet" : "Lock bet"
                    }
                  >
                    {lockedBetIds.has(bet.id || "") ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <LockOpen className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={getFanduelUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-green-500 transition-colors p-1"
                    aria-label="Open on FanDuel"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4 bg-accent/20">
        <div className="text-xs font-mono text-muted-foreground mb-2">
          Summary
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Bets:</span>
            <span className="ml-2 font-semibold">{bets.length}/11</span>
          </div>
          <div>
            <span className="text-muted-foreground">Locked:</span>
            <span className="ml-2 font-semibold">{lockedBetIds.size}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
