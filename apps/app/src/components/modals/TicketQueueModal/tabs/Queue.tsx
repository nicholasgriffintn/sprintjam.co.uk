import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link2, Plus } from "lucide-react";

import type { TicketQueueItem, TicketMetadata } from "@/types";
import { handleError } from "@/utils/error";
import { getGithubMetadata } from "@/utils/github";
import { getJiraMetadata } from "@/utils/jira";
import { getLinearMetadata } from "@/utils/linear";
import { ExternalServiceBadge } from "@/components/ExternalServiceBadge";
import { Button } from "@/components/ui/Button";
import {
  fetchTicketByProvider,
  getProviderLabels,
  toQueueProvider,
  type QueueProvider,
} from "./queue-provider";
import { QueueAddTicketForm } from "./QueueAddTicketForm";
import { QueuePendingTicketCard } from "./QueuePendingTicketCard";
import { QueueProviderImportPanel } from "./QueueProviderImportPanel";
import { clampTicketDescription } from "./queue-import-utils";
import { useQueueProviderImport } from "./useQueueProviderImport";

interface TicketQueueModalQueueTabProps {
  currentTicket?: TicketQueueItem;
  externalService: "none" | "jira" | "linear" | "github";
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onDeleteTicket: (ticketId: number) => void;
  onSelectTicket?: (ticketId: number) => void;
  roomKey: string;
  userName: string;
  canManageQueue: boolean;
  pendingTickets: TicketQueueItem[];
  queue: TicketQueueItem[];
  onError?: (message: string) => void;
}

