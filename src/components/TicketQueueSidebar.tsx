import { FC, useMemo, useId } from "react";
import { ChevronsUpDown, ExternalLink } from "lucide-react";

import type { RoomData, TicketQueueItem } from "../types";
import { SurfaceCard } from "./ui/SurfaceCard";
import { HorizontalProgress } from "./ui/HorizontalProgress";

interface TicketQueueSidebarProps {
  roomData: RoomData;
  canManageQueue: boolean;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onViewQueue: () => void;
  className?: string;
}

export const TicketQueueSidebar: FC<TicketQueueSidebarProps> = ({
  roomData,
  canManageQueue,
  onUpdateTicket,
  onViewQueue,
  className,
}) => {
  const ticketQueueId = useId();
  const progressLabelId = `${ticketQueueId}-progress`;

  const queue = roomData.ticketQueue || [];
  const pending = useMemo(
    () => queue.filter((t) => t.status === "pending"),
    [queue],
  );
  const completedCount = useMemo(
    () => queue.filter((t) => t.status === "completed").length,
    [queue],
  );
  const totalCount = queue.length;
  const labelText =
    totalCount === 0
      ? "No tickets yet"
      : `${completedCount}/${totalCount} completed`;

  const current = roomData.currentTicket;
  const next = pending[0];

  const moveTicket = (ticketId: number, direction: "up" | "down") => {
    const tickets = [...pending];
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= tickets.length) return;
    const target = tickets[index];
    const swap = tickets[swapIndex];
    onUpdateTicket(target.id, { ordinal: swap.ordinal });
    onUpdateTicket(swap.id, { ordinal: target.ordinal });
  };

  const renderTicketRow = (ticket: TicketQueueItem, label: string) => {
    const meta =
      ticket.externalService === "jira"
        ? (ticket.externalServiceMetadata as
            | Record<string, unknown>
            | undefined)
        : undefined;
    const link =
      meta && typeof meta === "object" && "url" in meta
        ? String(meta.url)
        : undefined;

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {label}
              </span>
              <span
                className="font-mono text-sm font-semibold"
                data-testid={`queue-ticket-id-${label.toLowerCase()}`}
              >
                {ticket.ticketId}
              </span>
            </div>
            {ticket.title && (
              <div className="text-slate-800 dark:text-slate-100">
                {ticket.title}
              </div>
            )}
            {ticket.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {ticket.description}
              </p>
            )}
            {meta && (
              <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                Jira
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 underline decoration-dotted underline-offset-2 dark:text-blue-300"
                  >
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          {canManageQueue && label === "Pending" && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => moveTicket(ticket.id, "up")}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Move up"
              >
                <ChevronsUpDown className="h-4 w-4 rotate-180" />
              </button>
              <button
                onClick={() => moveTicket(ticket.id, "down")}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Move down"
              >
                <ChevronsUpDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside className={className ?? "flex w-full flex-col gap-3"}>
      <SurfaceCard
        padding="sm"
        className="shadow-lg border border-slate-200/80 dark:border-slate-800"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <span>Queue</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
                Beta
              </span>
            </div>
            <button
              onClick={onViewQueue}
              data-testid="queue-expand"
              className="cursor-pointer text-xs font-semibold text-blue-600 underline decoration-dotted underline-offset-2 hover:text-blue-500 dark:text-blue-300"
            >
              Expand
            </button>
          </div>

          <div
            id={progressLabelId}
            className="flex flex-col gap-0.5 text-sm text-slate-700 dark:text-slate-200"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Session progress
            </span>
            <span className="font-semibold">{labelText}</span>
          </div>
          <HorizontalProgress
            total={totalCount || pending.length}
            completed={completedCount}
            role="progressbar"
            aria-valuenow={totalCount || pending.length}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label="Session progress"
            aria-describedby={progressLabelId}
            aria-valuetext={`${pending.length} tickets remain out of ${completedCount}`}
            data-testid="session-progress-bar"
          />

          {current ? (
            <div data-testid="queue-current-ticket">
              {renderTicketRow(current, "Current")}
            </div>
          ) : (
            <p
              className="text-xs text-slate-500 dark:text-slate-400"
              data-testid="queue-no-current"
            >
              No active ticket
            </p>
          )}

          {next ? (
            <div data-testid="queue-next-ticket">
              {renderTicketRow(next, "Pending")}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No upcoming tickets. Add more to keep things moving.
            </p>
          )}

          {pending.length > 1 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Queue
              </div>
              <div
                className="max-h-40 space-y-1 overflow-y-auto pr-1"
                data-testid="queue-pending-list"
              >
                {pending.slice(1).map((ticket) => (
                  <div
                    key={ticket.id}
                    data-testid={`queue-pending-ticket-${ticket.id}`}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold">
                        {ticket.ticketId}
                      </span>
                      {canManageQueue && (
                        <button
                          onClick={() => moveTicket(ticket.id, "up")}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          aria-label="Move up"
                        >
                          <ChevronsUpDown className="h-3 w-3 rotate-180" />
                        </button>
                      )}
                    </div>
                    {ticket.title && (
                      <div className="line-clamp-1 text-slate-700 dark:text-slate-200">
                        {ticket.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SurfaceCard>
    </aside>
  );
};
