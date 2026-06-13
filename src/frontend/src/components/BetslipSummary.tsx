import { Copy, ExternalLink, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import type { Bet } from "../types";

interface BetslipSummaryProps {
  bets: Bet[];
  lockedBetIds: Set<string>;
  onToggleLock: (id: string) => void;
}

function eventLabel(bet: Bet): string {
  if (bet.isLive) return "LIVE · verify odds before placing";
  if (!bet.commenceTime) return "Time unavailable";
  return new Date(bet.commenceTime).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BetslipSummary({
  bets,
  lockedBetIds,
  onToggleLock,
}: BetslipSummaryProps) {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      bets
        .map(
          (bet) =>
            `${bet.sport} · ${bet.game}\n${eventLabel(bet)}\n${bet.market}: ${bet.selection}${bet.description ? ` · ${bet.description}` : ""}${bet.point !== undefined ? ` ${bet.point}` : ""} (${bet.odds > 0 ? "+" : ""}${bet.odds})\n${bet.link || "No deep link"}`,
        )
        .join("\n\n"),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const openAll = () =>
    bets
      .filter((bet) => bet.link)
      .forEach((bet, index) =>
        setTimeout(
          () => window.open(bet.link, "_blank", "noopener,noreferrer"),
          index * 250,
        ),
      );

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border p-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide">Betslip</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openAll}
            disabled={!bets.some((bet) => bet.link)}
            className="text-xs font-semibold uppercase px-3 py-2 border border-border disabled:opacity-30"
          >
            Open all
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center gap-2 text-xs font-semibold uppercase px-3 py-2 border border-border"
          >
            <Copy className="w-3 h-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="divide-y divide-border max-h-[42rem] overflow-y-auto">
        {bets.map((bet, index) => (
          <div
            key={bet.id}
            className={`p-4 ${lockedBetIds.has(bet.id || "") ? "bg-blue-500/10 border-l-2 border-l-blue-500" : "hover:bg-accent/30"}`}
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Bet {index + 1} · {bet.sport}
                </p>
                <p className="text-sm font-semibold">{bet.game}</p>
                <p
                  className={`text-xs mt-1 ${bet.isLive ? "text-red-500 font-bold" : "text-muted-foreground"}`}
                >
                  {eventLabel(bet)}
                </p>
                <p className="text-xs mt-2">
                  <span className="uppercase border border-border px-2 py-1">
                    {bet.market.replace(/_/g, " ")}
                  </span>{" "}
                  <span className="ml-2">
                    {bet.selection}
                    {bet.description ? ` · ${bet.description}` : ""}
                    {bet.point !== undefined ? ` ${bet.point}` : ""}
                  </span>
                </p>
                {bet.lastUpdate && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Odds updated {new Date(bet.lastUpdate).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className="font-bold">
                  {bet.odds > 0 ? "+" : ""}
                  {bet.odds}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleLock(bet.id || "")}
                    className="p-1"
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
                  {bet.link ? (
                    <a
                      href={bet.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 p-1"
                      aria-label="Open bet on FanDuel"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      No link
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
