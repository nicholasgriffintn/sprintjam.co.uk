import { FC } from "react";

import type { TicketQueueItem } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { TicketQueueModalContent } from "./Content";

interface TicketQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  onSelectTicket,
  canManageQueue,
  onError,
}) => {

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ticket Queue" size="lg">
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
        initialTab="queue"
        onError={onError}
      />
    </Modal>
  );
};
