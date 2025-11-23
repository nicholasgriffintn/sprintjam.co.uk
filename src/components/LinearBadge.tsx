import type { TicketQueueItem } from '@/types';
import { getLinearMetadata } from '@/utils/linear';
import { ExternalServiceBadge } from './ExternalServiceBadge';

export const LinearBadge = (ticket: TicketQueueItem) => {
  return (
    <ExternalServiceBadge
      ticket={ticket}
      service="linear"
      getMetadata={getLinearMetadata}
    />
  );
};
