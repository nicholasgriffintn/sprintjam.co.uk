import { TicketQueueItem } from '../types';

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
