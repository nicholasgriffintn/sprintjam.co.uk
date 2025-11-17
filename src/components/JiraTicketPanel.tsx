import { useState } from 'react';

import { JiraTicket, VoteValue } from '../types';
import {
  fetchJiraTicket,
  updateJiraStoryPoints,
  convertVoteValueToStoryPoints,
  clearJiraTicket,
} from '../lib/jira-service';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { SurfaceCard } from './ui/SurfaceCard';

interface JiraTicketPanelProps {
  isModeratorView: boolean;
  currentJiraTicket: JiraTicket | undefined;
  judgeScore: VoteValue | null;
  roomKey: string;
  userName: string;
  onJiraTicketFetched: (ticket: JiraTicket) => void;
  onJiraTicketUpdated: (ticket: JiraTicket) => void;
  onError: (error: string) => void;
}

const JiraTicketPanel: React.FC<JiraTicketPanelProps> = ({
  isModeratorView,
  currentJiraTicket,
  judgeScore,
  roomKey,
  userName,
  onJiraTicketFetched,
  onJiraTicketUpdated,
  onError,
}) => {
  const [ticketId, setTicketId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleFetchTicket = async () => {
    if (!ticketId.trim()) {
      onError('Please enter a Jira ticket ID');
      return;
    }

    console.log(
      'Fetching Jira ticket:',
      ticketId,
      'for room:',
      roomKey,
      'as user:',
      userName
    );
    setIsLoading(true);
    try {
      const ticket = await fetchJiraTicket(ticketId, { roomKey, userName });
      console.log('Fetched ticket:', ticket);
      if (ticket) {
        onJiraTicketFetched(ticket);
        setTicketId('');
      } else {
        onError('Could not fetch ticket details');
      }
    } catch (err) {
      console.error('Error fetching Jira ticket:', err);
      onError(
        err instanceof Error ? err.message : 'Failed to fetch Jira ticket'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStoryPoints = async () => {
    if (!currentJiraTicket) {
      onError('No Jira ticket selected');
      return;
    }

    if (judgeScore === null) {
      onError('No score selected for the ticket');
      return;
    }

    const storyPoints = convertVoteValueToStoryPoints(judgeScore);
    if (storyPoints === null) {
      onError('Cannot convert selected score to a valid story point value');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedTicket = await updateJiraStoryPoints(
        currentJiraTicket.key,
        storyPoints,
        { roomKey, userName }
      );
      onJiraTicketUpdated(updatedTicket);
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : 'Failed to update Jira story points'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SurfaceCard
      data-testid="jira-ticket-panel"
      className="space-y-4"
      padding="sm"
      variant="subtle"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            Jira Ticket
          </p>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            {currentJiraTicket ? currentJiraTicket.summary : 'Link a ticket'}
          </h3>
        </div>
        {currentJiraTicket && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
            {currentJiraTicket.projectName ?? 'Active project'}
          </span>
        )}
      </div>

      {!currentJiraTicket ? (
        <div className="space-y-2 rounded-2xl border border-white/30 p-3 text-sm dark:border-white/10">
          <label
            htmlFor="jira-ticket-input"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300"
          >
            Ticket ID
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="jira-ticket-input"
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Enter Jira ticket ID (e.g., PROJECT-123)"
              className="flex-1"
              disabled={isLoading}
              fullWidth
              data-testid="jira-ticket-input"
            />
            <Button
              onClick={handleFetchTicket}
              disabled={isLoading || !ticketId.trim()}
              isLoading={isLoading}
              data-testid="jira-fetch-button"
              fullWidth
              className="sm:w-auto"
            >
              Fetch Ticket
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm" data-testid="jira-ticket-details">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={currentJiraTicket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-brand-600 transition hover:text-brand-500 dark:text-brand-300"
              >
                {currentJiraTicket.key}
              </a>
              <a
                href={currentJiraTicket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-slate-500 underline underline-offset-4 hover:text-brand-500 dark:text-slate-300"
              >
                Open in Jira
              </a>
            </div>
            {isModeratorView && (
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full text-xs font-semibold"
                onClick={async () => {
                  try {
                    await clearJiraTicket(roomKey, userName);
                    onJiraTicketFetched(undefined as unknown as JiraTicket);
                  } catch (err) {
                    onError(
                      err instanceof Error
                        ? err.message
                        : 'Failed to clear Jira ticket'
                    );
                  }
                }}
              >
                Clear Ticket
              </Button>
            )}
          </div>

          {currentJiraTicket.description && (
            <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2">
              {currentJiraTicket.description}
            </p>
          )}

          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 p-3 dark:border-white/10">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Status
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-white">
                {currentJiraTicket.status}
              </dd>
            </div>
            {currentJiraTicket.assignee && (
              <div className="rounded-2xl border border-white/20 p-3 dark:border-white/10">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Assignee
                </dt>
                <dd className="text-base font-semibold text-slate-900 dark:text-white">
                  {currentJiraTicket.assignee}
                </dd>
              </div>
            )}
            <div className="rounded-2xl border border-white/20 p-3 dark:border-white/10">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Story Points
              </dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-white">
                {currentJiraTicket.storyPoints ?? 'Not set'}
              </dd>
            </div>
          </dl>

          {isModeratorView &&
            judgeScore !== null &&
            judgeScore !== currentJiraTicket.storyPoints && (
              <div className="rounded-2xl border border-emerald-200/40 bg-emerald-50/70 p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Current vote score:{' '}
                    <span className="font-semibold">
                      {judgeScore}
                    </span>
                  </span>
                  <Button
                    onClick={handleUpdateStoryPoints}
                    disabled={isUpdating}
                    isLoading={isUpdating}
                    data-testid="jira-update-button"
                    fullWidth
                    className="sm:w-fit"
                  >
                    Update Story Points in Jira
                  </Button>
                </div>
              </div>
            )}
        </div>
      )}

    </SurfaceCard>
  );
};

export default JiraTicketPanel;
