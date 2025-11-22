import { ExternalLink, Link2 } from 'lucide-react';

import type { TicketQueueItem } from '@/types';
import { getJiraMetadata } from '@/utils/jira';

export const JiraBadge = (ticket: TicketQueueItem) => {
  if (ticket.externalService !== 'jira') {
    return null;
  }
  const meta = getJiraMetadata(ticket);
  const key = meta?.key || ticket.ticketId;
  const url = meta?.url;

  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
      <Link2 className="h-3 w-3" />
      Jira
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
        <ExternalLink className="h-3 w-3 text-blue-500" />
      </a>
    );
  }

  return badge;
};
