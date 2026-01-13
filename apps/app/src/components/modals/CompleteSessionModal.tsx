import { FC } from 'react';

import type { TicketQueueItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TicketQueueModalContent } from '@/components/modals/TicketQueueModal/Content';

interface CompleteSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isQueueEnabled: boolean;
  currentTicket?: TicketQueueItem;
  queue: TicketQueueItem[];
  externalService: 'none' | 'jira' | 'linear' | 'github';
  roomKey: string;
  userName: string;
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onDeleteTicket: (ticketId: number) => void;
  onSelectTicket?: (ticketId: number) => void;
  canManageQueue: boolean;
  onSaveToWorkspace?: () => void;
  showSaveToWorkspace?: boolean;
  onCompleteSession?: () => void;
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
  onCompleteSession,
  onError,
}) => {
  const handleComplete = () => {
    onCompleteSession?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete session" size="lg">
      <div className="space-y-6">
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
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            Ticket queue is disabled for this room. Saving a session without a
            queue is coming soon—use the save button to link this room to your
            workspace for now.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <small>Note: Completing the session locks the room.</small>
          {showSaveToWorkspace && onSaveToWorkspace && (
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveToWorkspace}
            >
              Save to workspace
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
