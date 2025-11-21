import type { TicketQueueItem, TicketMetadata } from '../types';

export const getJiraMetadata = (
  ticket: TicketQueueItem
): TicketMetadata | undefined => {
  const metadata = ticket.externalServiceMetadata as
    | Record<string, unknown>
    | undefined;

  if (
    ticket.externalService === 'jira' &&
    metadata &&
    typeof metadata === 'object' &&
    'key' in metadata &&
    'summary' in metadata
  ) {
    return metadata as TicketMetadata;
  }

  return undefined;
};
