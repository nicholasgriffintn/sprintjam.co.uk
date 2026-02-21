import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDownToLine, Loader2, RefreshCw } from "lucide-react";
import type { SessionRoundHistoryItem } from "@sprintjam/types";

import type { TicketQueueItem } from "@/types";
import { handleError } from "@/utils/error";
import { updateJiraStoryPoints } from "@/lib/jira-service";
import { updateLinearEstimate } from "@/lib/linear-service";
import { updateGithubEstimate } from "@/lib/github-service";
import { formatDate } from "@/utils/date";
import { getVoteSummary, calculateStoryPointsFromVotes } from "@/utils/votes";
import { downloadCsv } from "@/utils/csv";
import { buildCsv } from "@/components/modals/TicketQueueModal/utils/csv";
import { ExternalServiceBadge } from "@/components/ExternalServiceBadge";
import { Button } from "@/components/ui/Button";

interface TicketQueueModalCompletedTabProps {
  completedTickets: TicketQueueItem[];
  roundHistory?: SessionRoundHistoryItem[];
  roomKey: string;
  userName: string;
  onError?: (message: string) => void;
  onUpdateTicket?: (
    ticketId: number,
    updates: Partial<TicketQueueItem>,
  ) => void;
}

type SyncProvider = "jira" | "linear" | "github";

