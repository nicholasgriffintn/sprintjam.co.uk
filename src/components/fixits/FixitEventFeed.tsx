import type { FixitEvent } from "@/lib/fixits-service";
import { formatRelativeTime } from "@/utils/time";

const EVENT_LABELS: Record<string, string> = {
  pull_request: "Pull request",
  issues: "Issue",
  workflow_run: "Workflow",
  push: "Push",
};

function renderDetail(event: FixitEvent) {
  if (event.event_type === "pull_request" && event.action === "closed") {
    return event.severity
      ? `Merged PR (${event.severity})`
      : "Merged PR";
  }
  if (event.event_type === "issues" && event.action === "closed") {
    return "Closed issue";
  }
  if (event.event_type === "workflow_run") {
    return "Workflow run";
  }
  return EVENT_LABELS[event.event_type] ?? event.event_type;
}

export function FixitEventFeed({ events }: { events: FixitEvent[] }) {
  if (!events.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No recent fixit activity yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event, idx) => (
        <li
          key={`${event.user}-${event.timestamp}-${idx}`}
          className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/70 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-100">
            {(event.user[0] ?? "?").toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white">
              {event.user}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {renderDetail(event)}
            </p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span>{event.points} pts</span>
              <span>·</span>
              <span>{formatRelativeTime(event.timestamp)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
