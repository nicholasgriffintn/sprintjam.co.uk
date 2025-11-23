import { ExternalLink, Link2 } from 'lucide-react';

import type { TicketQueueItem } from '@/types';

interface ExternalServiceBadgeProps {
    ticket: TicketQueueItem;
    service: 'jira' | 'linear';
    getMetadata: (ticket: TicketQueueItem) => { key?: string; url?: string } | null | undefined;
}

const serviceConfig = {
    jira: {
        name: 'Jira',
        bgClass: 'bg-blue-100 dark:bg-blue-900/40',
        textClass: 'text-blue-700 dark:text-blue-200',
        linkClass: 'text-blue-500',
    },
    linear: {
        name: 'Linear',
        bgClass: 'bg-purple-100 dark:bg-purple-900/40',
        textClass: 'text-purple-700 dark:text-purple-200',
        linkClass: 'text-purple-500',
    },
};

export const ExternalServiceBadge = ({
    ticket,
    service,
    getMetadata,
}: ExternalServiceBadgeProps) => {
    if (ticket.externalService !== service) {
        return null;
    }

    const meta = getMetadata(ticket);
    const key = meta?.key || ticket.ticketId;
    const url = meta?.url;
    const config = serviceConfig[service];

    const badge = (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${config.bgClass} ${config.textClass}`}
        >
            <Link2 className="h-3 w-3" />
            {config.name}
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
                <ExternalLink className={`h-3 w-3 ${config.linkClass}`} />
            </a>
        );
    }

    return badge;
};