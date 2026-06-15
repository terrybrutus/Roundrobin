import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
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
] as const;
interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}

function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (draft === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const normalized = Math.min(
      max ?? Number.POSITIVE_INFINITY,
      Math.max(min, parsed),
    );
    setDraft(String(normalized));
    onChange(normalized);
  };

  return (
    <label className="text-xs">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next !== "" && Number.isFinite(Number(next))) {
            onChange(Number(next));
          }
        }}
        onBlur={commit}
        className="w-full bg-input border border-border p-2 mt-1"
      />
    </label>
  );
}

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
    <NumberField
      label={label}
      value={Number(settings[key])}
      min={min}
      max={max}
      onChange={(value) => update(key, value as never)}
    />
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
          <h2 className="font-bold uppercase">Generation preferences</h2>
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
                <option value="upcoming">Prefer upcoming</option>
                <option value="live">Prefer live</option>
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
                <option value="placement">Freshest / easiest placement</option>
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
            These preferences rank the available bets. They no longer block a
            valid 11-leg set from being generated.
          </p>
        </section>
        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Selection safety</h2>
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
          <p className="text-xs text-muted-foreground">
            Event and sport diversity are preferred automatically, but will
            relax when needed. Opposing selections remain a hard rule when
            enabled.
          </p>
        </section>
        <section className="border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold uppercase">Markets</h2>
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
          <p className="text-xs text-muted-foreground">
            Sportsbook links are optional. Every generated set can be copied or
            shared as a Gambly-ready slip.
          </p>
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
