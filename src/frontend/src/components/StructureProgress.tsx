interface StructureProgressProps {
  structureCounts: {
    minus200: number;
    minus300: number;
    minus500: number;
    plus100: number;
  };
}

const STRUCTURE = [
  { key: "minus200", label: "~-200", max: 3, color: "bg-blue-500" },
  { key: "minus300", label: "~-300", max: 2, color: "bg-purple-500" },
  { key: "minus500", label: "~-500", max: 1, color: "bg-red-500" },
  { key: "plus100", label: "~+100", max: 5, color: "bg-green-500" },
];

export function StructureProgress({ structureCounts }: StructureProgressProps) {
  const total = Object.values(structureCounts).reduce((a, b) => a + b, 0);
  const isComplete = total === 11 &&
    structureCounts.minus200 === 3 &&
    structureCounts.minus300 === 2 &&
    structureCounts.minus500 === 1 &&
    structureCounts.plus100 === 5;

  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide">Structure</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {total}/11
        </span>
      </div>

      <div className="space-y-3">
        {STRUCTURE.map(({ key, label, max, color }) => {
          const count = structureCounts[key as keyof typeof structureCounts];
          const isFull = count === max;

          return (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold">{label}</span>
                <span className={`text-xs font-mono ${isFull ? "text-green-500" : ""}`}>
                  {count}/{max}
                </span>
              </div>
              <div className="h-2 bg-background border border-border overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-300`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className="mt-4 p-2 bg-green-500/10 border border-green-500/30 rounded">
          <p className="text-xs text-green-500 font-semibold">✓ Perfect structure!</p>
        </div>
      )}
    </div>
  );
}
