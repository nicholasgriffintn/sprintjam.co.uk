import { FC, useMemo, useState } from 'react';

import type { TicketQueueItem } from '../../types';
import { Modal } from '../ui/Modal';
import { TicketQueueModalControls } from './Controls';
import { TicketQueueModalQueueTab } from './tabs/Queue';
import { TicketQueueModalCompletedTab } from './tabs/Completed';

interface TicketQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicket?: TicketQueueItem;
  queue: TicketQueueItem[];
  externalService: 'none' | 'jira';
  roomKey: string;
  userName: string;
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onDeleteTicket: (ticketId: number) => void;
  canManageQueue: boolean;
  onError?: (message: string) => void;
}

export const TicketQueueModal: FC<TicketQueueModalProps> = ({
  isOpen,
  onClose,
  currentTicket,
  queue,
  externalService,
  roomKey,
  userName,
  onAddTicket,
  onUpdateTicket,
  onDeleteTicket,
  canManageQueue,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  const completedTickets = useMemo(
    () => queue.filter((t) => t.status === 'completed'),
    [queue]
  );
  const pendingTickets = useMemo(
    () => queue.filter((t) => t.status === 'pending'),
    [queue]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ticket Queue" size="lg">
      <div className="space-y-6">
        <TicketQueueModalControls
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          completedTickets={completedTickets}
        />

        {activeTab === 'queue' ? (
          <TicketQueueModalQueueTab
            currentTicket={currentTicket}
            externalService={externalService}
            onAddTicket={onAddTicket}
            onUpdateTicket={onUpdateTicket}
            onDeleteTicket={onDeleteTicket}
            roomKey={roomKey}
            userName={userName}
            canManageQueue={canManageQueue}
            pendingTickets={pendingTickets}
            onError={onError}
          />
        ) : (
          <TicketQueueModalCompletedTab
            completedTickets={completedTickets}
            roomKey={roomKey}
            userName={userName}
            onError={onError}
            onUpdateTicket={onUpdateTicket}
          />
        )}
      </div>
    </Modal>
  );
};