export function TicketQueueModalCompletedTab({
  completedTickets,
  roundHistory,
  roomKey,
  userName,
  onError,
  onUpdateTicket,
}: TicketQueueModalCompletedTabProps) {
  const [syncing, setSyncing] = useState<{
    id: number;
    provider: SyncProvider;
  } | null>(null);
  const jiraSyncMutation = useMutation({
    mutationKey: ["jira-sync-ticket", roomKey, userName],
    mutationFn: async (variables: {
      ticketId: string;
      storyPoints: number;
      note?: string;
    }) =>
      updateJiraStoryPoints(variables.ticketId, variables.storyPoints, {
        roomKey,
        userName,
        note: variables.note,
      }),
  });
  const linearSyncMutation = useMutation({
    mutationKey: ["linear-sync-ticket", roomKey, userName],
    mutationFn: async (variables: {
      ticketId: string;
      estimate: number;
      note?: string;
    }) =>
      updateLinearEstimate(variables.ticketId, variables.estimate, {
        roomKey,
        userName,
        note: variables.note,
      }),
  });
  const githubSyncMutation = useMutation({
    mutationKey: ["github-sync-ticket", roomKey, userName],
    mutationFn: async (variables: {
      ticketId: string;
      estimate: number;
      note?: string;
    }) =>
      updateGithubEstimate(variables.ticketId, variables.estimate, {
        roomKey,
        userName,
        note: variables.note,
      }),
  });

  const getStoryPointEstimate = (ticket: TicketQueueItem): number | null =>
    calculateStoryPointsFromVotes(ticket.votes);

  const setUpdatedTicketMetadata = (ticketId: number, metadata: unknown) => {
    onUpdateTicket?.(ticketId, {
      externalServiceMetadata: metadata as TicketQueueItem["externalServiceMetadata"],
    });
  };

  const runSyncMutation = async <TResult,>(
    options: {
      ticketId: number;
      provider: SyncProvider;
      execute: () => Promise<TResult>;
      fallbackError: string;
    },
  ) => {
    setSyncing({ id: options.ticketId, provider: options.provider });
    try {
      const updated = await options.execute();
      setUpdatedTicketMetadata(options.ticketId, updated);
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : options.fallbackError,
        onError,
      );
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncToJira = async (ticket: TicketQueueItem) => {
    if (ticket.externalService !== "jira") {
      handleError("Sync available only for Jira-linked tickets.", onError);
      return;
    }

    const storyPoints = getStoryPointEstimate(ticket);
    if (storyPoints === null) {
      handleError("No numeric votes available to sync to Jira.", onError);
      return;
    }

    await runSyncMutation({
      ticketId: ticket.id,
      provider: "jira",
      execute: () =>
        jiraSyncMutation.mutateAsync({
          ticketId: ticket.ticketId,
          storyPoints,
          note: ticket.outcome ?? undefined,
        }),
      fallbackError: "Failed to sync story points to Jira",
    });
  };

  const handleSyncToLinear = async (ticket: TicketQueueItem) => {
    if (ticket.externalService !== "linear") {
      handleError("Sync available only for Linear-linked tickets.", onError);
      return;
    }

    const estimate = getStoryPointEstimate(ticket);
    if (estimate === null) {
      handleError("No numeric votes available to sync to Linear.", onError);
      return;
    }

    const metadataId =
      typeof (ticket.externalServiceMetadata as { id?: unknown })?.id ===
      "string"
        ? (ticket.externalServiceMetadata as { id?: string }).id
        : undefined;
    const issueId = ticket.externalServiceId || metadataId || ticket.ticketId;

    await runSyncMutation({
      ticketId: ticket.id,
      provider: "linear",
      execute: () =>
        linearSyncMutation.mutateAsync({
          ticketId: issueId,
          estimate,
          note: ticket.outcome ?? undefined,
        }),
      fallbackError: "Failed to sync estimate to Linear",
    });
  };

  const handleSyncToGithub = async (ticket: TicketQueueItem) => {
    if (ticket.externalService !== "github") {
      handleError("Sync available only for GitHub-linked tickets.", onError);
      return;
    }

    const estimate = getStoryPointEstimate(ticket);
    if (estimate === null) {
      handleError("No numeric votes available to sync to GitHub.", onError);
      return;
    }

    await runSyncMutation({
      ticketId: ticket.id,
      provider: "github",
      execute: () =>
        githubSyncMutation.mutateAsync({
          ticketId: ticket.ticketId,
          estimate,
          note: ticket.outcome ?? undefined,
        }),
      fallbackError: "Failed to sync estimate to GitHub",
    });
  };

  const isSyncingProvider = (ticketId: number, provider: SyncProvider) =>
    syncing?.id === ticketId && syncing.provider === provider;

  const getSyncButtonConfig = (ticket: TicketQueueItem) => {
    if (ticket.externalService === "jira") {
      return {
        provider: "jira" as const,
        label: "Sync to Jira",
        className:
          "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60",
        onClick: () => {
          void handleSyncToJira(ticket);
        },
      };
    }

    if (ticket.externalService === "linear") {
      return {
        provider: "linear" as const,
        label: "Sync to Linear",
        className:
          "rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60",
        onClick: () => {
          void handleSyncToLinear(ticket);
        },
      };
    }

    if (ticket.externalService === "github") {
      return {
        provider: "github" as const,
        label: "Sync to GitHub",
        className:
          "rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60",
        onClick: () => {
          void handleSyncToGithub(ticket);
        },
      };
    }

    return null;
  };

  const handleDownloadTicket = (ticket: TicketQueueItem) => {
    const csv = buildCsv([ticket]);
    downloadCsv(`${ticket.ticketId}-votes.csv`, csv);
  };

  const renderBadge = (ticket: TicketQueueItem) => {
    if (ticket.externalService === "jira")
      return (
        <ExternalServiceBadge
          service="jira"
          getMetadata={(item) => item.externalServiceMetadata}
          ticket={ticket}
        />
      );
    if (ticket.externalService === "linear")
      return (
        <ExternalServiceBadge
          service="linear"
          getMetadata={(item) => item.externalServiceMetadata}
          ticket={ticket}
        />
      );
    if (ticket.externalService === "github")
      return (
        <ExternalServiceBadge
          service="github"
          getMetadata={(item) => item.externalServiceMetadata}
          ticket={ticket}
        />
      );
    return null;
  };

  const roundHistoryEntries = (roundHistory ?? []).slice().reverse();
  const hasTicketHistory = completedTickets.length > 0;
  const hasRoundHistory = roundHistoryEntries.length > 0;

  const getRoundTypeLabel = (type: SessionRoundHistoryItem["type"]) => {
    if (type === "reset") {
      return "Reset round";
    }
    if (type === "next_ticket") {
      return "Next ticket";
    }
    return "Session complete";
  };

  return (
    <div
      className="max-h-[70vh] space-y-3 overflow-y-auto pr-1"
      data-testid="queue-history-tab-panel"
    >
      {!hasTicketHistory && !hasRoundHistory ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No completed tickets or rounds yet. Wrap a ticket or reset votes to
          build history here.
        </p>
      ) : (
        <>
          {hasRoundHistory && (
            <div className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Round history
              </p>
              {roundHistoryEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {entry.ticketId || "Unticketed round"}
                      </span>
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-slate-600">
                        {getRoundTypeLabel(entry.type)}
                      </span>
                    </div>
                    {entry.ticketTitle && (
                      <p className="text-sm font-semibold">
                        {entry.ticketTitle}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Recorded {formatDate(entry.endedAt)}
                    </p>
                    {entry.outcome && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Outcome: {entry.outcome}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Vote history
                    </p>
                    {entry.votes.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.votes.map((vote, index) => (
                          <span
                            key={`${entry.id}-${vote.userName}-${vote.votedAt}-${index}`}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              {vote.userName}
                            </span>
                            <span className="font-mono text-sm text-slate-900 dark:text-white">
                              {vote.structuredVotePayload
                                ?.calculatedStoryPoints ?? vote.vote}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        No recorded votes for this round.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasTicketHistory && (
            <div className="space-y-3 pt-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Completed tickets
              </p>
              {completedTickets.map((ticket) => {
                const storyPoints = getStoryPointEstimate(ticket);
                const syncButton = getSyncButtonConfig(ticket);
                return (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold">
                            {ticket.ticketId}
                          </span>
                          {renderBadge(ticket)}
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                            Completed
                          </span>
                        </div>
                        {ticket.title && (
                          <p className="text-sm font-semibold">
                            {ticket.title}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {ticket.completedAt
                            ? `Completed ${formatDate(ticket.completedAt)}`
                            : "Completed"}
                        </p>
                        {ticket.outcome && (
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Outcome: {ticket.outcome}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={() => handleDownloadTicket(ticket)}
                          variant="unstyled"
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                          Export CSV
                        </Button>
                        {syncButton && (
                          <Button
                            onClick={syncButton.onClick}
                            disabled={isSyncingProvider(ticket.id, syncButton.provider)}
                            variant="unstyled"
                            className={syncButton.className}
                          >
                            {isSyncingProvider(ticket.id, syncButton.provider) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            {syncButton.label}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:grid-cols-3">
                      <span>
                        Votes:{" "}
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {getVoteSummary(ticket)}
                        </span>
                      </span>
                      <span>
                        Estimate:{" "}
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {storyPoints ?? "—"}
                        </span>
                      </span>
                      <span className="truncate">
                        Outcome:{" "}
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {ticket.outcome || "Not captured"}
                        </span>
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Vote history
                      </p>
                      {ticket.votes && ticket.votes.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ticket.votes.map((vote) => (
                            <span
                              key={`${ticket.id}-${vote.id}`}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                {vote.userName}
                              </span>
                              <span className="font-mono text-sm text-slate-900 dark:text-white">
                                {vote.structuredVotePayload
                                  ?.calculatedStoryPoints ?? vote.vote}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          No recorded votes for this ticket.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
