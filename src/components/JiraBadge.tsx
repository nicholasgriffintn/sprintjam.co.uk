import type { TicketQueueItem } from '@/types';
import { getJiraMetadata } from '@/utils/jira';
import { ExternalServiceBadge } from './ExternalServiceBadge';

export const JiraBadge = (ticket: TicketQueueItem) => {
  return (
    <ExternalServiceBadge
      ticket={ticket}
      service="jira"
      getMetadata={getJiraMetadata}
    />
  );
};
