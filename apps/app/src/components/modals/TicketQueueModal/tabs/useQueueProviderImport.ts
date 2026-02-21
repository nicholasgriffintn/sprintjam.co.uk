import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { ExternalTicketSummary, TicketQueueItem } from "@/types";
import { handleError } from "@/utils/error";
import {
  fetchBoardsByProvider,
  fetchSprintsByProvider,
  fetchTicketsByProvider,
  getProviderLabels,
  type QueueProvider,
} from "./queue-provider";
import {
  clampTicketDescription,
  isTicketEstimated,
  normalizeExternalTicket,
} from "./queue-import-utils";

interface UseQueueProviderImportOptions {
  activeProvider: QueueProvider | null;
  externalService: "none" | "jira" | "linear" | "github";
  roomKey: string;
  userName: string;
  canManageQueue: boolean;
  queue: TicketQueueItem[];
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  onError?: (message: string) => void;
}

export interface QueueProviderImportState {
  activeProvider: QueueProvider | null;
  showProviderImport: boolean;
  externalEnabled: boolean;
  canManageQueue: boolean;
  canManageExternal: boolean;
  externalLabels: ReturnType<typeof getProviderLabels>;
  providerName: string;
  selectedBoardId: string;
  selectedSprintId: string;
  ticketSearch: string;
  boardOptions: Array<{ label: string; value: string }>;
  sprintOptions: Array<{ label: string; value: string }>;
  boardsLoading: boolean;
  ticketsLoading: boolean;
  ticketsFetching: boolean;
  boardsError: string | null;
  sprintsError: string | null;
  ticketsError: string | null;
  visibleExternalTickets: ExternalTicketSummary[];
  selectedTicketIds: Set<string>;
  hasLoadedTickets: boolean;
  selectedCount: number;
  isTicketEstimated: (ticket: ExternalTicketSummary) => boolean;
  setSelectedBoardId: (value: string) => void;
  setSelectedSprintId: (value: string) => void;
  setTicketSearch: (value: string) => void;
  toggleTicketSelection: (ticketId: string) => void;
  selectAllTickets: () => void;
  deselectAllTickets: () => void;
  selectUnestimatedTickets: () => void;
  importSelectedTickets: () => void;
  openProviderImport: () => void;
  resetProviderImport: () => void;
}

export function useQueueProviderImport({
  activeProvider,
  externalService,
  roomKey,
  userName,
  canManageQueue,
  queue,
  onAddTicket,
  onError,
}: UseQueueProviderImportOptions): QueueProviderImportState {
  const [showProviderImport, setShowProviderImport] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(
    () => new Set(),
  );

  const externalEnabled = activeProvider !== null;
  const canManageExternal = externalEnabled && canManageQueue;
  const externalLabels = getProviderLabels(activeProvider);
  const providerName = externalLabels.name;

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

  const visibleExternalTickets = useMemo(
    () =>
      externalTickets.filter(
        (ticket) =>
          !existingExternalIds.has(ticket.id) &&
          !existingExternalIds.has(ticket.key),
      ),
    [existingExternalIds, externalTickets],
  );

  const hasLoadedTickets = visibleExternalTickets.length > 0;
  const selectedCount = selectedTicketIds.size;

  const isSelectedTicketEstimated = (ticket: ExternalTicketSummary): boolean =>
    activeProvider ? isTicketEstimated(ticket, activeProvider) : false;

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
    if (!activeProvider) {
      setSelectedTicketIds(new Set());
      return;
    }

    const unestimated = visibleExternalTickets
      .filter((ticket) => !isTicketEstimated(ticket, activeProvider))
      .map((ticket) => ticket.id);

    setSelectedTicketIds(new Set(unestimated));
  };

  const resetProviderImport = () => {
    setShowProviderImport(false);
    setSelectedBoardId("");
    setSelectedSprintId("");
    setTicketSearch("");
    setSelectedTicketIds(new Set());
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

  return {
    activeProvider,
    showProviderImport,
    externalEnabled,
    canManageQueue,
    canManageExternal,
    externalLabels,
    providerName,
    selectedBoardId,
    selectedSprintId,
    ticketSearch,
    boardOptions,
    sprintOptions,
    boardsLoading: boardsQuery.isLoading,
    ticketsLoading: ticketsQuery.isLoading,
    ticketsFetching: ticketsQuery.isFetching,
    boardsError:
      boardsQuery.error instanceof Error ? boardsQuery.error.message : null,
    sprintsError:
      sprintsQuery.error instanceof Error ? sprintsQuery.error.message : null,
    ticketsError:
      ticketsQuery.error instanceof Error ? ticketsQuery.error.message : null,
    visibleExternalTickets,
    selectedTicketIds,
    hasLoadedTickets,
    selectedCount,
    isTicketEstimated: isSelectedTicketEstimated,
    setSelectedBoardId,
    setSelectedSprintId,
    setTicketSearch,
    toggleTicketSelection,
    selectAllTickets,
    deselectAllTickets,
    selectUnestimatedTickets,
    importSelectedTickets,
    openProviderImport: () => setShowProviderImport(true),
    resetProviderImport,
  };
}
