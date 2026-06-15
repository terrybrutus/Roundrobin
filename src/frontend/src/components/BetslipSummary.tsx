import {
  Check,
  Copy,
  ExternalLink,
  ImageDown,
  Lock,
  LockOpen,
} from "lucide-react";
import { useState } from "react";
import type { Bet } from "../types";

interface BetslipSummaryProps {
  bets: Bet[];
  lockedBetIds: Set<string>;
  placedBetIds: Set<string>;
  onToggleLock: (id: string) => void;
  onTogglePlaced: (id: string) => void;
}

function eventLabel(bet: Bet): string {
  if (bet.isLive) return "LIVE - verify odds before placing";
  if (!bet.commenceTime) return "Time unavailable";
  return new Date(bet.commenceTime).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function signedPoint(point: number): string {
  return point > 0 ? `+${point}` : String(point);
}

function gamblyLine(bet: Bet): string {
  const event = `${bet.sport}: ${bet.game}`;
  if (bet.market === "h2h") return `${event} - ${bet.selection} ML`;
  if (bet.market === "spreads" && bet.point !== undefined)
    return `${event} - ${bet.selection} ${signedPoint(bet.point)}`;
  if (bet.market === "totals" && bet.point !== undefined)
    return `${event} - ${bet.selection} ${bet.point}`;
  return [
    event,
    "-",
    bet.description,
    bet.selection,
    bet.point !== undefined ? signedPoint(bet.point) : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}

function gamblyText(bets: Bet[]): string {
  return bets.map(gamblyLine).join("\n");
}

async function createSlipImage(bets: Bet[]): Promise<Blob> {
  const width = 1080;
  const rowHeight = 135;
  const height = 230 + bets.length * rowHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create slip image.");

  context.fillStyle = "#111111";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#54e88b";
  context.font = "bold 48px monospace";
  context.fillText("GAMBLY-READY BET SLIP", 64, 78);
  context.fillStyle = "#b5b5b5";
  context.font = "24px monospace";
  context.fillText(
    `${bets.length} legs - generated ${new Date().toLocaleString()}`,
    64,
    125,
  );

  bets.forEach((bet, index) => {
    const top = 175 + index * rowHeight;
    context.strokeStyle = "#333333";
    context.beginPath();
    context.moveTo(64, top + rowHeight - 20);
    context.lineTo(width - 64, top + rowHeight - 20);
    context.stroke();
    context.fillStyle = "#777777";
    context.font = "20px monospace";
    context.fillText(`${index + 1}. ${bet.sport}`, 64, top + 24);
    context.fillStyle = "#ffffff";
    context.font = "bold 26px monospace";
    const line = gamblyLine(bet);
    const firstLine = line.slice(0, 54);
    const secondLine = line.slice(54);
    context.fillText(firstLine, 64, top + 62);
    if (secondLine) context.fillText(secondLine, 64, top + 96);
    context.fillStyle = "#54e88b";
    context.textAlign = "right";
    context.fillText(
      `${bet.odds > 0 ? "+" : ""}${bet.odds}`,
      width - 64,
      top + 62,
    );
    context.textAlign = "left";
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image export failed.")),
      "image/png",
    ),
  );
}

export function BetslipSummary({
  bets,
  lockedBetIds,
  placedBetIds,
  onToggleLock,
  onTogglePlaced,
}: BetslipSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [imageStatus, setImageStatus] = useState("Share image");

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(gamblyText(bets));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareImage = async () => {
    setImageStatus("Creating...");
    try {
      const blob = await createSlipImage(bets);
      const file = new File([blob], "gambly-bet-slip.png", {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Gambly-ready bet slip",
          text: gamblyText(bets),
        });
        setImageStatus("Shared");
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(url);
        setImageStatus("Downloaded");
      }
    } catch {
      setImageStatus("Image failed");
    }
    setTimeout(() => setImageStatus("Share image"), 2000);
  };

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase">Placement Checklist</h2>
          <p className="text-xs text-muted-foreground">
            {placedBetIds.size}/{bets.length} marked added
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center gap-2 text-xs uppercase px-3 py-2 border border-border"
          >
            <Copy className="w-3 h-3" />
            {copied ? "Copied" : "Copy Gambly text"}
          </button>
          <button
            type="button"
            onClick={shareImage}
            className="flex items-center gap-2 text-xs uppercase px-3 py-2 border border-border"
          >
            <ImageDown className="w-3 h-3" />
            {imageStatus}
          </button>
        </div>
      </div>
      <div className="divide-y divide-border max-h-[42rem] overflow-y-auto">
        {bets.map((bet, index) => {
          const id = bet.id || "";
          const placed = placedBetIds.has(id);
          return (
            <div
              key={id}
              className={`p-4 ${placed ? "opacity-50 bg-green-500/10" : lockedBetIds.has(id) ? "bg-blue-500/10 border-l-2 border-l-blue-500" : "hover:bg-accent/30"}`}
            >
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Bet {index + 1} - {bet.sport}
                  </p>
                  <p className="text-sm font-semibold">{bet.game}</p>
                  <p
                    className={`text-xs mt-1 ${bet.isLive ? "text-red-500 font-bold" : "text-muted-foreground"}`}
                  >
                    {eventLabel(bet)}
                  </p>
                  <p className="text-xs mt-2 font-semibold text-green-500">
                    {gamblyLine(bet)}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="font-bold">
                    {bet.odds > 0 ? "+" : ""}
                    {bet.odds}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onTogglePlaced(id)}
                      className={`p-1 ${placed ? "text-green-500" : ""}`}
                      aria-label={placed ? "Mark not added" : "Mark added"}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLock(id)}
                      className="p-1"
                      aria-label={
                        lockedBetIds.has(id) ? "Unlock bet" : "Lock bet"
                      }
                    >
                      {lockedBetIds.has(id) ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <LockOpen className="w-4 h-4" />
                      )}
                    </button>
                    {bet.link && (
                      <a
                        href={bet.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 p-1"
                        aria-label="Open sportsbook link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
