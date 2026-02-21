import type { TicketMetadata } from "@/types";
import type { QueueProvider } from "./queue-provider";

interface QueueLinkPreviewProps {
  ticket: TicketMetadata | null;
  provider: QueueProvider;
}

export function QueueLinkPreview({ ticket, provider }: QueueLinkPreviewProps) {
  if (!ticket) {
    return null;
  }

  const isJira = provider === "jira";
  const isLinear = provider === "linear";
  const shellClass = isJira
    ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
    : isLinear
      ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
      : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20";
  const chipClass = isJira
    ? "bg-blue-600"
    : isLinear
      ? "bg-purple-600"
      : "bg-slate-600";
  const statusClass = isJira
    ? "text-blue-700 dark:text-blue-200"
    : isLinear
      ? "text-purple-700 dark:text-purple-200"
      : "text-slate-700 dark:text-slate-200";

  return (
    <div className={`mt-3 rounded-lg border p-3 text-xs ${shellClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded ${chipClass} px-2 py-0.5 font-semibold text-white`}
          >
            {ticket.key || (ticket as { identifier?: string }).identifier}
          </span>
          <span className="font-semibold text-slate-800 dark:text-white">
            {ticket.summary || (ticket as { title?: string }).title}
          </span>
        </div>
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}
        >
          {ticket.status || "Unknown"}
        </span>
      </div>
      {ticket.description && (
        <p className="mt-2 line-clamp-2 break-all text-slate-600 dark:text-slate-300">
          {ticket.description}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
        {ticket.assignee && <span>Assignee: {ticket.assignee}</span>}
        {isJira ? (
          <span>
            Story Points:{" "}
            {ticket.storyPoints !== null && ticket.storyPoints !== undefined
              ? ticket.storyPoints
              : "Not set"}
          </span>
        ) : (
          <span>
            Estimate:{" "}
            {(ticket as { estimate?: number }).estimate !== undefined &&
            (ticket as { estimate?: number }).estimate !== null
              ? (ticket as { estimate?: number }).estimate
              : "Not set"}
          </span>
        )}
      </div>
    </div>
  );
}
