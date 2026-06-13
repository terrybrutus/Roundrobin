import { CheckCircle, ChevronLeft, Circle } from "lucide-react";
import type { RoundRobinSet } from "../types";

interface HistoryViewProps {
  history: RoundRobinSet[];
  onBack: () => void;
}

export function HistoryView({ history, onBack }: HistoryViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <header className="px-4 pt-8 pb-6 border-b border-border bg-card">
        <div className="flex items-center gap-4 mb-2">
          <button type="button" onClick={onBack} aria-label="Back">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold uppercase">History</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-10">
          {history.length} saved round robins
        </p>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {history.length === 0 ? (
          <div className="border border-border p-8 bg-card text-center text-muted-foreground">
            No history yet
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((set) => (
              <div key={set.id} className="border border-border bg-card p-4">
                <div className="flex justify-between mb-4">
                  <div className="flex gap-3">
                    {set.submitted ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {new Date(set.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {set.submitted ? "Submitted" : "Saved"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs">{set.bets.length} bets</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {set.bets.map((bet) => (
                    <div
                      key={bet.id}
                      className="border border-border/50 p-2 text-xs"
                    >
                      <div className="flex justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {bet.selection}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {bet.game}
                          </p>
                          {bet.commenceTime && (
                            <p className="text-muted-foreground">
                              {new Date(bet.commenceTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span>
                          {bet.odds > 0 ? "+" : ""}
                          {bet.odds}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
