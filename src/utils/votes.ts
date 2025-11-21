import { TicketQueueItem, TicketVote } from '../types';
import { convertVoteValueToStoryPoints } from '../lib/jira-service';

export const getVoteSummary = (ticket: TicketQueueItem) => {
  if (!ticket.votes || ticket.votes.length === 0) return 'No votes';

  const voteValues = ticket.votes.map((v) => String(v.vote));
  const counts: Record<string, number> = {};
  voteValues.forEach((v) => (counts[v] = (counts[v] || 0) + 1));

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([val, count]) => `${val} (${count})`)
    .join(', ');
};

export const calculateStoryPointsFromVotes = (
  votes?: TicketVote[]
): number | null => {
  if (!votes || votes.length === 0) {
    return null;
  }

  const numericVotes = votes
    .map(
      (vote) => vote.structuredVotePayload?.calculatedStoryPoints ?? vote.vote
    )
    .map(convertVoteValueToStoryPoints)
    .filter((value): value is number => value !== null);

  if (numericVotes.length === 0) {
    return null;
  }

  const average =
    numericVotes.reduce((total, value) => total + value, 0) /
    numericVotes.length;

  return Math.round((average + Number.EPSILON) * 10) / 10;
};
