import { ExternalLink, Link2 } from 'lucide-react';

import type { TicketQueueItem } from '@/types';
import { getLinearMetadata } from '@/utils/linear';

export const LinearBadge = (ticket: TicketQueueItem) => {
  if (ticket.externalService !== 'linear') {
    return null;
  }
  const meta = getLinearMetadata(ticket);
  const key = meta?.key || ticket.ticketId;
  const url = meta?.url;

  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
      <Link2 className="h-3 w-3" />
      Linear
      {key && <span className="font-mono text-[10px] uppercase">{key}</span>}
    </span>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1"
      >
        {badge}
        <ExternalLink className="h-3 w-3 text-purple-500" />
      </a>
    );
  }

  return badge;
};
