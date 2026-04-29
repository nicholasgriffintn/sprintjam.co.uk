import { FC } from "react";
import type { SessionRoundHistoryItem } from "@sprintjam/types";
import type { TeamSession } from "@sprintjam/types";

import type { TicketQueueItem } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TicketQueueModalContent } from "@/components/modals/TicketQueueModal/Content";

interface CompleteSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isQueueEnabled: boolean;
  currentTicket?: TicketQueueItem;
  queue: TicketQueueItem[];
  roundHistory?: SessionRoundHistoryItem[];
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
  linkedWorkspaceSession?: TeamSession | null;
  linkedWorkspaceTeamName?: string | null;
  onCompleteSession?: () => void;
  recordedRoundsCount?: number;
  currentRoundVoteCount?: number;
  onError?: (message: string) => void;
}

export const CompleteSessionModal: FC<CompleteSessionModalProps> = ({
  isOpen,
  onClose,
  isQueueEnabled,
  currentTicket,
  queue,
  roundHistory,
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
  linkedWorkspaceSession = null,
  linkedWorkspaceTeamName = null,
  onCompleteSession,
  recordedRoundsCount = 0,
  currentRoundVoteCount = 0,
  onError,
}) => {
  const handleComplete = () => {
    onCompleteSession?.();
    onClose();
  };
  const resetRoundHistory = roundHistory?.filter(
    (entry) => entry.type === "reset",
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete session" size="lg">
      <div className="space-y-6">
        {isQueueEnabled ? (
          <TicketQueueModalContent
            currentTicket={currentTicket}
            queue={queue}
            roundHistory={resetRoundHistory}
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
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            <p>
              This room is using reset-based rounds. Completing the session will
              lock the room and preserve round tracking in the summary.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Recorded rounds: {recordedRoundsCount}. Current round votes:{" "}
              {currentRoundVoteCount}.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          {linkedWorkspaceSession && onSaveToWorkspace && (
            <div className="mr-auto min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Saved to workspace
                {linkedWorkspaceTeamName
                  ? ` in ${linkedWorkspaceTeamName}`
                  : ""}
              </p>
              <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                {linkedWorkspaceSession.name}
              </p>
            </div>
          )}
          <small>Note: Completing the session locks the room.</small>
          {!linkedWorkspaceSession &&
            showSaveToWorkspace &&
            onSaveToWorkspace && (
              <Button
                type="button"
                variant="secondary"
                data-testid="save-to-workspace-modal-button"
                onClick={onSaveToWorkspace}
              >
                Save to workspace
              </Button>
            )}
          {linkedWorkspaceSession && onSaveToWorkspace && (
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveToWorkspace}
            >
              Rename workspace session
            </Button>
          )}
          <Button type="button" onClick={handleComplete}>
            Complete session
          </Button>
        </div>
      </div>
    </Modal>
  );
};
