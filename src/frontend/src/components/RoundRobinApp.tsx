import { History, Loader2, RefreshCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { estimatedRefreshCost, randomizeRoundRobin, refreshOdds, refreshSelectedBets } from "../services/randomizer";
import type { AppSettings, Bet, OddsCache, RoundRobinSet } from "../types";
import { BetInsights } from "./BetInsights";
import { BetslipSummary } from "./BetslipSummary";
import { HistoryView } from "./HistoryView";
import { RoundRobinCalculator } from "./RoundRobinCalculator";
import { SettingsView } from "./SettingsView";
import { StructureProgress } from "./StructureProgress";

const SETTINGS_KEY = "roundrobin-settings-v3";
const CACHE_KEY = "roundrobin-odds-cache-v3";
const HISTORY_KEY = "roundrobin-history-v3";
const BETS_KEY = "roundrobin-current-bets-v3";
const PLACED_KEY = "roundrobin-placed-bets-v3";
const defaults: AppSettings = { rememberKey: true, apiKey: "", bookmaker: "fanduel", markets: ["h2h", "spreads", "totals"], customMarkets: "", timeWindowHours: 12, minimumLeadMinutes: 10, cacheMinutes: 10, timingMode: "upcoming", strategyMode: "soonest", todayFirst: true, requireDeepLink: true, propsMode: false, propEventLimit: 3, maxPerEvent: 2, maxPerSport: 6, avoidOpposingSelections: true, minimumUniqueEvents: 7, bankroll: 100, roundRobinSize: 2 };
function load<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; } }

