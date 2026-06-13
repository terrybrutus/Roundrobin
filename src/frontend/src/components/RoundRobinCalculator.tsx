import { useState } from "react";
import type { Bet } from "../types";

interface Props {
  bets: Bet[];
  bankroll: number;
  size: number;
  onBankrollChange: (value: number) => void;
  onSizeChange: (value: number) => void;
}
function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [
    ...combinations(rest, size - 1).map((combo) => [first, ...combo]),
    ...combinations(rest, size),
  ];
}
function decimalOdds(american: number): number {
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}
function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
function calculate(
  bets: Bet[],
  size: number,
  bankroll: number,
  losers: Set<string>,
): { combos: number; stake: number; payout: number } {
  const combos = combinations(bets, size);
  const stake = combos.length ? bankroll / combos.length : 0;
  const payout = combos.reduce(
    (total, combo) =>
      losers.size && combo.some((bet) => losers.has(bet.id || ""))
        ? total
        : total +
          stake *
            combo.reduce((product, bet) => product * decimalOdds(bet.odds), 1),
    0,
  );
  return { combos: combos.length, stake, payout };
}

export function RoundRobinCalculator({
  bets,
  bankroll,
  size,
  onBankrollChange,
  onSizeChange,
}: Props) {
  const [losers, setLosers] = useState<Set<string>>(new Set());
  const current = calculate(bets, size, bankroll, losers);
  const toggleLoser = (id: string) =>
    setLosers((existing) => {
      const next = new Set(existing);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return (
    <div className="border border-border bg-card p-4 space-y-4">
      <h2 className="font-bold uppercase">Round Robin Calculator</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">
          Total bankroll
          <input
            type="number"
            min="0"
            step="0.01"
            value={bankroll}
            onChange={(event) => onBankrollChange(Number(event.target.value))}
            className="w-full bg-input border border-border p-2 mt-1"
          />
        </label>
        <label className="text-xs">
          RR type
          <select
            value={size}
            onChange={(event) => onSizeChange(Number(event.target.value))}
            className="w-full bg-input border border-border p-2 mt-1"
          >
            {Array.from(
              { length: Math.max(0, bets.length - 1) },
              (_, index) => index + 2,
            ).map((value) => (
              <option key={value} value={value}>
                {value}-pick x {bets.length}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Combos</span>
          <p className="font-bold">{current.combos}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Per combo</span>
          <p className="font-bold">{money(current.stake)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Simulated return</span>
          <p className="font-bold">{money(current.payout)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Profit / loss</span>
          <p
            className={
              current.payout >= bankroll ? "text-green-500" : "text-red-500"
            }
          >
            {money(current.payout - bankroll)}
          </p>
        </div>
      </div>
      <div>
        <div className="flex justify-between">
          <h3 className="text-xs uppercase text-muted-foreground">
            Tap any legs to simulate losses
          </h3>
          <button
            type="button"
            onClick={() => setLosers(new Set())}
            className="text-xs border border-border px-2"
          >
            Clear
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-2 mt-2">
          {bets.map((bet) => (
            <button
              key={bet.id}
              type="button"
              onClick={() => toggleLoser(bet.id || "")}
              className={`text-left border p-2 text-xs ${losers.has(bet.id || "") ? "border-red-500 bg-red-500/10" : "border-border"}`}
            >
              {bet.selection} · {bet.game}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs uppercase text-muted-foreground mb-2">
          RR type comparison, all legs win
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6]
            .filter((value) => value < bets.length)
            .map((value) => {
              const result = calculate(bets, value, bankroll, new Set());
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSizeChange(value)}
                  className={`border p-2 text-xs ${size === value ? "border-primary" : "border-border"}`}
                >
                  <strong>{value}-pick</strong>
                  <br />
                  {result.combos} combos
                  <br />
                  {money(result.payout)}
                </button>
              );
            })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimates split bankroll evenly. FanDuel rules, pushes, voids, limits,
        and changing odds can alter actual payouts.
      </p>
    </div>
  );
}
