import { useState } from 'react';
import { ArrowDownToLine, Loader2, RefreshCw } from 'lucide-react';

import type { TicketQueueItem } from '../../../types';
import { handleError } from '../../../utils/error';
import {
  updateJiraStoryPoints,
  convertVoteValueToStoryPoints,
} from '../../../lib/jira-service';
import { formatDate } from '../../../utils/date';
import { JiraBadge } from '../../JiraBadge';
import { getVoteSummary } from '../../../utils/votes';
import { downloadCsv } from '../../../utils/csv';
import { buildCsv } from '../utils/csv';

interface TicketQueueModalCompletedTabProps {
  completedTickets: TicketQueueItem[];
  roomKey: string;
  userName: string;
  onError?: (message: string) => void;
}

export function TicketQueueModalCompletedTab({
  completedTickets,
  roomKey,
  userName,
  onError,
}: TicketQueueModalCompletedTabProps) {
  const [syncingTicketId, setSyncingTicketId] = useState<number | null>(null);

  const getStoryPointEstimate = (ticket: TicketQueueItem): number | null => {
    if (!ticket.votes || ticket.votes.length === 0) {
      return null;
    }

    const numericVotes = ticket.votes
      .map(
        (vote) => vote.structuredVotePayload?.calculatedStoryPoints ?? vote.vote
      )
      .map(convertVoteValueToStoryPoints)
      .filter((value): value is number => value !== null);

    if (numericVotes.length === 0) return null;

    const average =
      numericVotes.reduce((total, value) => total + value, 0) /
      numericVotes.length;

    return Math.round((average + Number.EPSILON) * 10) / 10;
  };

  const handleSyncToJira = async (ticket: TicketQueueItem) => {
    if (ticket.externalService !== 'jira') {
      handleError('Sync available only for Jira-linked tickets.', onError);
      return;
    }

    const storyPoints = getStoryPointEstimate(ticket);
    if (storyPoints === null) {
      handleError('No numeric votes available to sync to Jira.', onError);
      return;
    }

    setSyncingTicketId(ticket.id);
    try {
      await updateJiraStoryPoints(ticket.ticketId, storyPoints, {
        roomKey,
        userName,
      });
    } catch (err) {
      handleError(
        err instanceof Error
          ? err.message
          : 'Failed to sync story points to Jira',
        onError
      );
    } finally {
      setSyncingTicketId(null);
    }
  };

  const handleDownloadTicket = (ticket: TicketQueueItem) => {
    const csv = buildCsv([ticket]);
    downloadCsv(`${ticket.ticketId}-votes.csv`, csv);
  };

  return (
    <div className="space-y-3" data-testid="queue-history-tab-panel">
      {completedTickets.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No completed tickets yet—wrap a ticket to see the history here.
        </p>
      ) : (
        completedTickets.map((ticket) => {
          const storyPoints = getStoryPointEstimate(ticket);
          return (
            <div
              key={ticket.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {ticket.ticketId}
                    </span>
                    <JiraBadge {...ticket} />
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      Completed
                    </span>
                  </div>
                  {ticket.title && (
                    <p className="text-sm font-semibold">{ticket.title}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ticket.completedAt
                      ? `Completed ${formatDate(ticket.completedAt)}`
                      : 'Completed'}
                  </p>
                  {ticket.outcome && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Outcome: {ticket.outcome}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleDownloadTicket(ticket)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                  {ticket.externalService === 'jira' && (
                    <button
                      onClick={() => handleSyncToJira(ticket)}
                      disabled={syncingTicketId === ticket.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {syncingTicketId === ticket.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Sync to Jira
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:grid-cols-3">
                <span>
                  Votes:{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {getVoteSummary(ticket)}
                  </span>
                </span>
                <span>
                  Estimate:{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {storyPoints ?? '—'}
                  </span>
                </span>
                <span className="truncate">
                  Outcome:{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {ticket.outcome || 'Not captured'}
                  </span>
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Vote history
                </p>
                {ticket.votes && ticket.votes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ticket.votes.map((vote) => (
                      <span
                        key={`${ticket.id}-${vote.userName}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          {vote.userName}
                        </span>
                        <span className="font-mono text-sm text-slate-900 dark:text-white">
                          {vote.structuredVotePayload?.calculatedStoryPoints ??
                            vote.vote}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    No recorded votes for this ticket.
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
