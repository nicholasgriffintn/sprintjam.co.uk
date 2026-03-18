import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  ExternalTicketMetadata,
  LinkedTicket,
  OAuthProvider,
  TeamIntegrationStatus,
} from "@sprintjam/types";
import {
  ArrowUpRight,
  Github,
  Link as LinkIcon,
  Search,
  X,
} from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { cn } from "@/lib/cn";
import { HttpError } from '@/lib/errors';
import {
  listTeamIntegrationBoards,
  listTeamIntegrationSprints,
  listTeamIntegrations,
  searchTeamIntegrationTickets,
} from "@/lib/workspace-service";

type ConnectedProvider = "jira" | "linear" | "github";

interface ProviderConfig {
  label: string;
  boardLabel: string;
  sprintLabel: string;
  Icon: typeof LinkIcon;
  tabClassName: string;
}

const PROVIDER_CONFIG: Record<ConnectedProvider, ProviderConfig> = {
  jira: {
    label: "Jira",
    boardLabel: "Board",
    sprintLabel: "Sprint",
    Icon: LinkIcon,
    tabClassName:
      "data-[active]:border-sky-300 data-[active]:bg-sky-50 data-[active]:text-sky-900 dark:data-[active]:border-sky-400/40 dark:data-[active]:bg-sky-950/30 dark:data-[active]:text-sky-100",
  },
  linear: {
    label: "Linear",
    boardLabel: "Team",
    sprintLabel: "Cycle",
    Icon: LinkIcon,
    tabClassName:
      "data-[active]:border-violet-300 data-[active]:bg-violet-50 data-[active]:text-violet-900 dark:data-[active]:border-violet-400/40 dark:data-[active]:bg-violet-950/30 dark:data-[active]:text-violet-100",
  },
  github: {
    label: "GitHub",
    boardLabel: "Repository",
    sprintLabel: "Milestone",
    Icon: Github,
    tabClassName:
      "data-[active]:border-slate-300 data-[active]:bg-slate-100 data-[active]:text-slate-900 dark:data-[active]:border-slate-400/30 dark:data-[active]:bg-slate-800 dark:data-[active]:text-white",
  },
};

function isConnectedProvider(value: OAuthProvider): value is ConnectedProvider {
  return value === "jira" || value === "linear" || value === "github";
}

function getConnectedProviders(
  statuses: TeamIntegrationStatus[],
): ConnectedProvider[] {
  return statuses
    .filter(
      (
        status,
      ): status is TeamIntegrationStatus & { provider: ConnectedProvider } =>
        isConnectedProvider(status.provider) && Boolean(status.connected),
    )
    .map((status) => status.provider);
}

function normalizeTicket(
  provider: ConnectedProvider,
  ticket: ExternalTicketMetadata,
): LinkedTicket {
  const rawKey =
    ticket.key ??
    (ticket as { identifier?: string }).identifier ??
    ticket.id ??
    "";
  const key = String(rawKey);

  return {
    id: String(ticket.id ?? key),
    key,
    title:
      ticket.summary ??
      (ticket as { title?: string }).title ??
      (ticket as { name?: string }).name ??
      key,
    url: ticket.url ?? (ticket as { html_url?: string }).html_url,
    provider,
  };
}

function isLinked(
  linkedTickets: LinkedTicket[],
  provider: ConnectedProvider,
  ticket: ExternalTicketMetadata,
): boolean {
  const normalized = normalizeTicket(provider, ticket);
  return linkedTickets.some(
    (linked) =>
      linked.provider === normalized.provider &&
      (linked.id === normalized.id || linked.key === normalized.key),
  );
}

