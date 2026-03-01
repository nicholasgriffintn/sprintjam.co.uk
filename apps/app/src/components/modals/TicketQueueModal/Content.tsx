import { FC, useMemo, useState } from "react";
import type { SessionRoundHistoryItem } from "@sprintjam/types";
import { ArrowDownToLine } from "lucide-react";

import type { TicketQueueItem } from "@/types";
import { Button, Tabs } from "@/components/ui";
import { TicketQueueModalQueueTab } from "@/components/modals/TicketQueueModal/tabs/Queue";
import { TicketQueueModalCompletedTab } from "@/components/modals/TicketQueueModal/tabs/Completed";
import { buildCsv } from "@/components/modals/TicketQueueModal/utils/csv";
import { downloadCsv } from "@/utils/csv";

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

  const handleDownloadHistory = () => {
    const csv = buildCsv(completedTickets);
    downloadCsv("sprintjam-past-estimations.csv", csv);
  };

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => {
        if (value === "queue" || value === "history") {
          setActiveTab(value);
        }
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs.List>
          <Tabs.Tab value="queue" data-testid="queue-tab-queue">
            Queue
          </Tabs.Tab>
          <Tabs.Tab value="history" data-testid="queue-tab-history">
            Past estimations
          </Tabs.Tab>
        </Tabs.List>
        {activeTab === "history" && completedTickets.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadHistory}
              variant="unstyled"
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Download CSV
            </Button>
          </div>
        ) : null}
      </div>

      <Tabs.Panel value="queue">
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
      </Tabs.Panel>
      <Tabs.Panel value="history">
        <TicketQueueModalCompletedTab
          completedTickets={completedTickets}
          roundHistory={roundHistory}
          roomKey={roomKey}
          userName={userName}
          canManageQueue={canManageQueue}
          onError={onError}
          onUpdateTicket={onUpdateTicket}
        />
      </Tabs.Panel>
    </Tabs.Root>
  );
};
