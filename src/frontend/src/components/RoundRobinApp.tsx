import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Bet, OddsData } from "../types";
import { BetslipSummary } from "./BetslipSummary";
import { OddsExplorer } from "./OddsExplorer";
import { StructureProgress } from "./StructureProgress";

const ODD_CATEGORIES = {
  minus200: { label: "~-200", count: 3, color: "bg-blue-500" },
  minus300: { label: "~-300", count: 2, color: "bg-purple-500" },
  minus500: { label: "~-500", count: 1, color: "bg-red-500" },
  plus100: { label: "~+100", count: 5, color: "bg-green-500" },
};

export default function RoundRobinApp() {
  const [apiKey, setApiKey] = useState("");
  const [sports, setSports] = useState<OddsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBets, setSelectedBets] = useState<Bet[]>([]);
  const [keyInput, setKeyInput] = useState("");

  const fetchSports = async (key: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/?apiKey=${key}`,
      );
      if (!response.ok) throw new Error("Invalid API key or rate limited");
      const data = await response.json();
      setSports(data);
      setApiKey(key);
      setKeyInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sports");
    } finally {
      setLoading(false);
    }
  };

  const addBet = (bet: Bet) => {
    if (selectedBets.length >= 11) {
      setError("Maximum 11 bets reached");
      return;
    }

    const category = getCategory(bet.odds);
    const categoryCount = selectedBets.filter(
      (b) => getCategory(b.odds) === category,
    ).length;
    const maxForCategory =
      ODD_CATEGORIES[category as keyof typeof ODD_CATEGORIES].count;

    if (categoryCount >= maxForCategory) {
      setError(
        `Maximum ${maxForCategory} bets for ${ODD_CATEGORIES[category as keyof typeof ODD_CATEGORIES].label} reached`,
      );
      return;
    }

    setSelectedBets([
      ...selectedBets,
      { ...bet, id: Math.random().toString() },
    ]);
    setError(null);
  };

  const removeBet = (id: string) => {
    setSelectedBets(selectedBets.filter((b) => b.id !== id));
  };

  const getCategory = (odds: number) => {
    const absOdds = Math.abs(odds);
    if (odds > 0) return "plus100";
    if (absOdds <= 250) return "minus200";
    if (absOdds <= 350) return "minus300";
    return "minus500";
  };

  const structureCounts = {
    minus200: selectedBets.filter((b) => getCategory(b.odds) === "minus200")
      .length,
    minus300: selectedBets.filter((b) => getCategory(b.odds) === "minus300")
      .length,
    minus500: selectedBets.filter((b) => getCategory(b.odds) === "minus500")
      .length,
    plus100: selectedBets.filter((b) => getCategory(b.odds) === "plus100")
      .length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-6 border-b border-border bg-card">
        <h1 className="text-3xl font-bold tracking-tight uppercase">
          Round Robin Builder
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          11-bet structure with strict odds rules
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-0 max-w-4xl w-full mx-auto px-4 py-6">
        {/* API Key Input */}
        {!apiKey && (
          <section className="border border-border p-4 mb-4 bg-card">
            <label
              htmlFor="api-key-input"
              className="block text-xs uppercase tracking-widest text-muted-foreground mb-3"
            >
              The Odds API Key
            </label>
            <div className="flex gap-2">
              <input
                id="api-key-input"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchSports(keyInput)}
                placeholder="Enter your API key from the-odds-api.com"
                className="flex-1 bg-input border border-border px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors duration-200 font-mono"
              />
              <button
                type="button"
                onClick={() => fetchSports(keyInput)}
                disabled={loading || !keyInput.trim()}
                className="bg-primary text-primary-foreground px-4 py-3 text-sm font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Load"
                )}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </section>
        )}

        {apiKey && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2">
                <OddsExplorer
                  sports={sports}
                  onAddBet={addBet}
                  apiKey={apiKey}
                />
              </div>
              <div className="flex flex-col gap-4">
                <StructureProgress structureCounts={structureCounts} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApiKey("")}
                    className="flex-1 border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    New API Key
                  </button>
                </div>
              </div>
            </div>

            {selectedBets.length > 0 && (
              <BetslipSummary bets={selectedBets} onRemoveBet={removeBet} />
            )}

            {error && (
              <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500 font-mono">
                {error}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Round Robin Builder for The Odds API
        </p>
      </footer>
    </div>
  );
}
