import type { Bet } from "../types";

interface RoundRobinCalculatorProps {
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

export function RoundRobinCalculator({
  bets,
  bankroll,
  size,
  onBankrollChange,
  onSizeChange,
}: RoundRobinCalculatorProps) {
  const combos = combinations(bets, size);
  const stake = combos.length ? bankroll / combos.length : 0;
  const returnFor = (losingId?: string) =>
    combos.reduce((total, combo) => {
      if (losingId && combo.some((bet) => bet.id === losingId)) return total;
      return (
        total +
        stake *
          combo.reduce((product, bet) => product * decimalOdds(bet.odds), 1)
      );
    }, 0);
  const bestReturn = returnFor();

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
            onChange={(e) => onBankrollChange(Number(e.target.value))}
            className="w-full bg-input border border-border p-2 mt-1"
          />
        </label>
        <label className="text-xs">
          RR type
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
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
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Combos</span>
          <p className="font-bold">{combos.length}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Per combo</span>
          <p className="font-bold">{money(stake)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">All win return</span>
          <p className="font-bold text-green-500">{money(bestReturn)}</p>
        </div>
      </div>
      <div>
        <h3 className="text-xs uppercase text-muted-foreground mb-2">
          If one specific leg loses
        </h3>
        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {bets.map((bet) => {
            const value = returnFor(bet.id);
            return (
              <div
                key={bet.id}
                className="py-2 flex justify-between gap-3 text-xs"
              >
                <span className="truncate">
                  {bet.selection} · {bet.game}
                </span>
                <span
                  className={
                    value >= bankroll ? "text-green-500" : "text-red-500"
                  }
                >
                  {money(value)} ({money(value - bankroll)})
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimates assume every winning selection pays at the displayed American
        odds and the bankroll is split evenly across combinations. FanDuel
        rules, pushes, voids, limits, and changing odds can alter the actual
        payout.
      </p>
    </div>
  );
}
