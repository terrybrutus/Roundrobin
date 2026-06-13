import { CheckCircle, ChevronLeft, Circle } from "lucide-react";
import type { Bet } from "../types";

interface RoundRobinSet {
  id: string;
  bets: Bet[];
  createdAt: Date;
  submitted: boolean;
}

interface HistoryViewProps {
  history: RoundRobinSet[];
  onBack: () => void;
}

export function HistoryView({ history, onBack }: HistoryViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-6 border-b border-border bg-card">
        <div className="flex items-center gap-4 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold tracking-tight uppercase">
            History
          </h1>
        </div>
        <p className="text-muted-foreground text-sm ml-10">
          {history.length} round robins generated
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-4 max-w-4xl w-full mx-auto px-4 py-6">
        {history.length === 0 ? (
          <div className="border border-border p-8 bg-card text-center">
            <p className="text-muted-foreground">No history yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((set) => (
              <div key={set.id} className="border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {set.submitted ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {set.createdAt.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {set.submitted ? "✓ Submitted" : "Pending"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-muted-foreground">
                    11 bets
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {set.bets.map((bet) => (
                    <div
                      key={`${bet.game}-${bet.selection}-${bet.odds}`}
                      className="border border-border/50 p-2 bg-background/50 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold truncate">
                            {bet.selection}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {bet.game}
                          </p>
                        </div>
                        <div className="text-right ml-2 font-mono">
                          {bet.odds > 0 ? "+" : ""}
                          {bet.odds}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Round Robin Randomizer
        </p>
      </footer>
    </div>
  );
}
