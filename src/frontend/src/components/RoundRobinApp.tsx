import { ChevronDown, History, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { randomizeRoundRobin } from "../services/randomizer";
import type { Bet } from "../types";
import { BetslipSummary } from "./BetslipSummary";
import { HistoryView } from "./HistoryView";
import { StructureProgress } from "./StructureProgress";

interface RoundRobinSet {
  id: string;
  bets: Bet[];
  createdAt: Date;
  submitted: boolean;
}

export default function RoundRobinApp() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [history, setHistory] = useState<RoundRobinSet[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lockedBetIds, setLockedBetIds] = useState<Set<string>>(new Set());
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Intercept console.log for debugging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: unknown[]) => {
      originalLog(...args);
      const msg = args.map((a) => String(a)).join(" ");
      setDebugLogs((prev) => [...prev.slice(-20), msg]); // Keep last 20 logs
    };

    console.error = (...args: unknown[]) => {
      originalError(...args);
      const msg = `❌ ${args.map((a) => String(a)).join(" ")}`;
      setDebugLogs((prev) => [...prev.slice(-20), msg]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setKeyInput("");
    setError(null);
  };

  const randomize = async () => {
    if (!apiKey) return;
    try {
      setLoading(true);
      setError(null);

      const newBets = await randomizeRoundRobin(
        apiKey,
        lockedBetIds,
        currentBets,
      );

      if (newBets.length === 11) {
        setCurrentBets(newBets);
      } else {
        setError(`Failed to get 11 unique bets. Got ${newBets.length}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Randomization failed");
    } finally {
      setLoading(false);
    }
  };

  const submitCurrentSet = () => {
    if (currentBets.length !== 11) return;

    const newSet: RoundRobinSet = {
      id: Math.random().toString(),
      bets: currentBets,
      createdAt: new Date(),
      submitted: true,
    };

    setHistory([newSet, ...history]);
    setCurrentBets([]);
    setLockedBetIds(new Set());
  };

  const toggleLock = (betId: string) => {
    const newLocked = new Set(lockedBetIds);
    if (newLocked.has(betId)) {
      newLocked.delete(betId);
    } else {
      newLocked.add(betId);
    }
    setLockedBetIds(newLocked);
  };

  const getCategory = (odds: number) => {
    const absOdds = Math.abs(odds);
    if (odds > 0) return "plus100";
    if (absOdds <= 250) return "minus200";
    if (absOdds <= 350) return "minus300";
    return "minus500";
  };

  const structureCounts = {
    minus200: currentBets.filter((b) => getCategory(b.odds) === "minus200")
      .length,
    minus300: currentBets.filter((b) => getCategory(b.odds) === "minus300")
      .length,
    minus500: currentBets.filter((b) => getCategory(b.odds) === "minus500")
      .length,
    plus100: currentBets.filter((b) => getCategory(b.odds) === "plus100")
      .length,
  };

  if (showHistory) {
    return (
      <HistoryView history={history} onBack={() => setShowHistory(false)} />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-6 border-b border-border bg-card">
        <h1 className="text-3xl font-bold tracking-tight uppercase">
          Round Robin Randomizer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Auto-generate 11-bet structures
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 max-w-4xl w-full mx-auto px-4 py-6">
        {/* API Key Section */}
        {!apiKey ? (
          <section className="border border-border p-4 bg-card">
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
                onKeyDown={(e) =>
                  e.key === "Enter" && handleApiKeySubmit(keyInput)
                }
                placeholder="Enter your API key"
                className="flex-1 bg-input border border-border px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => handleApiKeySubmit(keyInput)}
                disabled={loading || !keyInput.trim()}
                className="bg-primary text-primary-foreground px-4 py-3 text-sm font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Connect"
                )}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </section>
        ) : (
          <>
            {/* Controls */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={randomize}
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground px-6 py-4 text-base font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                ) : null}
                Randomize
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                History ({history.length})
              </button>
              <button
                type="button"
                onClick={() => setApiKey("")}
                className="border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors"
              >
                New Key
              </button>
            </div>

            {/* Current Betslip */}
            {currentBets.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <BetslipSummary
                      bets={currentBets}
                      lockedBetIds={lockedBetIds}
                      onToggleLock={toggleLock}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <StructureProgress structureCounts={structureCounts} />
                    <button
                      type="button"
                      onClick={submitCurrentSet}
                      disabled={currentBets.length !== 11}
                      className="bg-green-600 text-white px-4 py-3 text-sm font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30 transition-opacity"
                    >
                      Mark as Submitted
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="border border-border p-8 bg-card text-center">
                <p className="text-muted-foreground">
                  Press "Randomize" to generate your first 11-bet set
                </p>
              </div>
            )}

            {error && (
              <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500 font-mono">
                {error}
              </div>
            )}
          </>
        )}
      </main>

      {/* Debug Panel */}
      {apiKey && (
        <div className="fixed bottom-0 right-0 w-full md:w-96 max-h-48 bg-background border-t border-l border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="w-full px-4 py-2 flex items-center justify-between bg-accent hover:bg-accent/80 text-xs font-semibold uppercase"
          >
            <span>Debug Console</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showDebug ? "rotate-180" : ""
              }`}
            />
          </button>

          {showDebug && (
            <div className="overflow-y-auto max-h-44 p-2 bg-black text-green-400 font-mono text-xs space-y-1">
              {debugLogs.length === 0 ? (
                <div className="text-muted-foreground">
                  No logs yet. Click Randomize to see API activity.
                </div>
              ) : (
                debugLogs.map((log, i) => (
                  <div
                    key={`${i}-${log.substring(0, 20)}`}
                    className="text-green-400 break-words"
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Round Robin Randomizer
        </p>
      </footer>
    </div>
  );
}
