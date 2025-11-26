import type { FixitRun } from "@/lib/fixits-service";

interface FixitRunSummaryProps {
  run: FixitRun | null;
}

export function FixitRunSummary({ run }: FixitRunSummaryProps) {
  if (!run) {
    return (
      <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-slate-500 dark:text-slate-400">
          Select a Fixit run to see its description and schedule.
        </p>
      </div>
    );
  }

  const formatDate = (value?: number | null) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return null;
    }
  };

  const meta = [
    { label: "Status", value: run.isActive ? "Active" : "Inactive" },
    { label: "Start date", value: formatDate(run.startDate) ?? "—" },
    { label: "End date", value: formatDate(run.endDate) ?? "—" },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Fixit run
        </p>
        <p className="text-base font-semibold text-slate-900 dark:text-white">
          {run.name} ({run.fixitId})
        </p>
      </div>
      {run.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {run.description}
        </p>
      )}
      <dl className="grid gap-3 rounded-2xl border border-white/40 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5 sm:grid-cols-3">
        {meta.map((item) => (
          <div key={item.label}>
            <dt className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {item.label}
            </dt>
            <dd className="text-sm font-medium text-slate-900 dark:text-white">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
