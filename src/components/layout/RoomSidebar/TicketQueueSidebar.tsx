import { FC, useMemo, useId, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

import type { RoomData, TicketQueueItem } from '@/types';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { HorizontalProgress } from '@/components/ui/HorizontalProgress';
import { cn } from '@/lib/cn';
import { BetaBadge } from '@/components/BetaBadge';

interface TicketQueueSidebarProps {
  roomData: RoomData | null;
  canManageQueue: boolean;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onViewQueue: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TicketQueueSidebar: FC<TicketQueueSidebarProps> = ({
  roomData,
  canManageQueue,
  onUpdateTicket,
  onViewQueue,
  className,
  isCollapsed,
  onToggleCollapse,
}) => {
  const ticketQueueId = useId();
  const progressLabelId = `${ticketQueueId}-progress`;
  const [localCollapsed, setLocalCollapsed] = useState(false);

  const queue = roomData?.ticketQueue || [];
  const pending = useMemo(
    () => queue.filter((t) => t.status === 'pending'),
    [queue]
  );
  const hasMultiplePending = pending.length > 1;
  const completedCount = useMemo(
    () => queue.filter((t) => t.status === 'completed').length,
    [queue]
  );
  const totalCount = queue.length;
  const labelText =
    totalCount === 0
      ? 'No tickets yet'
      : `${completedCount}/${totalCount} completed`;

  const current = roomData?.currentTicket;
  const next = pending[0];

  const collapsed = isCollapsed ?? localCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
      return;
    }
    setLocalCollapsed((prev) => !prev);
  };

  const moveTicket = (ticketId: number, direction: 'up' | 'down') => {
    const tickets = [...pending];
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= tickets.length) return;
    const target = tickets[index];
    const swap = tickets[swapIndex];
    onUpdateTicket(target.id, { ordinal: swap.ordinal });
    onUpdateTicket(swap.id, { ordinal: target.ordinal });
  };

  const renderTicketRow = (ticket: TicketQueueItem, label: string) => {
    const isPendingRow = label === 'Pending';
    const showReorder = canManageQueue && isPendingRow && hasMultiplePending;
    const meta =
      ticket.externalService === 'jira'
        ? (ticket.externalServiceMetadata as
          | Record<string, unknown>
          | undefined)
        : undefined;
    const link =
      meta && typeof meta === 'object' && 'url' in meta
        ? String(meta.url)
        : undefined;

    return (
      <div
        className={[
          'rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60',
          isPendingRow ? 'max-h-28 overflow-hidden' : '',
        ].join(' ')}
      >
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
            {!isPendingRow && ticket.title && (
              <div className="text-slate-800 dark:text-slate-100">
                {ticket.title}
              </div>
            )}
            {!isPendingRow && ticket.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {ticket.description}
              </p>
            )}
            {!isPendingRow && meta && ticket.externalService !== 'none' && (
              <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                {ticket.externalService}
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
              <button
                onClick={() => moveTicket(ticket.id, 'up')}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveTicket(ticket.id, 'down')}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
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
            <button
              onClick={onViewQueue}
              data-testid="queue-expand"
              className="cursor-pointer rounded-md px-3 py-1 text-xs font-semibold text-blue-600 underline decoration-dotted underline-offset-2 transition hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:text-blue-300"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={handleToggle}
              aria-label={
                collapsed ? 'Expand ticket queue' : 'Collapse ticket queue'
              }
              aria-expanded={!collapsed}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/70 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div
          tabIndex={0}
          className={cn(
            'flex-1 space-y-3 overflow-y-auto px-4 py-4',
            collapsed && 'hidden'
          )}
        >
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
              {renderTicketRow(current, 'Current')}
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
              {renderTicketRow(next, 'Pending')}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No upcoming tickets. Add more to keep things moving.
            </p>
          )}
        </div>
      </SurfaceCard>
    </aside>
  );
};
