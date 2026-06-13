import { useState } from "react";

const PRESETS = [
  {
    label: "FanDuel",
    url: "https://sportsbook.fanduel.com/",
  },
  {
    label: "DraftKings",
    url: "https://sportsbook.draftkings.com/",
  },
  {
    label: "BetMGM",
    url: "https://sports.betmgm.com/en/sports",
  },
  {
    label: "Caesars",
    url: "https://sportsbook.caesars.com/us/nj/bet",
  },
];

export default function App() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function openLink(target: string) {
    if (!target.trim()) return;
    window.open(target, "_blank");
    setStatus("Opening link...");
  }

  function handlePreset(presetUrl: string) {
    setUrl(presetUrl);
    openLink(presetUrl);
  }

  function handleOpen() {
    openLink(url);
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground font-mono flex flex-col"
      data-ocid="app.page"
    >
      {/* Header */}
      <header className="px-4 pt-8 pb-6 border-b border-border bg-card">
        <h1 className="text-3xl font-bold tracking-tight uppercase">
          Link Tester
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Test deep links for sportsbooks
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col gap-0 max-w-lg w-full mx-auto px-4 py-6">
        {/* URL Input section */}
        <section className="border border-border p-4 mb-4 bg-card">
          <label
            htmlFor="deeplink-input"
            className="block text-xs uppercase tracking-widest text-muted-foreground mb-3"
          >
            Paste your deep link
          </label>
          <input
            id="deeplink-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOpen()}
            placeholder="https:// or fanduel://"
            className="w-full bg-input border border-border px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors duration-200 font-mono"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-ocid="deeplink.input"
          />
        </section>

        {/* Presets section */}
        <section className="border border-border p-4 mb-4 bg-card">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            One-tap presets
          </p>
          <div className="flex flex-col gap-2">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset.url)}
                className="w-full border border-border px-4 py-3 text-sm font-bold uppercase tracking-wider text-foreground bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors duration-150 text-left"
                data-ocid={`preset.item.${i + 1}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* Open button */}
        <button
          type="button"
          onClick={handleOpen}
          disabled={!url.trim()}
          className="w-full bg-primary text-primary-foreground py-4 text-base font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-150"
          data-ocid="deeplink.open_button"
        >
          Open Link
        </button>

        {/* Status */}
        {status && (
          <div
            className="mt-4 border border-primary/40 bg-card px-4 py-3 text-sm text-primary font-mono"
            data-ocid="deeplink.success_state"
          >
            {status}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
