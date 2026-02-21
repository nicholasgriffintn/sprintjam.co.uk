import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Loader2, Trash2 } from "lucide-react";

import type { TicketMetadata, TicketQueueItem } from "@/types";
import { getGithubMetadata } from "@/utils/github";
import { getJiraMetadata } from "@/utils/jira";
import { getLinearMetadata } from "@/utils/linear";
import { Button } from "@/components/ui/Button";
import type { ProviderLabels, QueueProvider } from "./queue-provider";
import { QueueLinkPreview } from "./QueueLinkPreview";

interface QueuePendingTicketCardProps {
  ticket: TicketQueueItem;
  canManageQueue: boolean;
  onSelectTicket?: (ticketId: number) => void;
  onDeleteTicket: (ticketId: number) => void;
  activeProvider: QueueProvider | null;
  providerLabels: ProviderLabels;
  renderBadge: (ticket?: TicketQueueItem) => ReactNode;
  isLinking: boolean;
  linkLookupKey: string;
  onLinkLookupKeyChange: (value: string) => void;
  isFetchingLink: boolean;
  isSavingLink: boolean;
  linkPreview: TicketMetadata | null;
  onToggleLink: (ticket: TicketQueueItem) => void;
  onLookupExternalTicket: (provider: QueueProvider) => void;
  onApplyLink: (provider: QueueProvider) => void;
  onCancelLinking: () => void;
}

export function QueuePendingTicketCard({
  ticket,
  canManageQueue,
  onSelectTicket,
  onDeleteTicket,
  activeProvider,
  providerLabels,
  renderBadge,
  isLinking,
  linkLookupKey,
  onLinkLookupKeyChange,
  isFetchingLink,
  isSavingLink,
  linkPreview,
  onToggleLink,
  onLookupExternalTicket,
  onApplyLink,
  onCancelLinking,
}: QueuePendingTicketCardProps) {
  const jiraMetadata = getJiraMetadata(ticket);
  const linearMetadata = getLinearMetadata(ticket);
  const githubMetadata = getGithubMetadata(ticket);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start gap-2">
        {canManageQueue && <GripVertical className="h-4 w-4 text-slate-400" />}
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">
              {ticket.ticketId}
            </span>
            {renderBadge(ticket)}
            {ticket.title && <span className="text-sm">{ticket.title}</span>}
          </div>
          {ticket.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 break-all">
              {ticket.description}
            </p>
          )}
          {jiraMetadata && (
            <p className="text-xs text-blue-700 dark:text-blue-200">
              {jiraMetadata.summary}
            </p>
          )}
          {linearMetadata && (
            <p className="text-xs text-purple-700 dark:text-purple-200">
              {linearMetadata.title || linearMetadata.identifier}
            </p>
          )}
          {githubMetadata && (
            <p className="text-xs text-slate-600 dark:text-slate-200">
              {githubMetadata.summary || githubMetadata.key}
            </p>
          )}
        </div>
        {canManageQueue && (
          <div className="flex items-center gap-2">
            {onSelectTicket && (
              <Button
                onClick={() => {
                  onSelectTicket(ticket.id);
                }}
                data-testid={`queue-start-voting-${ticket.id}`}
                variant="unstyled"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Start Voting
              </Button>
            )}
            {activeProvider && ticket.externalService === "none" && (
              <Button
                onClick={() => onToggleLink(ticket)}
                data-testid={`queue-link-toggle-${ticket.id}`}
                variant="unstyled"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                  isLinking
                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
                }`}
              >
                {isLinking ? "Close" : `Link ${providerLabels.name}`}
              </Button>
            )}
            <Button
              onClick={() => onDeleteTicket(ticket.id)}
              variant="unstyled"
              className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 shadow-sm hover:bg-red-100 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/40"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isLinking && activeProvider && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/20"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={linkLookupKey}
                onChange={(e) => onLinkLookupKeyChange(e.target.value)}
                placeholder={providerLabels.lookupPlaceholder}
                data-testid={`queue-link-${activeProvider}-input-${ticket.id}`}
                className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm dark:border-blue-700 dark:bg-blue-900/30"
              />
              <Button
                onClick={() => onLookupExternalTicket(activeProvider)}
                disabled={isFetchingLink || !linkLookupKey.trim()}
                data-testid={`queue-link-${activeProvider}-fetch-${ticket.id}`}
                variant="unstyled"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isFetchingLink && <Loader2 className="h-4 w-4 animate-spin" />}
                Fetch
              </Button>
            </div>
            <QueueLinkPreview ticket={linkPreview} provider={activeProvider} />
            <div className="mt-2 flex gap-2">
              <Button
                onClick={() => onApplyLink(activeProvider)}
                disabled={!linkPreview || isSavingLink}
                data-testid={`queue-link-${activeProvider}-save-${ticket.id}`}
                variant="unstyled"
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isSavingLink && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Link
              </Button>
              <Button
                onClick={onCancelLinking}
                variant="unstyled"
                className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