export function TicketQueueModalQueueTab({
  currentTicket,
  externalService,
  onAddTicket,
  onUpdateTicket,
  onDeleteTicket,
  onSelectTicket,
  roomKey,
  userName,
  canManageQueue,
  pendingTickets,
  queue,
  onError,
}: TicketQueueModalQueueTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");

  const [linkingTicketId, setLinkingTicketId] = useState<number | null>(null);
  const [linkLookupKey, setLinkLookupKey] = useState("");
  const [linkPreview, setLinkPreview] = useState<TicketMetadata | null>(null);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);

  const activeProvider = toQueueProvider(externalService);
  const providerImport = useQueueProviderImport({
    activeProvider,
    externalService,
    roomKey,
    userName,
    canManageQueue,
    queue,
    onAddTicket,
    onError,
  });

  const isAddFormOpen = showAddForm;
  const isProviderImportOpen = providerImport.showProviderImport;
  const externalLabels = providerImport.externalLabels;

  const ticketLookup = useMutation({
    mutationKey: ["ticket-lookup", roomKey, userName],
    mutationFn: async (variables: { provider: QueueProvider; key: string }) =>
      fetchTicketByProvider(
        variables.provider,
        variables.key,
        roomKey,
        userName,
      ),
  });

  const closeAddForm = () => {
    setShowAddForm(false);
    setNewTicketTitle("");
    setNewTicketDescription("");
  };

  const handleAddTicket = () => {
    if (!newTicketTitle.trim()) return;

    onAddTicket({
      title: newTicketTitle.trim(),
      description: newTicketDescription.trim() || undefined,
      status: "pending",
    });

    setNewTicketTitle("");
    setNewTicketDescription("");
    setShowAddForm(false);
  };

  const lookupExternalTicket = async (provider: QueueProvider) => {
    if (!linkLookupKey.trim()) return;

    setIsFetchingLink(true);
    try {
      const ticket = await ticketLookup.mutateAsync({
        provider,
        key: linkLookupKey.trim(),
      });
      setLinkPreview(ticket);
    } catch (err) {
      const providerLabels = getProviderLabels(provider);
      handleError(
        err instanceof Error
          ? err.message
          : `Failed to fetch ${providerLabels.lookupNoun}`,
        onError,
      );
      setLinkPreview(null);
    } finally {
      setIsFetchingLink(false);
    }
  };

  const startLinkTicket = (ticket: TicketQueueItem) => {
    setLinkingTicketId(ticket.id);
    const jiraMeta = getJiraMetadata(ticket);
    const linearMeta = getLinearMetadata(ticket);
    const githubMeta = getGithubMetadata(ticket);
    const activeMeta =
      activeProvider === "jira"
        ? jiraMeta
        : activeProvider === "linear"
          ? linearMeta
          : activeProvider === "github"
            ? githubMeta
            : null;

    setLinkPreview(activeMeta ?? null);
    setLinkLookupKey(
      (activeMeta?.key as string | undefined) ||
        (activeMeta as { identifier?: string } | undefined)?.identifier ||
        ticket.ticketId ||
        "",
    );
  };

  const cancelLinking = () => {
    setLinkingTicketId(null);
    setLinkLookupKey("");
    setLinkPreview(null);
  };

  const handleApplyLink = async (provider: QueueProvider) => {
    const providerLabels = getProviderLabels(provider);
    if (!linkingTicketId || !linkPreview) {
      handleError(
        `Fetch a ${providerLabels.lookupNoun} before linking.`,
        onError,
      );
      return;
    }

    setIsSavingLink(true);
    try {
      const rawDescription =
        typeof linkPreview.description === "string"
          ? linkPreview.description.trim()
          : undefined;

      onUpdateTicket(linkingTicketId, {
        ticketId:
          linkPreview.key ||
          (linkPreview as { identifier?: string }).identifier,
        title: linkPreview.summary || (linkPreview as { title?: string }).title,
        description: clampTicketDescription(rawDescription),
        externalService: provider,
        externalServiceId: linkPreview.id,
        externalServiceMetadata: linkPreview,
      });
      cancelLinking();
    } catch (err) {
      handleError(
        err instanceof Error
          ? err.message
          : `Failed to link ${providerLabels.linkNoun}`,
        onError,
      );
    } finally {
      setIsSavingLink(false);
    }
  };

  const renderBadge = (ticket?: TicketQueueItem) => {
    if (!ticket) return null;

    if (ticket.externalService === "jira") {
      return (
        <ExternalServiceBadge
          service="jira"
          getMetadata={getJiraMetadata}
          ticket={ticket}
        />
      );
    }

    if (ticket.externalService === "linear") {
      return (
        <ExternalServiceBadge
          service="linear"
          getMetadata={getLinearMetadata}
          ticket={ticket}
        />
      );
    }

    if (ticket.externalService === "github") {
      return (
        <ExternalServiceBadge
          service="github"
          getMetadata={getGithubMetadata}
          ticket={ticket}
        />
      );
    }

    return null;
  };

  return (
    <>
      {currentTicket && (
        <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 dark:border-blue-400 dark:bg-blue-900/20">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            <span>Current Ticket</span>
            {renderBadge(currentTicket)}
          </h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold">
                {currentTicket.ticketId}
              </span>
              <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                In Progress
              </span>
            </div>
            {currentTicket.title && (
              <p className="text-sm font-medium">{currentTicket.title}</p>
            )}
            {currentTicket.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 break-all">
                {currentTicket.description}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Pending Tickets ({pendingTickets.length})
          </h3>
          {canManageQueue && (
            <div className="flex flex-wrap items-center gap-2">
              {activeProvider && (
                <Button
                  onClick={() => {
                    if (isAddFormOpen) {
                      closeAddForm();
                    }
                    providerImport.openProviderImport();
                  }}
                  disabled={isAddFormOpen || isProviderImportOpen}
                  data-testid={externalLabels.importButtonTestId}
                  variant="unstyled"
                  className={externalLabels.importButtonClassName}
                >
                  <Link2 className="h-3 w-3" />
                  {externalLabels.importButtonLabel}
                </Button>
              )}
              <Button
                onClick={() => {
                  if (isProviderImportOpen) {
                    providerImport.resetProviderImport();
                  }
                  setShowAddForm(true);
                }}
                disabled={isAddFormOpen || isProviderImportOpen}
                data-testid="queue-toggle-add"
                variant="unstyled"
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                <Plus className="h-3 w-3" />
                Add Ticket
              </Button>
            </div>
          )}
        </div>

        <QueueAddTicketForm
          open={showAddForm}
          ticketTitle={newTicketTitle}
          ticketDescription={newTicketDescription}
          onTicketTitleChange={setNewTicketTitle}
          onTicketDescriptionChange={setNewTicketDescription}
          onCancel={closeAddForm}
          onAdd={handleAddTicket}
        />

        {providerImport.externalEnabled && (
          <QueueProviderImportPanel importState={providerImport} />
        )}

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {pendingTickets.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No pending tickets
            </p>
          ) : (
            pendingTickets.map((ticket) => (
              <QueuePendingTicketCard
                key={ticket.id}
                ticket={ticket}
                canManageQueue={canManageQueue}
                onSelectTicket={onSelectTicket}
                onDeleteTicket={onDeleteTicket}
                activeProvider={activeProvider}
                providerLabels={externalLabels}
                renderBadge={renderBadge}
                isLinking={linkingTicketId === ticket.id}
                linkLookupKey={linkLookupKey}
                onLinkLookupKeyChange={setLinkLookupKey}
                isFetchingLink={isFetchingLink}
                isSavingLink={isSavingLink}
                linkPreview={linkPreview}
                onToggleLink={(activeTicket) => {
                  if (linkingTicketId === activeTicket.id) {
                    cancelLinking();
                    return;
                  }
                  startLinkTicket(activeTicket);
                }}
                onLookupExternalTicket={(provider) => {
                  void lookupExternalTicket(provider);
                }}
                onApplyLink={(provider) => {
                  void handleApplyLink(provider);
                }}
                onCancelLinking={cancelLinking}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
