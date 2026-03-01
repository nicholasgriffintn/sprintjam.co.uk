import { FC, useMemo, useId, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import type { RoomData, TicketQueueItem } from "@/types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from '@/components/ui';
import { cn } from "@/lib/cn";
import { BetaBadge } from "@/components/BetaBadge";
import { calculateStoryPointsFromVotes } from "@/utils/votes";

interface TicketQueueSidebarProps {
  roomData: RoomData | null;
  canManageQueue: boolean;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onSelectTicket?: (ticketId: number) => void;
  onViewQueue: () => void;
  onOpenQueueSettings?: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TicketQueueSidebar: FC<TicketQueueSidebarProps> = ({
  roomData,
  canManageQueue,
  onUpdateTicket,
  onSelectTicket,
  onViewQueue,
  onOpenQueueSettings,
  className,
  isCollapsed,
  onToggleCollapse,
}) => {
  const ticketQueueId = useId();
  const progressLabelId = `${ticketQueueId}-progress`;
  const progressDescriptionId = `${ticketQueueId}-progress-description`;
  const [localCollapsed, setLocalCollapsed] = useState(false);

  const queue = roomData?.ticketQueue || [];
  const pending = useMemo(
    () => queue.filter((t) => t.status === "pending"),
    [queue],
  );
  const hasMultiplePending = pending.length > 1;
  const completedCount = useMemo(
    () => queue.filter((t) => t.status === "completed").length,
    [queue],
  );
  const totalCount = queue.length;
  const totalTickets = totalCount || pending.length || 0;
  const remainingTickets = Math.max(totalTickets - completedCount, 0);
  const progressPercent =
    totalTickets > 0 ? Math.round((completedCount / totalTickets) * 100) : 0;
  const labelText =
    totalTickets === 0
      ? "No tickets yet"
      : `${completedCount}/${totalTickets} completed`;

  const capacityPoints = roomData?.settings.capacityPoints ?? null;
  const completedTickets = useMemo(
    () => queue.filter((t) => t.status === "completed"),
    [queue],
  );
  const capacityUsed = useMemo(() => {
    return completedTickets.reduce((total, ticket) => {
      const points = calculateStoryPointsFromVotes(ticket.votes);
      if (points === null) return total;
      return total + points;
    }, 0);
  }, [completedTickets]);
  const capacityPercent =
    capacityPoints && capacityPoints > 0
      ? Math.round((capacityUsed / capacityPoints) * 100)
      : null;
  const capacityStatus =
    capacityPercent !== null && capacityPercent >= 100
      ? "over"
      : capacityPercent !== null && capacityPercent >= 80
        ? "near"
        : "ok";
  const capacityBadgeClasses =
    capacityStatus === "over"
      ? "bg-red-600 text-white"
      : capacityStatus === "near"
        ? "bg-amber-500 text-white"
        : "bg-emerald-500 text-white";

  const current = roomData?.currentTicket;
  const next = pending[0];
  const externalService = roomData?.settings.externalService ?? "none";
  const showProviderHint = canManageQueue && externalService === "none";
  const canConfigureProvider = Boolean(onOpenQueueSettings);

  const collapsed = isCollapsed ?? localCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
      return;
    }
    setLocalCollapsed((prev) => !prev);
  };

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
    const isPendingRow = label === "Pending";
    const showReorder = canManageQueue && isPendingRow && hasMultiplePending;
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
      <div
        className={[
          'w-full max-w-full min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60',
          isPendingRow ? 'max-h-28 overflow-hidden' : '',
        ].join(' ')}
      >
        <div className="flex min-w-0 max-w-full items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {label}
              </span>
              <span
                className="block min-w-0 truncate font-mono text-sm font-semibold"
                data-testid={`queue-ticket-id-${label.toLowerCase()}`}
                title={ticket.ticketId}
              >
                {ticket.ticketId}
              </span>
            </div>
            {!isPendingRow && ticket.title && (
              <div
                className="mt-1 line-clamp-2 break-words text-slate-800 dark:text-slate-100"
                title={ticket.title}
              >
                {ticket.title}
              </div>
            )}
            {!isPendingRow && ticket.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 break-words">
                {ticket.description}
              </p>
            )}
            {!isPendingRow && meta && ticket.externalService !== 'none' && (
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                <span className="max-w-full break-words">
                  {ticket.externalService}
                </span>
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
          {showReorder && (
            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={() => moveTicket(ticket.id, 'up')}
                variant="unstyled"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => moveTicket(ticket.id, 'down')}
                variant="unstyled"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside className={cn('flex h-full flex-col', className)}>
      <SurfaceCard
        padding="none"
        className="flex h-full flex-col overflow-hidden border border-slate-200/80 shadow-lg dark:border-slate-800"
      >
        <div
          className={cn(
            'flex items-center justify-between gap-2 border-b border-white/40 px-4 py-3 dark:border-white/10',
            collapsed && 'border-b-0 py-2',
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="inline-flex items-center gap-2">
              Queue
              <BetaBadge />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewQueue}
              data-testid="queue-expand"
              className="px-3 py-1 text-xs font-semibold"
            >
              Expand
            </Button>
            <Button
              type="button"
              variant="unstyled"
              onClick={handleToggle}
              aria-label={
                collapsed ? 'Expand ticket queue' : 'Collapse ticket queue'
              }
              aria-expanded={!collapsed}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/70 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <ScrollArea
          aria-label="Ticket queue summary"
          className={cn('flex-1 px-4 py-4', collapsed && 'hidden')}
          contentClassName="w-full max-w-full space-y-3"
        >
          <div className="w-full max-w-full space-y-3">
            <div className="flex flex-col gap-0.5 text-sm text-slate-700 dark:text-slate-200">
              <span
                id={progressLabelId}
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                Session progress
              </span>
              <span id={progressDescriptionId} className="font-semibold">
                {labelText}
              </span>
            </div>
            <Progress
              value={progressPercent}
              aria-labelledby={progressLabelId}
              aria-describedby={progressDescriptionId}
              aria-valuetext={`${remainingTickets} tickets remain out of ${totalTickets}`}
              data-testid="session-progress-bar"
            />

            {capacityPoints !== null && capacityPoints > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Sprint capacity
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${capacityBadgeClasses}`}
                  >
                    {capacityPercent ?? 0}%
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                  <span>
                    {capacityUsed}/{capacityPoints} points
                  </span>
                  {capacityStatus === 'over' && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Over capacity
                    </span>
                  )}
                  {capacityStatus === 'near' && (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Near capacity
                    </span>
                  )}
                </div>
                {capacityStatus === 'over' && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Sprint at {capacityPercent}% capacity. Consider moving the
                    lowest priority item.
                  </p>
                )}
              </div>
            )}

            {current ? (
              <>
                <div data-testid="queue-current-ticket">
                  {renderTicketRow(current, 'Current')}
                </div>

                {next && (
                  <div data-testid="queue-next-ticket">
                    {renderTicketRow(next, 'Pending')}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2" data-testid="queue-no-current">
                {pending.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      No tickets in queue
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-white">
                      Click Expand to add tickets
                    </p>
                  </div>
                ) : canManageQueue && onSelectTicket ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Select a ticket to start
                    </p>
                    {pending.slice(0, 3).map((ticket) => (
                      <Button
                        key={ticket.id}
                        variant="unstyled"
                        onClick={() => onSelectTicket(ticket.id)}
                        className="min-h-[88px] w-full max-w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-300 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
                        data-testid={`queue-select-ticket-${ticket.id}`}
                      >
                        <div className="flex min-w-0 max-w-full items-center justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <span
                              className="block truncate font-mono text-sm font-semibold text-slate-900 dark:text-white"
                              title={ticket.ticketId}
                            >
                              {ticket.ticketId}
                            </span>
                            <div className="min-h-5">
                              {ticket.title && (
                                <p className="line-clamp-2 break-words text-xs leading-5 text-slate-700 dark:text-slate-200">
                                  {ticket.title}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </Button>
                    ))}
                    {pending.length > 3 && (
                      <Button
                        onClick={onViewQueue}
                        variant="unstyled"
                        className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-300"
                      >
                        +{pending.length - 3} more tickets
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Waiting for moderator to select a ticket
                    </p>
                  </div>
                )}
              </div>
            )}

            {showProviderHint && (
              <div className="mt-auto grid max-w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 sm:grid-cols-[1fr_auto]">
                <span>
                  Connect Jira, Linear, or GitHub in Settings to import tickets.
                </span>
                {canConfigureProvider && (
                  <div className="justify-self-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onOpenQueueSettings}
                      className="h-7 px-2.5 py-0 text-xs font-semibold"
                    >
                      Configure
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SurfaceCard>
    </aside>
  );
};
