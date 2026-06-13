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
const PRESETS: Record<string, Partial<AppSettings>> = {
  "Pregame Soonest": {
    timingMode: "upcoming",
    strategyMode: "soonest",
    minimumLeadMinutes: 10,
    timeWindowHours: 12,
  },
  "Placement Window": {
    timingMode: "upcoming",
    strategyMode: "placement",
    minimumLeadMinutes: 15,
    timeWindowHours: 24,
    maxPerEvent: 1,
    maxPerSport: 5,
    minimumUniqueEvents: 8,
  },
  "Mixed Live": {
    timingMode: "mixed",
    strategyMode: "placement",
    minimumLeadMinutes: 5,
    timeWindowHours: 12,
  },
  "Live Only": {
    timingMode: "live",
    strategyMode: "soonest",
    minimumLeadMinutes: 0,
    timeWindowHours: 6,
  },
};

export function SettingsView({
  settings,
  onChange,
  onBack,
  onClearData,
}: SettingsViewProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });
  const numberField = (
    label: string,
    key: keyof AppSettings,
    min: number,
    max?: number,
  ) => (
    <label className="text-xs">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={Number(settings[key])}
        onChange={(event) => update(key, Number(event.target.value) as never)}
        className="w-full bg-input border border-border p-2 mt-1"
      />
    </label>
  );

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
          <h2 className="font-bold uppercase">Saved strategies</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([name, preset]) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange({ ...settings, ...preset })}
                className="border border-border px-3 py-2 text-xs"
              >
                {name}
              </button>
            ))}
          </div>
        </section>
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
        </section>
        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Timing and placement</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              Timing mode
              <select
                value={settings.timingMode}
                onChange={(event) =>
                  update(
                    "timingMode",
                    event.target.value as AppSettings["timingMode"],
                  )
                }
                className="w-full bg-input border border-border p-2 mt-1"
              >
                <option value="upcoming">Upcoming only</option>
                <option value="live">Live only</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label className="text-xs">
              Generation strategy
              <select
                value={settings.strategyMode}
                onChange={(event) =>
                  update(
                    "strategyMode",
                    event.target.value as AppSettings["strategyMode"],
                  )
                }
                className="w-full bg-input border border-border p-2 mt-1"
              >
                <option value="soonest">Soonest first</option>
                <option value="placement">Placement window</option>
                <option value="random">Pure random</option>
              </select>
            </label>
            {numberField("Minimum lead minutes", "minimumLeadMinutes", 0)}
            {numberField("Maximum time window hours", "timeWindowHours", 1)}
            {numberField("Cache minutes", "cacheMinutes", 1)}
          </div>
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={settings.todayFirst}
              onChange={(event) => update("todayFirst", event.target.checked)}
            />
            Prioritize events today
          </label>
          <p className="text-xs text-muted-foreground">
            Halftime and timeout state is not reliably available. Live mode uses
            start time and odds freshness.
          </p>
        </section>
        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Diversification</h2>
          <div className="grid grid-cols-3 gap-3">
            {numberField("Max per event", "maxPerEvent", 1, 11)}
            {numberField("Max per sport", "maxPerSport", 1, 11)}
            {numberField("Minimum unique events", "minimumUniqueEvents", 1, 11)}
          </div>
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={settings.avoidOpposingSelections}
              onChange={(event) =>
                update("avoidOpposingSelections", event.target.checked)
              }
            />
            Avoid opposing selections in the same market
          </label>
        </section>
        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Markets and links</h2>
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
            Additional market keys
            <input
              value={settings.customMarkets}
              onChange={(event) => update("customMarkets", event.target.value)}
              className="w-full bg-input border border-border p-2 mt-1"
              placeholder="player_points,player_rebounds"
            />
          </label>
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={settings.requireDeepLink}
              onChange={(event) =>
                update("requireDeepLink", event.target.checked)
              }
            />
            Require usable FanDuel link
          </label>
        </section>
        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Calculator defaults</h2>
          <div className="grid grid-cols-2 gap-3">
            {numberField("Bankroll", "bankroll", 0)}
            {numberField("Picks per combination", "roundRobinSize", 2, 10)}
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