export default function RoundRobinApp() {
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...defaults, ...load(SETTINGS_KEY, {}) }));
  const [cache, setCache] = useState<OddsCache | null>(() => load(CACHE_KEY, null));
  const [currentBets, setCurrentBets] = useState<Bet[]>(() => load(BETS_KEY, []));
  const [history, setHistory] = useState<RoundRobinSet[]>(() => load(HISTORY_KEY, []));
  const [placedBetIds, setPlacedBetIds] = useState<Set<string>>(() => new Set(load<string[]>(PLACED_KEY, [])));
  const [lockedBetIds, setLockedBetIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"main" | "settings" | "history">("main");
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, apiKey: settings.rememberKey ? settings.apiKey : "" })); }, [settings]);
  useEffect(() => { if (cache) localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }, [cache]);
  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(BETS_KEY, JSON.stringify(currentBets)); }, [currentBets]);
  useEffect(() => { localStorage.setItem(PLACED_KEY, JSON.stringify([...placedBetIds])); }, [placedBetIds]);

  const runRequest = async (selectedOnly: boolean) => {
    if (!settings.apiKey) { setView("settings"); setError("Add The Odds API key in Settings first."); return; }
    const eventCount = new Set(currentBets.map((bet) => bet.eventId)).size;
    const cost = selectedOnly ? estimatedRefreshCost(settings) * eventCount : estimatedRefreshCost(settings);
    if (!window.confirm(`Estimated Odds API cost: ${cost} credits. Continue?`)) return;
    try {
      setLoading(true); setError(null);
      const refreshed = selectedOnly ? await refreshSelectedBets(settings.apiKey, settings, currentBets) : await refreshOdds(settings.apiKey, settings);
      if (selectedOnly) {
        const updated = currentBets.map((oldBet) => refreshed.bets.find((bet) => bet.eventId === oldBet.eventId && bet.market === oldBet.market && bet.selection === oldBet.selection && bet.description === oldBet.description && bet.point === oldBet.point) || oldBet);
        const changed = updated.filter((bet, index) => bet.odds !== currentBets[index].odds).length;
        setCurrentBets(updated); setError(`Selected-event recheck complete. ${changed} displayed odds changed.`);
      } else setCache(refreshed);
    } catch (err) { setError(err instanceof Error ? err.message : "Refresh failed"); } finally { setLoading(false); }
  };
  const randomize = () => { if (!cache) { setError("Refresh FanDuel odds before randomizing."); return; } try { setError(null); setCurrentBets(randomizeRoundRobin(cache.bets, lockedBetIds, currentBets, settings)); setPlacedBetIds(new Set()); } catch (err) { setError(err instanceof Error ? err.message : "Randomization failed"); } };
  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => setter((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const submit = () => { if (currentBets.length !== 11) return; setHistory([{ id: crypto.randomUUID(), bets: currentBets, createdAt: new Date().toISOString(), submitted: true }, ...history]); };
  const clearData = () => { for (const key of [SETTINGS_KEY, CACHE_KEY, HISTORY_KEY, BETS_KEY, PLACED_KEY]) localStorage.removeItem(key); setSettings(defaults); setCache(null); setCurrentBets([]); setHistory([]); setPlacedBetIds(new Set()); setLockedBetIds(new Set()); setView("main"); };
  const category = (odds: number) => odds > 0 ? "plus100" : Math.abs(odds) <= 250 ? "minus200" : Math.abs(odds) <= 350 ? "minus300" : "minus500";
  const structureCounts = { minus200: currentBets.filter((bet) => category(bet.odds) === "minus200").length, minus300: currentBets.filter((bet) => category(bet.odds) === "minus300").length, minus500: currentBets.filter((bet) => category(bet.odds) === "minus500").length, plus100: currentBets.filter((bet) => category(bet.odds) === "plus100").length };
  if (view === "settings") return <SettingsView settings={settings} onChange={setSettings} onBack={() => setView("main")} onClearData={clearData} />;
  if (view === "history") return <HistoryView history={history} onBack={() => setView("main")} />;

  return <div className="min-h-screen bg-background text-foreground font-mono"><header className="px-4 py-6 border-b border-border bg-card"><div className="max-w-6xl mx-auto flex justify-between gap-3"><div><h1 className="text-3xl font-bold uppercase">Round Robin Workbench</h1><p className="text-sm text-muted-foreground">{settings.timingMode} · {settings.strategyMode} · max {settings.maxPerEvent}/event</p></div><div className="flex gap-2"><button type="button" onClick={() => setView("history")} className="border border-border p-3" aria-label="History"><History className="w-5 h-5" /></button><button type="button" onClick={() => setView("settings")} className="border border-border p-3" aria-label="Settings"><Settings className="w-5 h-5" /></button></div></div></header><main className="max-w-6xl mx-auto p-4 space-y-4"><section className="border border-border bg-card p-4"><div className="flex flex-wrap gap-2 items-center"><button type="button" onClick={() => runRequest(false)} disabled={loading} className="bg-primary text-primary-foreground px-4 py-3 font-bold uppercase disabled:opacity-30">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 inline mr-2" />Refresh Odds</>}</button><button type="button" onClick={randomize} disabled={!cache || loading} className="border border-border px-4 py-3 font-bold uppercase disabled:opacity-30">Generate</button><button type="button" onClick={() => runRequest(true)} disabled={currentBets.length !== 11 || loading} className="border border-border px-4 py-3 font-bold uppercase disabled:opacity-30">Recheck Selected 11</button><span className="text-xs text-muted-foreground">Full refresh estimate: {estimatedRefreshCost(settings)} credits · selected recheck estimate: {estimatedRefreshCost(settings) * new Set(currentBets.map((bet) => bet.eventId)).size}</span></div>{cache?.usage && <p className="text-xs text-muted-foreground mt-3">API used: {cache.usage.used ?? "?"} · remaining: {cache.usage.remaining ?? "?"} · last cost: {cache.usage.last ?? "?"}</p>}</section>{error && <div className="border border-yellow-500 bg-yellow-500/10 p-3 text-sm">{error}</div>}{currentBets.length ? <><div className="grid lg:grid-cols-3 gap-4"><div className="lg:col-span-2"><BetslipSummary bets={currentBets} lockedBetIds={lockedBetIds} placedBetIds={placedBetIds} onToggleLock={(id) => toggleSet(setLockedBetIds, id)} onTogglePlaced={(id) => toggleSet(setPlacedBetIds, id)} /></div><div className="space-y-4"><StructureProgress structureCounts={structureCounts} /><BetInsights bets={currentBets} /><button type="button" onClick={submit} className="w-full bg-green-600 text-white p-3 font-bold uppercase">Save as Submitted</button></div></div><RoundRobinCalculator bets={currentBets} bankroll={settings.bankroll} size={settings.roundRobinSize} onBankrollChange={(bankroll) => setSettings({ ...settings, bankroll })} onSizeChange={(roundRobinSize) => setSettings({ ...settings, roundRobinSize })} /></> : <div className="border border-border bg-card p-10 text-center text-muted-foreground">Refresh odds, then generate a diversified set.</div>}</main></div>;
}
