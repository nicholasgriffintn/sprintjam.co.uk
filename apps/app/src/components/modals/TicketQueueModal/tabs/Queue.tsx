import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, Plus, Loader2 } from "lucide-react";

import type {
  ExternalTicketSummary,
  TicketQueueItem,
  TicketMetadata,
} from "@/types";
import { handleError } from "@/utils/error";
import { getJiraMetadata } from "@/utils/jira";
import { getLinearMetadata } from "@/utils/linear";
import { getGithubMetadata } from "@/utils/github";
import { ExternalServiceBadge } from "@/components/ExternalServiceBadge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  fetchBoardsByProvider,
  fetchSprintsByProvider,
  fetchTicketByProvider,
  fetchTicketsByProvider,
  getProviderLabels,
  toQueueProvider,
  type QueueProvider,
} from "./queue-provider";
import { QueueAddTicketForm } from "./QueueAddTicketForm";
import { QueuePendingTicketCard } from "./QueuePendingTicketCard";

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

const MAX_TICKET_DESCRIPTION_LENGTH = 10000;

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
  const [showProviderImport, setShowProviderImport] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");

  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [linkingTicketId, setLinkingTicketId] = useState<number | null>(null);
  const [linkLookupKey, setLinkLookupKey] = useState("");
  const [linkPreview, setLinkPreview] = useState<TicketMetadata | null>(null);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);

  const activeProvider = toQueueProvider(externalService);
  const jiraEnabled = activeProvider === "jira";
  const linearEnabled = activeProvider === "linear";
  const githubEnabled = activeProvider === "github";
  const externalEnabled = activeProvider !== null;
  const isAddFormOpen = showAddForm;
  const isProviderImportOpen = showProviderImport;

  const externalLabels = getProviderLabels(activeProvider);
  const providerName = externalLabels.name;

  const ticketLookup = useMutation({
    mutationKey: ["ticket-lookup", roomKey, userName],
    mutationFn: async (variables: {
      provider: QueueProvider;
      key: string;
    }) =>
      fetchTicketByProvider(
        variables.provider,
        variables.key,
        roomKey,
        userName,
      ),
  });

  useEffect(() => {
    setSelectedBoardId("");
    setSelectedSprintId("");
    setTicketSearch("");
    setSelectedTicketIds(new Set());
    setShowProviderImport(false);
  }, [externalService]);

  useEffect(() => {
    setSelectedSprintId("");
    setTicketSearch("");
    setSelectedTicketIds(new Set());
  }, [selectedBoardId]);

  const closeAddForm = () => {
    setShowAddForm(false);
    setNewTicketTitle("");
    setNewTicketDescription("");
  };

  const resetProviderImport = () => {
    setShowProviderImport(false);
    setSelectedBoardId("");
    setSelectedSprintId("");
    setTicketSearch("");
    setSelectedTicketIds(new Set());
  };

  const boardsQuery = useQuery({
    queryKey: ["external-boards", externalService, roomKey, userName],
    enabled: externalEnabled && canManageQueue && showProviderImport,
    staleTime: 1000 * 60,
    queryFn: async () =>
      activeProvider
        ? fetchBoardsByProvider(activeProvider, roomKey, userName)
        : [],
  });

  const sprintsQuery = useQuery({
    queryKey: [
      "external-sprints",
      externalService,
      selectedBoardId,
      roomKey,
      userName,
    ],
    enabled:
      externalEnabled &&
      showProviderImport &&
      externalLabels.supportsSprint &&
      Boolean(selectedBoardId) &&
      canManageQueue,
    staleTime: 1000 * 60,
    queryFn: async () =>
      activeProvider
        ? fetchSprintsByProvider(
            activeProvider,
            selectedBoardId,
            roomKey,
            userName,
          )
        : [],
  });
  const boardOptions = [
    {
      label: boardsQuery.isLoading
        ? `Loading ${externalLabels.board}...`
        : `Select ${externalLabels.board}`,
      value: "",
    },
    ...(boardsQuery.data ?? []).map((board) => ({
      label: `${board.name}${board.key ? ` (${board.key})` : ""}`,
      value: board.id,
    })),
  ];
  const sprintOptions = [
    { label: `Select ${externalLabels.sprint} (optional)`, value: "" },
    ...(sprintsQuery.data ?? []).map((sprint) => ({
      label: `${sprint.name}${sprint.state ? ` (${sprint.state})` : ""}`,
      value: sprint.id,
    })),
  ];

  const ticketLimit = selectedSprintId ? null : 50;
  const selectedSprint = useMemo(
    () =>
      (sprintsQuery.data ?? []).find(
        (sprint) => sprint.id === selectedSprintId,
      ),
    [selectedSprintId, sprintsQuery.data],
  );

  const searchQuery = ticketSearch.trim();

  const ticketsQuery = useQuery({
    queryKey: [
      "external-tickets",
      externalService,
      selectedBoardId,
      selectedSprintId,
      searchQuery,
      ticketLimit,
      roomKey,
      userName,
    ],
    enabled:
      externalEnabled &&
      showProviderImport &&
      Boolean(selectedBoardId) &&
      canManageQueue,
    staleTime: 1000 * 20,
    queryFn: async () =>
      activeProvider
        ? fetchTicketsByProvider({
            provider: activeProvider,
            selectedBoardId,
            selectedSprintId,
            selectedSprint,
            ticketLimit,
            searchQuery,
            roomKey,
            userName,
          })
        : [],
  });

  const renderBadge = (ticket?: TicketQueueItem) => {
    if (!ticket) return null;
    if (ticket.externalService === "jira")
      return (
        <ExternalServiceBadge
          service="jira"
          getMetadata={getJiraMetadata}
          ticket={ticket}
        />
      );
    if (ticket.externalService === "linear")
      return (
        <ExternalServiceBadge
          service="linear"
          getMetadata={getLinearMetadata}
          ticket={ticket}
        />
      );
    if (ticket.externalService === "github")
      return (
        <ExternalServiceBadge
          service="github"
          getMetadata={getGithubMetadata}
          ticket={ticket}
        />
      );
    return null;
  };

  const clampTicketDescription = (description?: string): string | undefined => {
    if (!description) {
      return undefined;
    }

    return description.length > MAX_TICKET_DESCRIPTION_LENGTH
      ? description.slice(0, MAX_TICKET_DESCRIPTION_LENGTH)
      : description;
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

  const lookupExternalTicket = async (
    key: string,
    provider: QueueProvider,
    setPreview: (ticket: TicketMetadata | null) => void,
    setLoading: (loading: boolean) => void,
  ) => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      const ticket = await ticketLookup.mutateAsync({
        provider,
        key: key.trim(),
      });
      setPreview(ticket);
    } catch (err) {
      const providerLabels = getProviderLabels(provider);
      handleError(
        err instanceof Error
          ? err.message
          : `Failed to fetch ${providerLabels.lookupNoun}`,
        onError,
      );
      setPreview(null);
    } finally {
      setLoading(false);
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

  const isPointsLabel = (label: string) => {
    const normalized = label.trim().toLowerCase();
    return normalized === "points" || normalized.startsWith("points:");
  };

  const normalizeExternalTicket = (
    ticket: TicketMetadata,
  ): ExternalTicketSummary => {
    const rawKey =
      ticket.key ??
      (ticket as { identifier?: string }).identifier ??
      ticket.id ??
      "";
    const key = String(rawKey);
    const id = String(ticket.id ?? key);
    const title =
      ticket.summary ??
      (ticket as { title?: string }).title ??
      (ticket as { name?: string }).name ??
      key;
    const description =
      ticket.description ?? (ticket as { body?: string }).body ?? undefined;
    const url = ticket.url ?? (ticket as { html_url?: string }).html_url;

    return {
      id,
      key,
      title,
      description,
      status: ticket.status ?? "Unknown",
      assignee: ticket.assignee ?? null,
      storyPoints: ticket.storyPoints ?? null,
      estimate: (ticket as { estimate?: number | null }).estimate ?? null,
      labels: (ticket as { labels?: string[] }).labels ?? [],
      url,
      metadata: ticket,
    };
  };

  const externalTickets = useMemo(
    () =>
      (ticketsQuery.data ?? []).map((ticket) =>
        normalizeExternalTicket(ticket),
      ),
    [ticketsQuery.data],
  );

  const existingExternalIds = useMemo(() => {
    const ids = new Set<string>();
    queue.forEach((ticket) => {
      if (ticket.externalService !== externalService) return;
      if (ticket.externalServiceId) {
        ids.add(String(ticket.externalServiceId));
      }
      if (ticket.ticketId) {
        ids.add(String(ticket.ticketId));
      }
    });
    return ids;
  }, [queue, externalService]);

  const visibleExternalTickets = useMemo(() => {
    return externalTickets.filter(
      (ticket) =>
        !existingExternalIds.has(ticket.id) &&
        !existingExternalIds.has(ticket.key),
    );
  }, [existingExternalIds, externalTickets]);

  const isTicketEstimated = (ticket: ExternalTicketSummary) => {
    if (jiraEnabled || linearEnabled) {
      return ticket.storyPoints !== null && ticket.storyPoints !== undefined;
    }
    if (githubEnabled) {
      return ticket.labels?.some((label) => isPointsLabel(label)) ?? false;
    }
    return false;
  };

  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  const selectAllTickets = () => {
    setSelectedTicketIds(new Set(visibleExternalTickets.map((t) => t.id)));
  };

  const deselectAllTickets = () => {
    setSelectedTicketIds(new Set());
  };

  const selectUnestimatedTickets = () => {
    const unestimated = visibleExternalTickets
      .filter((ticket) => !isTicketEstimated(ticket))
      .map((ticket) => ticket.id);
    setSelectedTicketIds(new Set(unestimated));
  };

  const importSelectedTickets = () => {
    const selectedTickets = externalTickets.filter((ticket) =>
      selectedTicketIds.has(ticket.id),
    );
    const ticketsToImport = selectedTickets.filter(
      (ticket) =>
        !existingExternalIds.has(ticket.id) &&
        !existingExternalIds.has(ticket.key),
    );

    if (ticketsToImport.length === 0) {
      handleError("All selected tickets are already in the queue.", onError);
      return;
    }

    ticketsToImport.forEach((ticket) => {
      const rawDescription =
        typeof ticket.description === "string" ? ticket.description.trim() : "";
      onAddTicket({
        ticketId: ticket.key,
        title: ticket.title,
        description: clampTicketDescription(rawDescription),
        status: "pending",
        externalService,
        externalServiceId: ticket.id,
        externalServiceMetadata: ticket.metadata,
      });
    });

    setSelectedTicketIds(new Set());
    resetProviderImport();
  };

  const hasLoadedTickets = visibleExternalTickets.length > 0;
  const selectedCount = selectedTicketIds.size;
  const canManageExternal = externalEnabled && canManageQueue;

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
                    setShowProviderImport(true);
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
                    resetProviderImport();
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

        <AnimatePresence>
          {externalEnabled && showProviderImport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      Import from {providerName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select a {externalLabels.board.toLowerCase()} to load
                      tickets, then choose which ones to add to the queue.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(boardsQuery.isLoading || ticketsQuery.isFetching) && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading
                      </div>
                    )}
                    <Button
                      onClick={resetProviderImport}
                      variant="unstyled"
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {!canManageQueue && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Only moderators can import tickets from {providerName}.
                  </p>
                )}

                {canManageExternal && (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        {externalLabels.board}
                        <Select
                          value={selectedBoardId}
                          onValueChange={setSelectedBoardId}
                          disabled={boardsQuery.isLoading}
                          data-testid="queue-import-board"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          options={boardOptions}
                        />
                      </label>

                      {externalLabels.supportsSprint && (
                        <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                          {externalLabels.sprint}
                          <Select
                            value={selectedSprintId}
                            onValueChange={setSelectedSprintId}
                            disabled={!selectedBoardId}
                            data-testid="queue-import-sprint"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            options={sprintOptions}
                          />
                        </label>
                      )}
                    </div>

                    {boardsQuery.error instanceof Error && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {boardsQuery.error.message}
                      </p>
                    )}
                    {sprintsQuery.error instanceof Error && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {sprintsQuery.error.message}
                      </p>
                    )}
                    {ticketsQuery.error instanceof Error && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {ticketsQuery.error.message}
                      </p>
                    )}

                    {!selectedBoardId && (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        A {externalLabels.board.toLowerCase()} must be selected
                        before loading tickets.
                      </p>
                    )}

                    {selectedBoardId && (
                      <>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="Search tickets..."
                            value={ticketSearch}
                            onChange={(e) => setTicketSearch(e.target.value)}
                            data-testid="queue-import-search"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          />
                          <Button
                            onClick={selectAllTickets}
                            disabled={!hasLoadedTickets}
                            variant="unstyled"
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                          >
                            Select all
                          </Button>
                          <Button
                            onClick={deselectAllTickets}
                            disabled={!hasLoadedTickets}
                            variant="unstyled"
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                          >
                            Deselect all
                          </Button>
                          <Button
                            onClick={selectUnestimatedTickets}
                            disabled={!hasLoadedTickets}
                            variant="unstyled"
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
                          >
                            Select unestimated
                          </Button>
                        </div>

                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                          {ticketsQuery.isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading tickets...
                            </div>
                          ) : visibleExternalTickets.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-500">
                              No tickets found for this selection.
                            </p>
                          ) : (
                            visibleExternalTickets.map((ticket) => {
                              const isSelected = selectedTicketIds.has(
                                ticket.id,
                              );
                              const estimated = isTicketEstimated(ticket);

                              return (
                                <label
                                  key={ticket.id}
                                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                                    isSelected
                                      ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600"
                                  } `}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      toggleTicketSelection(ticket.id)
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className="flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        {ticket.key}
                                      </span>
                                      {ticket.status && (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                          {ticket.status}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                      {ticket.title}
                                    </p>
                                    {ticket.description && (
                                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 break-all">
                                        {ticket.description}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                      {ticket.assignee && (
                                        <span>Assignee: {ticket.assignee}</span>
                                      )}
                                      {jiraEnabled || linearEnabled ? (
                                        <span>
                                          Story Points:{" "}
                                          {ticket.storyPoints !== null &&
                                          ticket.storyPoints !== undefined
                                            ? ticket.storyPoints
                                            : "Not set"}
                                        </span>
                                      ) : (
                                        <span>
                                          Points label:{" "}
                                          {estimated ? "Set" : "Not set"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            onClick={importSelectedTickets}
                            disabled={selectedCount === 0}
                            data-testid="queue-import-confirm"
                            variant="unstyled"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                          >
                            Import selected ({selectedCount})
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  void lookupExternalTicket(
                    linkLookupKey,
                    provider,
                    setLinkPreview,
                    setIsFetchingLink,
                  );
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
