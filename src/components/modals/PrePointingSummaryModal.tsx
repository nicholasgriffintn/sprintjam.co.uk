import { FC, useMemo } from "react";
import { CheckCircle2, Users } from "lucide-react";

import type { TicketQueueItem, VoteValue } from "../../types";
import { Modal } from "../ui/Modal";

interface PrePointingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  votes: Record<string, VoteValue | null>;
  stats: {
    avg: number | string;
    mode: VoteValue | null;
    distribution: Record<VoteValue, number>;
    totalVotes: number;
    votedUsers: number;
    totalUsers: number;
    judgeScore: VoteValue | null;
  };
  currentTicket?: TicketQueueItem;
  currentUser: string;
}

export const PrePointingSummaryModal: FC<PrePointingSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  votes,
  stats,
  currentTicket,
  currentUser,
}) => {
  const voteEntries = useMemo(
    () =>
      Object.entries(votes).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    [votes],
  );

  const consensusLabel =
    stats.mode !== null && stats.distribution[stats.mode] === stats.totalVotes
      ? "Consensus"
      : "Mixed";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review before moving on">
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current Ticket
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {currentTicket?.ticketId || "N/A"}
                </div>
              </div>
            </div>
            {currentTicket?.externalService !== "none" &&
              currentTicket?.externalServiceMetadata &&
              "url" in currentTicket.externalServiceMetadata && (
                <a
                  href={
                    (
                      currentTicket.externalServiceMetadata as Record<
                        string,
                        string
                      >
                    ).url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 underline decoration-dotted underline-offset-2 hover:text-blue-500 dark:text-blue-300"
                >
                  Open in {currentTicket.externalService.toUpperCase()}
                </a>
              )}
          </div>
          {currentTicket?.description && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {currentTicket.description}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Consensus
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">
                {consensusLabel} · Avg {stats.avg}
              </div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Responded {stats.votedUsers}/{stats.totalUsers}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(stats.distribution).map(([value, count]) => (
              <div
                key={value}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-900/60"
              >
                <span className="font-semibold">{value}</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Users className="h-4 w-4" />
            Voters
          </div>
          <div className="mt-2 space-y-1">
            {voteEntries.map(([user, value]) => (
              <div
                key={user}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-sm dark:bg-slate-900/60"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {user}
                  {user === currentUser && " (you)"}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            data-testid="pre-pointing-cancel"
            className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="pre-pointing-confirm"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Next Ticket
          </button>
        </div>
      </div>
    </Modal>
  );
};