export function StandupTicketLinker({
  teamId,
  linkedTickets,
  onChange,
  disabled = false,
}: {
  teamId: number;
  linkedTickets: LinkedTicket[];
  onChange: (tickets: LinkedTicket[]) => void;
  disabled?: boolean;
}) {
  const [activeProvider, setActiveProvider] =
    useState<ConnectedProvider | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [search, setSearch] = useState("");

  const integrationsQuery = useQuery({
    queryKey: ["standup-team-integrations", teamId],
    queryFn: () => listTeamIntegrations(teamId),
    staleTime: 60_000,
  });

  const connectedProviders = useMemo(
    () => getConnectedProviders(integrationsQuery.data ?? []),
    [integrationsQuery.data],
  );

  useEffect(() => {
    if (activeProvider && connectedProviders.includes(activeProvider)) {
      return;
    }

    setActiveProvider(connectedProviders[0] ?? null);
  }, [activeProvider, connectedProviders]);

  useEffect(() => {
    setSelectedBoardId("");
    setSelectedSprintId("");
    setSearch("");
  }, [activeProvider]);

  useEffect(() => {
    setSelectedSprintId("");
    setSearch("");
  }, [selectedBoardId]);

  const boardsQuery = useQuery({
    queryKey: ["standup-ticket-boards", teamId, activeProvider],
    enabled: activeProvider !== null,
    queryFn: () => listTeamIntegrationBoards(teamId, activeProvider!),
    staleTime: 60_000,
  });

  const sprintsQuery = useQuery({
    queryKey: [
      "standup-ticket-sprints",
      teamId,
      activeProvider,
      selectedBoardId,
    ],
    enabled: activeProvider !== null && selectedBoardId.length > 0,
    queryFn: () =>
      listTeamIntegrationSprints(teamId, activeProvider!, selectedBoardId),
    staleTime: 60_000,
  });

  const selectedSprint = useMemo(
    () =>
      (sprintsQuery.data ?? []).find(
        (sprint) => sprint.id === selectedSprintId,
      ) ?? null,
    [selectedSprintId, sprintsQuery.data],
  );

  const trimmedSearch = search.trim();

  const ticketsQuery = useQuery({
    queryKey: [
      "standup-ticket-results",
      teamId,
      activeProvider,
      selectedBoardId,
      selectedSprintId,
      trimmedSearch,
      selectedSprint?.name ?? null,
      selectedSprint?.number ?? null,
    ],
    enabled: activeProvider !== null && selectedBoardId.length > 0,
    queryFn: () =>
      searchTeamIntegrationTickets(teamId, activeProvider!, {
        boardId: selectedBoardId,
        sprintId: selectedSprintId || undefined,
        sprintName: selectedSprint?.name ?? undefined,
        sprintNumber: selectedSprint?.number ?? undefined,
        query: trimmedSearch || undefined,
        limit: selectedSprintId ? undefined : 20,
      }),
    staleTime: 20_000,
  });

  const config = activeProvider ? PROVIDER_CONFIG[activeProvider] : null;
  const boards = boardsQuery.data ?? [];
  const sprints = sprintsQuery.data ?? [];
  const tickets = ticketsQuery.data ?? [];

  const addTicket = (ticket: ExternalTicketMetadata) => {
    if (!activeProvider || disabled) {
      return;
    }

    const normalized = normalizeTicket(activeProvider, ticket);
    if (
      linkedTickets.some(
        (linked) =>
          linked.provider === normalized.provider &&
          (linked.id === normalized.id || linked.key === normalized.key),
      )
    ) {
      return;
    }

    onChange([...linkedTickets, normalized]);
  };

  const removeTicket = (ticketToRemove: LinkedTicket) => {
    onChange(
      linkedTickets.filter(
        (ticket) =>
          !(
            ticket.provider === ticketToRemove.provider &&
            ticket.id === ticketToRemove.id
          ),
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Link relevant tickets
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Pull tickets from your team integrations so the facilitator can jump
          from the update straight into the work item.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {linkedTickets.length ? (
            <Badge variant="success">{linkedTickets.length} linked</Badge>
          ) : null}
        </div>
      </div>

      {integrationsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Spinner size="sm" />
          <span>Loading team integrations...</span>
        </div>
      ) : null}

      {integrationsQuery.error instanceof Error ? (
        integrationsQuery.error instanceof HttpError &&
        integrationsQuery.error.status === 401 ? (
          <Alert variant="info">
            Sign in to link tickets from your team integrations.
          </Alert>
        ) : (
          <Alert variant="warning">{integrationsQuery.error.message}</Alert>
        )
      ) : null}

      {!integrationsQuery.isLoading &&
      !integrationsQuery.error &&
      connectedProviders.length === 0 ? (
        <Alert variant="info">
          Connect Jira, Linear, or GitHub in team settings before linking
          tickets to standup responses.
        </Alert>
      ) : null}

      {connectedProviders.length > 0 && config ? (
        <SurfaceCard
          variant="subtle"
          padding="sm"
          className="space-y-4 rounded-[1.75rem] border border-brand-200/50 bg-brand-50/40 dark:border-brand-400/20 dark:bg-brand-950/10"
        >
          <div className="flex flex-wrap gap-2">
            {connectedProviders.map((provider) => {
              const providerConfig = PROVIDER_CONFIG[provider];
              const Icon = providerConfig.Icon;

              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setActiveProvider(provider)}
                  disabled={disabled}
                  data-active={provider === activeProvider}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                    'border-black/5 bg-white/80 text-slate-600 hover:border-brand-200 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:text-white',
                    providerConfig.tabClassName,
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {providerConfig.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={selectedBoardId}
              onValueChange={setSelectedBoardId}
              disabled={disabled || boardsQuery.isLoading}
              options={[
                {
                  label: boardsQuery.isLoading
                    ? `Loading ${config.boardLabel.toLowerCase()}s...`
                    : `Select ${config.boardLabel}`,
                  value: '',
                },
                ...boards.map((board) => ({
                  label: `${board.name}${board.key ? ` (${board.key})` : ''}`,
                  value: board.id,
                })),
              ]}
            />

            <Select
              value={selectedSprintId}
              onValueChange={setSelectedSprintId}
              disabled={
                disabled ||
                selectedBoardId.length === 0 ||
                sprintsQuery.isLoading
              }
              options={[
                {
                  label: `Select ${config.sprintLabel} (optional)`,
                  value: '',
                },
                ...sprints.map((sprint) => ({
                  label: `${sprint.name}${sprint.state ? ` (${sprint.state})` : ''}`,
                  value: sprint.id,
                })),
              ]}
            />
          </div>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${config.label} tickets`}
            icon={<Search className="h-4 w-4" />}
            disabled={disabled || selectedBoardId.length === 0}
            fullWidth
          />

          {boardsQuery.error instanceof Error ? (
            <Alert variant="warning">{boardsQuery.error.message}</Alert>
          ) : null}

          {sprintsQuery.error instanceof Error ? (
            <Alert variant="warning">{sprintsQuery.error.message}</Alert>
          ) : null}

          {ticketsQuery.error instanceof Error ? (
            <Alert variant="warning">{ticketsQuery.error.message}</Alert>
          ) : null}

          <div className="space-y-3 rounded-[1.5rem] border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Search results
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {selectedBoardId
                    ? 'Search within the selected source and link the items that matter for today.'
                    : `Choose a ${config.boardLabel.toLowerCase()} to load results.`}
                </p>
              </div>
              {ticketsQuery.isFetching ? <Spinner size="sm" /> : null}
            </div>

            {selectedBoardId.length === 0 ? null : tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                No matching tickets found.
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => {
                  const linked = activeProvider
                    ? isLinked(linkedTickets, activeProvider, ticket)
                    : false;
                  const normalized = activeProvider
                    ? normalizeTicket(activeProvider, ticket)
                    : null;

                  return (
                    <div
                      key={`${activeProvider}-${ticket.id ?? ticket.key}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {normalized?.key ?? ticket.key ?? ticket.id}
                          </span>
                          {ticket.status ? (
                            <Badge size="sm">{ticket.status}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                          {normalized?.title ??
                            ticket.summary ??
                            (ticket as { title?: string }).title ??
                            (ticket as { name?: string }).name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {normalized?.url ? (
                          <a
                            href={normalized.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
                          >
                            Open
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                        <Button
                          size="sm"
                          variant={linked ? 'secondary' : 'primary'}
                          onClick={() => addTicket(ticket)}
                          disabled={disabled || linked}
                        >
                          {linked ? 'Linked' : 'Link'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SurfaceCard>
      ) : null}

      {linkedTickets.length ? (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Linked to this update
          </div>
          <div className="flex flex-wrap gap-2">
            {linkedTickets.map((ticket) => (
              <div
                key={`${ticket.provider}-${ticket.id}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/5 bg-white/80 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"
              >
                <Badge size="sm" variant="info" className="shrink-0">
                  {ticket.provider}
                </Badge>
                <span className="font-semibold">{ticket.key}</span>
                <span className="truncate text-slate-500 dark:text-slate-300">
                  {ticket.title}
                </span>
                {ticket.url ? (
                  <a
                    href={ticket.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
                    aria-label={`Open ${ticket.key}`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeTicket(ticket)}
                  disabled={disabled}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-black/5 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-white"
                  aria-label={`Remove ${ticket.key}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : !integrationsQuery.error ? (
        <div className="rounded-[1.5rem] border border-dashed border-black/10 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          No tickets linked yet. Add the one or two items most likely to come up
          during the standup.
        </div>
      ) : null}
    </div>
  );
}
