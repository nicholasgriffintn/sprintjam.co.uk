import type { SpinResult } from "@sprintjam/types";

import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface WheelResultsPanelProps {
  results: SpinResult[];
}

export function WheelResultsPanel({ results }: WheelResultsPanelProps) {
  if (results.length === 0) {
    return null;
  }

  const reversedResults = [...results].reverse();

  return (
    <SurfaceCard className="mt-4">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
        Results
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {reversedResults.map((result, index) => (
          <div
            key={result.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              index === 0
                ? "bg-brand-100 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800"
                : "bg-slate-50 dark:bg-slate-800/50"
            }`}
          >
            <span className="text-sm font-medium text-slate-500 w-6">
              #{results.length - index}
            </span>
            <span
              className={`flex-1 font-medium ${
                index === 0
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {result.winner}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
