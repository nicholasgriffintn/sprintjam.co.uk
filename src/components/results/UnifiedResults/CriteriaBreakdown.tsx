import type { CriteriaStats, CriteriaBreakdownSettings } from "@/types";

export function CriteriaBreakdownStat({
  stat,
  criteriaSettings,
}: {
  stat: CriteriaStats;
  criteriaSettings: CriteriaBreakdownSettings | undefined;
}) {
  const consensusLabels = {
    high: criteriaSettings?.consensusLabels?.high ?? "Consensus",
    medium: criteriaSettings?.consensusLabels?.medium ?? "Some Split",
    low: criteriaSettings?.consensusLabels?.low ?? "Wide Split",
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4
          className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-white"
          title={stat.name}
        >
          {stat.name}
        </h4>
        <span
          className={`flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${stat.consensus === "high"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
              : stat.consensus === "medium"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
            }`}
        >
          {stat.consensus === "high"
            ? consensusLabels.high
            : stat.consensus === "medium"
              ? consensusLabels.medium
              : consensusLabels.low}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
          <span>Average</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {stat.average.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
          <span>Range</span>
          <span className="text-slate-900 dark:text-white">
            {stat.min} - {stat.max}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
          <span>Variance</span>
          <span className="text-slate-900 dark:text-white">
            {stat.variance.toFixed(1)}
          </span>
        </div>
      </div>

      {stat.maxScore ? (
        <div>
          <div className="mb-1 flex justify-between px-0.5 text-xs text-slate-400">
            <span>0</span>
            <span>{stat.maxScore}</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div
              className="absolute h-2 rounded-full bg-gradient-to-r from-brand-300 to-indigo-400"
              style={{
                left: `${(stat.min / stat.maxScore) * 100}%`,
                width: `${((stat.max - stat.min) / stat.maxScore) * 100}%`,
              }}
            />
            <div
              className="absolute -mt-1 h-4 w-1 rounded-full bg-brand-700 dark:bg-brand-300"
              style={{
                left: `${(stat.average / stat.maxScore) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
