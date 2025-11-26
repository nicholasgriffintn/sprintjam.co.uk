import { useEffect } from "react";

import type { FixitRun } from "@/lib/fixits-service";

interface FixitRunSelectorProps {
  runs: FixitRun[];
  selectedRunId: string | null;
  onSelect: (runId: string | null) => void;
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  disabled?: boolean;
}

export function FixitRunSelector({
  runs,
  selectedRunId,
  onSelect,
  status,
  error,
  disabled,
}: FixitRunSelectorProps) {
  useEffect(() => {
    if (!runs.length && selectedRunId) {
      onSelect(null);
    }
  }, [runs, selectedRunId, onSelect]);

  const renderContent = () => {
    if (status === "loading" && !runs.length) {
      return <p className="text-xs text-slate-500">Loading Fixits…</p>;
    }

    if (status === "error") {
      return (
        <p className="text-xs text-rose-500">
          {error || "Unable to load Fixit runs"}
        </p>
      );
    }

    if (!runs.length) {
      return (
        <p className="text-xs text-slate-500">
          No Fixit runs have been configured yet.
        </p>
      );
    }

    return (
      <select
        className="w-full rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-brand-200 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white"
        value={selectedRunId ?? ""}
        onChange={(event) => {
          if (disabled) return;
          const value = event.target.value;
          onSelect(value || null);
        }}
        disabled={disabled}
      >
        <option value="">Select Fixit run</option>
        {runs.map((run) => (
          <option key={run.fixitId} value={run.fixitId}>
            {run.name} ({run.fixitId})
          </option>
        ))}
      </select>
    );
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Fixit Run
        </span>
        {status === "loading" && runs.length > 0 && (
          <span className="text-[10px] uppercase text-slate-400">
            Refreshing…
          </span>
        )}
      </div>
      {renderContent()}
      {disabled && runs.length > 0 && (
        <p className="mt-1 text-[11px] text-slate-400">
          Only moderators can change the active Fixit run.
        </p>
      )}
    </div>
  );
}
