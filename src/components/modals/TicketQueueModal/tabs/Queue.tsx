import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Link2, Plus, Loader2, Trash2 } from "lucide-react";

import type {
  ExternalBoardOption,
  ExternalSprintOption,
  ExternalTicketSummary,
  TicketQueueItem,
  TicketMetadata,
} from "@/types";
import {
  fetchJiraBoardIssues,
  fetchJiraBoards,
  fetchJiraSprints,
  fetchJiraTicket,
} from "@/lib/jira-service";
import {
  fetchLinearCycles,
  fetchLinearIssues,
  fetchLinearTeams,
  fetchLinearIssue,
} from "@/lib/linear-service";
import {
  fetchGithubIssue,
  fetchGithubMilestones,
  fetchGithubRepoIssues,
  fetchGithubRepos,
} from "@/lib/github-service";
import { handleError } from "@/utils/error";
import { getJiraMetadata } from "@/utils/jira";
import { getLinearMetadata } from "@/utils/linear";
import { getGithubMetadata } from "@/utils/github";
import { ExternalServiceBadge } from "@/components/ExternalServiceBadge";

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
  const [showJiraForm, setShowJiraForm] = useState(false);
  const [showLinearForm, setShowLinearForm] = useState(false);
  const [showGithubForm, setShowGithubForm] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");

  const [jiraLookupKey, setJiraLookupKey] = useState("");
  const [jiraPreview, setJiraPreview] = useState<TicketMetadata | null>(null);
  const [isFetchingJira, setIsFetchingJira] = useState(false);
  const [isSavingJiraAdd, setIsSavingJiraAdd] = useState(false);

  const [linearLookupKey, setLinearLookupKey] = useState("");
  const [linearPreview, setLinearPreview] = useState<TicketMetadata | null>(
    null,
  );
  const [isFetchingLinear, setIsFetchingLinear] = useState(false);
  const [isSavingLinearAdd, setIsSavingLinearAdd] = useState(false);
  const [githubLookupKey, setGithubLookupKey] = useState("");
  const [githubPreview, setGithubPreview] = useState<TicketMetadata | null>(
    null,
  );
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [isSavingGithubAdd, setIsSavingGithubAdd] = useState(false);

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

  const jiraEnabled = externalService === "jira";
  const linearEnabled = externalService === "linear";
  const githubEnabled = externalService === "github";
  const externalEnabled = externalService !== "none";

  const externalLabels = useMemo(() => {
    if (jiraEnabled) {
      return { board: "Board", sprint: "Sprint", supportsSprint: true };
    }
    if (linearEnabled) {
      return { board: "Team", sprint: "Cycle", supportsSprint: true };
    }
    if (githubEnabled) {
      return { board: "Repository", sprint: "Milestone", supportsSprint: true };
    }
    return { board: "Board", sprint: "Sprint", supportsSprint: false };
  }, [githubEnabled, jiraEnabled, linearEnabled]);

  const providerName = jiraEnabled
    ? "Jira"
    : linearEnabled
      ? "Linear"
      : githubEnabled
        ? "GitHub"
        : "External";

  const ticketLookup = useMutation({
    mutationKey: ["ticket-lookup", roomKey, userName],
    mutationFn: async (variables: {
      provider: "jira" | "linear" | "github";
      key: string;
    }) => {
      if (variables.provider === "jira") {
        return fetchJiraTicket(variables.key, { roomKey, userName });
      }
      if (variables.provider === "linear") {
        return fetchLinearIssue(variables.key, { roomKey, userName });
      }
      return fetchGithubIssue(variables.key, { roomKey, userName });
    },
  });

  useEffect(() => {
    setSelectedBoardId("");
    setSelectedSprintId("");
    setTicketSearch("");
    setSelectedTicketIds(new Set());
  }, [externalService]);

  useEffect(() => {
    setSelectedSprintId("");
    setTicketSearch("");
    setSelectedTicketIds(new Set());
  }, [selectedBoardId]);

  const boardsQuery = useQuery({
    queryKey: ["external-boards", externalService, roomKey, userName],
    enabled: externalEnabled && canManageQueue,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<ExternalBoardOption[]> => {
      if (jiraEnabled) {
        const boards = await fetchJiraBoards(roomKey, userName);
        return boards.map((board) => ({
          id: board.id,
          name: board.name,
        }));
      }
      if (linearEnabled) {
        const teams = await fetchLinearTeams(roomKey, userName);
        return teams.map((team) => ({
          id: team.id,
          name: team.name,
          key: team.key,
        }));
      }
      if (githubEnabled) {
        const repos = await fetchGithubRepos(roomKey, userName);
        return repos.map((repo) => ({
          id: repo.fullName,
          name: repo.fullName,
          key: repo.name,
        }));
      }
      return [];
    },
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
      externalLabels.supportsSprint &&
      Boolean(selectedBoardId) &&
      canManageQueue,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<ExternalSprintOption[]> => {
      if (jiraEnabled) {
        const sprints = await fetchJiraSprints(
          selectedBoardId,
          roomKey,
          userName,
        );
        return sprints.map((sprint) => ({
          id: sprint.id,
          name: sprint.name,
          state: sprint.state,
          startDate: sprint.startDate ?? null,
          endDate: sprint.endDate ?? null,
        }));
      }
      if (linearEnabled) {
        const cycles = await fetchLinearCycles(
          selectedBoardId,
          roomKey,
          userName,
        );
        return cycles.map((cycle) => ({
          id: cycle.id,
          name: cycle.name || `Cycle ${cycle.number}`,
          number: cycle.number,
          startDate: cycle.startsAt ?? null,
          endDate: cycle.endsAt ?? null,
        }));
      }
      if (githubEnabled) {
        const milestones = await fetchGithubMilestones(
          selectedBoardId,
          roomKey,
          userName,
        );
        return milestones.map((milestone) => ({
          id: String(milestone.number),
          name: milestone.title,
          number: milestone.number,
          state: milestone.state,
        }));
      }
      return [];
    },
  });

  const ticketLimit = selectedSprintId ? null : 50;
  const selectedSprint = useMemo(
    () =>
      (sprintsQuery.data ?? []).find(
        (sprint) => sprint.id === selectedSprintId,
      ),
    [selectedSprintId, sprintsQuery.data],
  );

  const ticketsQuery = useQuery({
    queryKey: [
      "external-tickets",
      externalService,
      selectedBoardId,
      selectedSprintId,
      ticketLimit,
      roomKey,
      userName,
    ],
    enabled: externalEnabled && Boolean(selectedBoardId) && canManageQueue,
    staleTime: 1000 * 20,
    queryFn: async (): Promise<TicketMetadata[]> => {
      if (jiraEnabled) {
        return fetchJiraBoardIssues(
          selectedBoardId,
          { sprintId: selectedSprintId, limit: ticketLimit },
          roomKey,
          userName,
        );
      }
      if (linearEnabled) {
        return fetchLinearIssues(
          selectedBoardId,
          { cycleId: selectedSprintId, limit: ticketLimit },
          roomKey,
          userName,
        );
      }
      if (githubEnabled) {
        return fetchGithubRepoIssues(
          selectedBoardId,
          {
            milestoneNumber: selectedSprint?.number ?? null,
            limit: ticketLimit,
          },
          roomKey,
          userName,
        );
      }
      return [];
    },
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
    provider: "jira" | "linear" | "github",
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
      handleError(
        err instanceof Error
          ? err.message
          : `Failed to fetch ${
              provider === "jira"
                ? "Jira ticket"
                : provider === "linear"
                  ? "Linear issue"
                  : "GitHub issue"
            }`,
        onError,
      );
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromExternal = async (
    provider: "jira" | "linear" | "github",
    preview: TicketMetadata | null,
    setSaving: (saving: boolean) => void,
    reset: () => void,
  ) => {
    if (!preview) {
      handleError(
        `Fetch a ${
          provider === "jira"
            ? "Jira ticket"
            : provider === "linear"
              ? "Linear issue"
              : "GitHub issue"
        } before adding it to the queue.`,
        onError,
      );
      return;
    }

    setSaving(true);
    try {
      onAddTicket({
        ticketId: preview.key || preview.identifier,
        title: preview.summary || preview.title,
        description: preview.description || undefined,
        status: "pending",
        externalService: provider,
        externalServiceId: preview.id,
        externalServiceMetadata: preview,
      });
      reset();
    } catch (err) {
      handleError(
        err instanceof Error
          ? err.message
          : `Failed to add ${provider === "jira" ? "Jira ticket" : "Linear issue"}`,
        onError,
      );
    } finally {
      setSaving(false);
    }
  };

  const startLinkTicket = (ticket: TicketQueueItem) => {
    setLinkingTicketId(ticket.id);
    const jiraMeta = getJiraMetadata(ticket);
    const linearMeta = getLinearMetadata(ticket);
    const githubMeta = getGithubMetadata(ticket);
    const activeMeta = jiraEnabled
      ? jiraMeta
      : linearEnabled
        ? linearMeta
        : githubMeta;
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

  const handleApplyLink = async (provider: "jira" | "linear" | "github") => {
    if (!linkingTicketId || !linkPreview) {
      handleError(
        `Fetch a ${
          provider === "jira"
            ? "Jira ticket"
            : provider === "linear"
              ? "Linear issue"
              : "GitHub issue"
        } before linking.`,
        onError,
      );
      return;
    }

    setIsSavingLink(true);
    try {
      onUpdateTicket(linkingTicketId, {
        ticketId:
          linkPreview.key ||
          (linkPreview as { identifier?: string }).identifier,
        title: linkPreview.summary || (linkPreview as { title?: string }).title,
        description: linkPreview.description || undefined,
        externalService: provider,
        externalServiceId: linkPreview.id,
        externalServiceMetadata: linkPreview,
      });
      cancelLinking();
    } catch (err) {
      handleError(
        err instanceof Error
          ? err.message
          : `Failed to link ${provider === "jira" ? "Jira ticket" : "Linear issue"}`,
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
      ticket.description ??
      (ticket as { body?: string }).body ??
      undefined;
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

  const filteredExternalTickets = useMemo(() => {
    if (!ticketSearch.trim()) {
      return externalTickets;
    }
    const query = ticketSearch.trim().toLowerCase();
    return externalTickets.filter((ticket) => {
      const haystack = [
        ticket.key,
        ticket.title,
        ticket.description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [externalTickets, ticketSearch]);

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
    return filteredExternalTickets.filter(
      (ticket) =>
        !existingExternalIds.has(ticket.id) &&
        !existingExternalIds.has(ticket.key),
    );
  }, [existingExternalIds, filteredExternalTickets]);

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
      handleError(
        "All selected tickets are already in the queue.",
        onError,
      );
      return;
    }

    ticketsToImport.forEach((ticket) => {
      onAddTicket({
        ticketId: ticket.key,
        title: ticket.title,
        description: ticket.description || undefined,
        status: "pending",
        externalService,
        externalServiceId: ticket.id,
        externalServiceMetadata: ticket.metadata,
      });
    });

    setSelectedTicketIds(new Set());
  };

  const renderPreview = (
    ticket: TicketMetadata | null,
    provider: "jira" | "linear" | "github",
  ) => {
    if (!ticket) return null;
    const isJira = provider === "jira";
    const isLinear = provider === "linear";
    const shellClass = isJira
      ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      : isLinear
        ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20";
    const chipClass = isJira
      ? "bg-blue-600"
      : isLinear
        ? "bg-purple-600"
        : "bg-slate-600";
    const statusClass = isJira
      ? "text-blue-700 dark:text-blue-200"
      : isLinear
        ? "text-purple-700 dark:text-purple-200"
        : "text-slate-700 dark:text-slate-200";

    return (
      <div className={`mt-3 rounded-lg border p-3 text-xs ${shellClass}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded ${chipClass} px-2 py-0.5 font-semibold text-white`}
            >
              {ticket.key || (ticket as { identifier?: string }).identifier}
            </span>
            <span className="font-semibold text-slate-800 dark:text-white">
              {ticket.summary || (ticket as { title?: string }).title}
            </span>
          </div>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}
          >
            {ticket.status || "Unknown"}
          </span>
        </div>
        {ticket.description && (
          <p className="mt-2 line-clamp-2 text-slate-600 dark:text-slate-300">
            {ticket.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
          {ticket.assignee && <span>Assignee: {ticket.assignee}</span>}
          {isJira ? (
            <span>
              Story Points:{" "}
              {ticket.storyPoints !== null && ticket.storyPoints !== undefined
                ? ticket.storyPoints
                : "Not set"}
            </span>
          ) : (
            <span>
              Estimate:{" "}
              {(ticket as { estimate?: number }).estimate !== undefined &&
              (ticket as { estimate?: number }).estimate !== null
                ? (ticket as { estimate?: number }).estimate
                : "Not set"}
            </span>
          )}
        </div>
      </div>
    );
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
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {currentTicket.description}
              </p>
            )}
          </div>
        </div>
      )}

      {externalEnabled && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Import from {providerName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a {externalLabels.board.toLowerCase()} to load tickets,
                then choose which ones to add to the queue.
              </p>
            </div>
            {(boardsQuery.isLoading || ticketsQuery.isFetching) && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading
              </div>
            )}
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
                  <select
                    value={selectedBoardId}
                    onChange={(e) => setSelectedBoardId(e.target.value)}
                    disabled={boardsQuery.isLoading}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="">
                      {boardsQuery.isLoading
                        ? `Loading ${externalLabels.board}...`
                        : `Select ${externalLabels.board}`}
                    </option>
                    {(boardsQuery.data ?? []).map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                        {board.key ? ` (${board.key})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {externalLabels.supportsSprint && (
                  <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {externalLabels.sprint}
                    <select
                      value={selectedSprintId}
                      onChange={(e) => setSelectedSprintId(e.target.value)}
                      disabled={!selectedBoardId}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="">
                        Select {externalLabels.sprint} (optional)
                      </option>
                      {(sprintsQuery.data ?? []).map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name}
                          {sprint.state ? ` (${sprint.state})` : ""}
                        </option>
                      ))}
                    </select>
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
                  A {externalLabels.board.toLowerCase()} must be selected before
                  loading tickets.
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
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                    <button
                      onClick={selectAllTickets}
                      disabled={!hasLoadedTickets}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      Select all
                    </button>
                    <button
                      onClick={deselectAllTickets}
                      disabled={!hasLoadedTickets}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      Deselect all
                    </button>
                    <button
                      onClick={selectUnestimatedTickets}
                      disabled={!hasLoadedTickets}
                      className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
                    >
                      Select unestimated
                    </button>
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
                        const isSelected = selectedTicketIds.has(ticket.id);
                        const estimated = isTicketEstimated(ticket);

                        return (
                          <label
                            key={ticket.id}
                            className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                              isSelected
                                ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600"
                            } cursor-pointer`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTicketSelection(ticket.id)}
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
                                <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
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
                                    Points label: {estimated ? "Set" : "Not set"}
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
                    <button
                      onClick={importSelectedTickets}
                      disabled={selectedCount === 0}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Import selected ({selectedCount})
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Pending Tickets ({pendingTickets.length})
          </h3>
          {canManageQueue && (
            <div className="flex flex-wrap items-center gap-2">
              {jiraEnabled && (
                <button
                  onClick={() => {
                    setShowJiraForm(!showJiraForm);
                    setShowLinearForm(false);
                    setJiraPreview(null);
                  }}
                  data-testid="queue-add-jira-button"
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Link2 className="h-3 w-3" />
                  Add Jira Ticket
                </button>
              )}
              {linearEnabled && (
                <button
                  onClick={() => {
                    setShowLinearForm(!showLinearForm);
                    setShowJiraForm(false);
                    setShowGithubForm(false);
                    setLinearPreview(null);
                  }}
                  data-testid="queue-add-linear-button"
                  className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  <Link2 className="h-3 w-3" />
                  Add Linear Issue
                </button>
              )}
              {githubEnabled && (
                <button
                  onClick={() => {
                    setShowGithubForm(!showGithubForm);
                    setShowJiraForm(false);
                    setShowLinearForm(false);
                    setGithubPreview(null);
                  }}
                  data-testid="queue-add-github-button"
                  className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Link2 className="h-3 w-3" />
                  Add GitHub Issue
                </button>
              )}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                data-testid="queue-toggle-add"
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
              >
                <Plus className="h-3 w-3" />
                Add Ticket
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="text"
                  placeholder="Ticket title"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                  onKeyDown={(e) => e.key === "Enter" && handleAddTicket()}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTicketDescription}
                  onChange={(e) => setNewTicketDescription(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTicket}
                    disabled={!newTicketTitle.trim()}
                    data-testid="queue-add-confirm"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTicketTitle("");
                      setNewTicketDescription("");
                    }}
                    className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showJiraForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                  Jira Ticket Key
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="PROJECT-123"
                    value={jiraLookupKey}
                    onChange={(e) => setJiraLookupKey(e.target.value)}
                    data-testid="queue-jira-input"
                    className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm dark:border-blue-700 dark:bg-blue-900/30"
                  />
                  <button
                    onClick={() =>
                      lookupExternalTicket(
                        jiraLookupKey,
                        "jira",
                        setJiraPreview,
                        setIsFetchingJira,
                      )
                    }
                    disabled={isFetchingJira || !jiraLookupKey.trim()}
                    data-testid="queue-jira-fetch"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isFetchingJira && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Fetch
                  </button>
                </div>
                {renderPreview(jiraPreview, "jira")}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() =>
                      handleAddFromExternal(
                        "jira",
                        jiraPreview,
                        setIsSavingJiraAdd,
                        () => {
                          setJiraLookupKey("");
                          setJiraPreview(null);
                          setShowJiraForm(false);
                        },
                      )
                    }
                    disabled={!jiraPreview || isSavingJiraAdd}
                    data-testid="queue-jira-add"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {isSavingJiraAdd && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Add to Queue
                  </button>
                  <button
                    onClick={() => {
                      setShowJiraForm(false);
                      setJiraLookupKey("");
                      setJiraPreview(null);
                    }}
                    className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLinearForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-lg border-2 border-dashed border-purple-200 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/20">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-purple-800 dark:text-purple-200">
                  Linear Issue ID or Key
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="TEAM-123"
                    value={linearLookupKey}
                    onChange={(e) => setLinearLookupKey(e.target.value)}
                    data-testid="queue-linear-input"
                    className="flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm dark:border-purple-700 dark:bg-purple-900/30"
                  />
                  <button
                    onClick={() =>
                      lookupExternalTicket(
                        linearLookupKey,
                        "linear",
                        setLinearPreview,
                        setIsFetchingLinear,
                      )
                    }
                    disabled={isFetchingLinear || !linearLookupKey.trim()}
                    data-testid="queue-linear-fetch"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isFetchingLinear && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Fetch
                  </button>
                </div>
                {renderPreview(linearPreview, "linear")}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() =>
                      handleAddFromExternal(
                        "linear",
                        linearPreview,
                        setIsSavingLinearAdd,
                        () => {
                          setLinearLookupKey("");
                          setLinearPreview(null);
                          setShowLinearForm(false);
                        },
                      )
                    }
                    disabled={!linearPreview || isSavingLinearAdd}
                    data-testid="queue-linear-add"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50"
                  >
                    {isSavingLinearAdd && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Add to Queue
                  </button>
                  <button
                    onClick={() => {
                      setShowLinearForm(false);
                      setLinearLookupKey("");
                      setLinearPreview(null);
                    }}
                    className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showGithubForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/20">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  GitHub Issue URL or Key
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="owner/repo#123 or issue URL"
                    value={githubLookupKey}
                    onChange={(e) => setGithubLookupKey(e.target.value)}
                    data-testid="queue-github-input"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/30"
                  />
                  <button
                    onClick={() =>
                      lookupExternalTicket(
                        githubLookupKey,
                        "github",
                        setGithubPreview,
                        setIsFetchingGithub,
                      )
                    }
                    disabled={isFetchingGithub || !githubLookupKey.trim()}
                    data-testid="queue-github-fetch"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isFetchingGithub && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Fetch
                  </button>
                </div>
                {renderPreview(githubPreview, "github")}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() =>
                      handleAddFromExternal(
                        "github",
                        githubPreview,
                        setIsSavingGithubAdd,
                        () => {
                          setGithubLookupKey("");
                          setGithubPreview(null);
                          setShowGithubForm(false);
                        },
                      )
                    }
                    disabled={!githubPreview || isSavingGithubAdd}
                    data-testid="queue-github-add"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {isSavingGithubAdd && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Add to Queue
                  </button>
                  <button
                    onClick={() => {
                      setShowGithubForm(false);
                      setGithubLookupKey("");
                      setGithubPreview(null);
                    }}
                    className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {pendingTickets.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No pending tickets
            </p>
          ) : (
            pendingTickets.map((ticket) => {
              const jiraMetadata = getJiraMetadata(ticket);
              const linearMetadata = getLinearMetadata(ticket);
              const githubMetadata = getGithubMetadata(ticket);
              const isLinking = linkingTicketId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start gap-2">
                    {canManageQueue && (
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {ticket.ticketId}
                        </span>
                        {renderBadge(ticket)}
                        {ticket.title && (
                          <span className="text-sm">{ticket.title}</span>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
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
                      <div className="flex items-center gap-1">
                        {onSelectTicket && (
                          <button
                            onClick={() => {
                              onSelectTicket(ticket.id);
                            }}
                            data-testid={`queue-start-voting-${ticket.id}`}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/20"
                          >
                            Start Voting
                          </button>
                        )}
                        {externalService !== "none" &&
                          ticket.externalService === "none" && (
                          <button
                            onClick={() =>
                              isLinking
                                ? cancelLinking()
                                : startLinkTicket(ticket)
                            }
                            data-testid={`queue-link-toggle-${ticket.id}`}
                            className="rounded-lg px-2 py-1 text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-900/40"
                          >
                            {isLinking
                              ? "Close"
                              : `Link ${
                                  externalService === "jira"
                                    ? "Jira"
                                    : externalService === "linear"
                                      ? "Linear"
                                      : "GitHub"
                                }`}
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteTicket(ticket.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isLinking && externalService !== "none" && (
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
                            onChange={(e) => setLinkLookupKey(e.target.value)}
                            placeholder={
                              externalService === "jira"
                                ? "PROJECT-123"
                                : externalService === "linear"
                                  ? "TEAM-123"
                                  : "owner/repo#123"
                            }
                            data-testid={`queue-link-${externalService}-input-${ticket.id}`}
                            className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm dark:border-blue-700 dark:bg-blue-900/30"
                          />
                          <button
                            onClick={() =>
                              lookupExternalTicket(
                                linkLookupKey,
                                externalService,
                                setLinkPreview,
                                setIsFetchingLink,
                              )
                            }
                            disabled={isFetchingLink || !linkLookupKey.trim()}
                            data-testid={`queue-link-${externalService}-fetch-${ticket.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isFetchingLink && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Fetch
                          </button>
                        </div>
                        {renderPreview(
                          linkPreview,
                          externalService as "jira" | "linear" | "github",
                        )}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              handleApplyLink(
                                externalService as "jira" | "linear" | "github",
                              )
                            }
                            disabled={!linkPreview || isSavingLink}
                            data-testid={`queue-link-${externalService}-save-${ticket.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            {isSavingLink && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Save Link
                          </button>
                          <button
                            onClick={cancelLinking}
                            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
