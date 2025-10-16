import { useState } from 'react';
import { JiraTicket, VoteValue } from '../types';
import { fetchJiraTicket, updateJiraStoryPoints, convertVoteValueToStoryPoints, clearJiraTicket } from '../lib/jira-service';

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

    console.log('Fetching Jira ticket:', ticketId, 'for room:', roomKey, 'as user:', userName);
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
      onError(err instanceof Error ? err.message : 'Failed to fetch Jira ticket');
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
      const updatedTicket = await updateJiraStoryPoints(currentJiraTicket.key, storyPoints, { roomKey, userName });
      onJiraTicketUpdated(updatedTicket);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update Jira story points');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Jira Ticket</h3>

      {!currentJiraTicket ? (
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Enter Jira ticket ID (e.g., PROJECT-123)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleFetchTicket}
              disabled={isLoading || !ticketId.trim()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Fetch'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h4 className="font-medium text-blue-600 dark:text-blue-400">{currentJiraTicket.key}</h4>
              <a
                href={currentJiraTicket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Open in Jira
              </a>
            </div>
            {isModeratorView && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await clearJiraTicket(roomKey, userName);
                    onJiraTicketFetched(undefined as unknown as JiraTicket);
                  } catch (err) {
                    onError(err instanceof Error ? err.message : 'Failed to clear Jira ticket');
                  }
                }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                Clear
              </button>
            )}
          </div>

          <h3 className="text-lg font-medium">{currentJiraTicket.summary}</h3>

          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
            <p className="line-clamp-3">{currentJiraTicket.description || 'No description available'}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <div className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">
              Status: <span className="font-medium text-gray-900 dark:text-white">{currentJiraTicket.status}</span>
            </div>
            {currentJiraTicket.assignee && (
              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">
                Assignee: <span className="font-medium text-gray-900 dark:text-white">{currentJiraTicket.assignee}</span>
              </div>
            )}
            <div className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">
              Story Points: <span className="font-medium text-gray-900 dark:text-white">{currentJiraTicket.storyPoints ?? 'Not set'}</span>
            </div>
          </div>

          {isModeratorView && judgeScore !== null && judgeScore !== currentJiraTicket.storyPoints && (
            <div className="mt-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-900 dark:text-white">Current Vote Score: <span className="font-medium">{judgeScore}</span></span>
                <button
                  type="button"
                  onClick={handleUpdateStoryPoints}
                  disabled={isUpdating}
                  className="px-3 py-1 text-sm bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Update Story Points in Jira'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {isModeratorView ?
          'As the moderator, you can fetch Jira tickets and update story points when voting is complete.' :
          'The room moderator can fetch Jira tickets and update story points.'}
      </div>
    </div>
  );
};

export default JiraTicketPanel;
