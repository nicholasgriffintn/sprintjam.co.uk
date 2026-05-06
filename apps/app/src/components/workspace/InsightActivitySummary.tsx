import type { TeamSessionCounts } from "@sprintjam/types";

interface CeremonyCountStripProps {
  counts: TeamSessionCounts;
  label?: string;
}

export function CeremonyCountStrip({
  counts,
  label = "Analysed sessions",
}: CeremonyCountStripProps) {
  const items = [
    { label: "Planning", value: counts.planning },
    { label: "Standups", value: counts.standup },
    { label: "Wheels", value: counts.wheel },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-3 dark:divide-slate-800 dark:border-slate-800">
        {items.map((item) => (
          <div key={item.label} className="px-3 first:pl-0 last:pr-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
