import { FC, useMemo, useState } from "react";

import type { SessionRoundHistoryItem, TicketQueueItem } from "@/types";
import { TicketQueueModalControls } from "@/components/modals/TicketQueueModal/Controls";
import { TicketQueueModalQueueTab } from "@/components/modals/TicketQueueModal/tabs/Queue";
import { TicketQueueModalCompletedTab } from "@/components/modals/TicketQueueModal/tabs/Completed";

interface TicketQueueModalContentProps {
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
  initialTab?: "queue" | "history";
  onError?: (message: string) => void;
}

export const TicketQueueModalContent: FC<TicketQueueModalContentProps> = ({
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
  initialTab = "queue",
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<"queue" | "history">(initialTab);

  const completedTickets = useMemo(
    () => queue.filter((t) => t.status === "completed"),
    [queue],
  );
  const pendingTickets = useMemo(
    () => queue.filter((t) => t.status === "pending"),
    [queue],
  );

  return (
    <div className="space-y-6">
      <TicketQueueModalControls
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        completedTickets={completedTickets}
      />

      {activeTab === "queue" ? (
        <TicketQueueModalQueueTab
          currentTicket={currentTicket}
          externalService={externalService}
          onAddTicket={onAddTicket}
          onUpdateTicket={onUpdateTicket}
          onDeleteTicket={onDeleteTicket}
          onSelectTicket={onSelectTicket}
          roomKey={roomKey}
          userName={userName}
          canManageQueue={canManageQueue}
          pendingTickets={pendingTickets}
          queue={queue}
          onError={onError}
        />
      ) : (
        <TicketQueueModalCompletedTab
          completedTickets={completedTickets}
          roundHistory={roundHistory}
          roomKey={roomKey}
          userName={userName}
          onError={onError}
          onUpdateTicket={onUpdateTicket}
        />
      )}
    </div>
  );
};
