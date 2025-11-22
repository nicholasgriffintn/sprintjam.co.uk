import type { TicketQueueItem, TicketMetadata } from '../types';

export const getLinearMetadata = (
  ticket: TicketQueueItem
): TicketMetadata | undefined => {
  const metadata = ticket.externalServiceMetadata as
    | Record<string, unknown>
    | undefined;

  if (
    ticket.externalService === 'linear' &&
    metadata &&
    typeof metadata === 'object' &&
    'key' in metadata &&
    'summary' in metadata
  ) {
    return metadata as TicketMetadata;
  }

  return undefined;
};
