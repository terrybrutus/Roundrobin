import { ChevronLeft } from "lucide-react";
import type { AppSettings } from "../types";

interface SettingsViewProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onBack: () => void;
  onClearData: () => void;
}

const MARKET_OPTIONS = [
  ["h2h", "Moneyline"],
  ["spreads", "Spreads"],
  ["totals", "Totals / O-U"],
  ["outrights", "Outrights"],
] as const;

export function SettingsView({
  settings,
  onChange,
  onBack,
  onClearData,
}: SettingsViewProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <header className="px-4 py-6 border-b border-border bg-card">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-3xl font-bold uppercase mt-4">Settings</h1>
      </header>
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">API and storage</h2>
          <label htmlFor="odds-api-key" className="block text-xs">
            The Odds API key
          </label>
          <input
            id="odds-api-key"
            type="password"
            value={settings.apiKey}
            onChange={(event) => update("apiKey", event.target.value)}
            className="w-full bg-input border border-border p-3"
          />
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={settings.rememberKey}
              onChange={(event) => update("rememberKey", event.target.checked)}
            />
            Remember key in this browser
          </label>
          <p className="text-xs text-muted-foreground">
            Browser storage is convenient but not a secure shared-secret vault.
            It will not sync between browsers.
          </p>
        </section>

        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Odds refresh</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              Cache minutes
              <input
                type="number"
                min="1"
                value={settings.cacheMinutes}
                onChange={(e) => update("cacheMinutes", Number(e.target.value))}
                className="w-full bg-input border border-border p-2 mt-1"
              />
            </label>
            <label className="text-xs">
              Time window hours
              <input
                type="number"
                min="1"
                value={settings.timeWindowHours}
                onChange={(e) =>
                  update("timeWindowHours", Number(e.target.value))
                }
                className="w-full bg-input border border-border p-2 mt-1"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MARKET_OPTIONS.map(([key, label]) => (
              <label key={key} className="flex gap-2 items-center text-sm">
                <input
                  type="checkbox"
                  checked={settings.markets.includes(key)}
                  onChange={(event) =>
                    update(
                      "markets",
                      event.target.checked
                        ? [...settings.markets, key]
                        : settings.markets.filter((market) => market !== key),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <label className="block text-xs">
            Additional market keys (comma separated, may increase cost)
            <input
              value={settings.customMarkets}
              onChange={(e) => update("customMarkets", e.target.value)}
              className="w-full bg-input border border-border p-2 mt-1"
              placeholder="player_points,player_rebounds"
            />
          </label>
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={settings.requireDeepLink}
              onChange={(e) => update("requireDeepLink", e.target.checked)}
            />
            Require usable FanDuel link
          </label>
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={settings.liveFirst}
              onChange={(e) => update("liveFirst", e.target.checked)}
            />
            Prioritize live events with fresh odds
          </label>
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={settings.todayFirst}
              onChange={(e) => update("todayFirst", e.target.checked)}
            />
            Prioritize events today
          </label>
          <p className="text-xs text-muted-foreground">
            The Odds API does not reliably expose timeout, halftime, or stoppage
            state. Live priority uses start time and odds freshness.
          </p>
        </section>

        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Round robin defaults</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              Bankroll
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.bankroll}
                onChange={(e) => update("bankroll", Number(e.target.value))}
                className="w-full bg-input border border-border p-2 mt-1"
              />
            </label>
            <label className="text-xs">
              Picks per combination
              <input
                type="number"
                min="2"
                max="10"
                value={settings.roundRobinSize}
                onChange={(e) =>
                  update("roundRobinSize", Number(e.target.value))
                }
                className="w-full bg-input border border-border p-2 mt-1"
              />
            </label>
          </div>
        </section>

        <button
          type="button"
          onClick={onClearData}
          className="border border-red-500 text-red-500 px-4 py-3 uppercase text-sm"
        >
          Clear saved app data
        </button>
      </main>
    </div>
  );
}
