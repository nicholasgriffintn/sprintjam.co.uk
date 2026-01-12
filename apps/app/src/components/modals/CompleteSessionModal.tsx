import { FC } from "react";
import { BarChart3, Users, Target, TrendingUp } from "lucide-react";

import type { TicketQueueItem } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Spinner } from "@/components/ui/Spinner";
import { TicketQueueModalContent } from "@/components/modals/TicketQueueModal/Content";
import { useRoomVotingStats } from "@/hooks/useVotingStats";

interface CompleteSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isQueueEnabled: boolean;
  currentTicket?: TicketQueueItem;
  queue: TicketQueueItem[];
  externalService: "none" | "jira" | "linear" | "github";
  roomKey: string;
  userName: string;
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onDeleteTicket: (ticketId: number) => void;
  onSelectTicket?: (ticketId: number) => void;
  canManageQueue: boolean;
  onSaveToWorkspace?: () => void;
  showSaveToWorkspace?: boolean;
  onError?: (message: string) => void;
}

export const CompleteSessionModal: FC<CompleteSessionModalProps> = ({
  isOpen,
  onClose,
  isQueueEnabled,
  currentTicket,
  queue,
  externalService,
  roomKey,
  userName,
  onAddTicket,
  onUpdateTicket,
  onDeleteTicket,
  onSelectTicket,
  canManageQueue,
  onSaveToWorkspace,
  showSaveToWorkspace = false,
  onError,
}) => {
  const { stats, isLoading: isLoadingStats } = useRoomVotingStats(
    isOpen ? roomKey : null,
  );

  const completedTickets = queue.filter((t) => t.completedAt).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete session" size="lg">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SurfaceCard variant="subtle" padding="sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-100 p-2 dark:bg-brand-900/40">
                <Target className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rounds
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {isLoadingStats ? (
                    <Spinner size="sm" />
                  ) : (
                    (stats?.totalRounds ?? 0)
                  )}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard variant="subtle" padding="sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/40">
                <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Votes
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {isLoadingStats ? (
                    <Spinner size="sm" />
                  ) : (
                    (stats?.totalVotes ?? 0)
                  )}
                </p>
              </div>
            </div>
          </SurfaceCard>

          {isQueueEnabled && (
            <SurfaceCard variant="subtle" padding="sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/40">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Completed
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {completedTickets} / {queue.length}
                  </p>
                </div>
              </div>
            </SurfaceCard>
          )}

          <SurfaceCard variant="subtle" padding="sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/40">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Room
                </p>
                <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                  {roomKey}
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        {isQueueEnabled ? (
          <TicketQueueModalContent
            currentTicket={currentTicket}
            queue={queue}
            externalService={externalService}
            roomKey={roomKey}
            userName={userName}
            onAddTicket={onAddTicket}
            onUpdateTicket={onUpdateTicket}
            onDeleteTicket={onDeleteTicket}
            onSelectTicket={onSelectTicket}
            canManageQueue={canManageQueue}
            initialTab="history"
            onError={onError}
          />
        ) : (
          <SurfaceCard variant="subtle" padding="sm">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This session was run without a ticket queue. Your voting stats
              have been recorded and will appear in your workspace dashboard.
            </p>
          </SurfaceCard>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          {showSaveToWorkspace && onSaveToWorkspace && (
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveToWorkspace}
            >
              Save to workspace
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            Complete session
          </Button>
        </div>
      </div>
    </Modal>
  );
};
