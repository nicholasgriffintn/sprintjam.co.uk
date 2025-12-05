import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  updateJiraStoryPoints,
  convertVoteValueToStoryPoints,
} from "@/lib/jira-service";
import { updateLinearEstimate } from "@/lib/linear-service";
import type {
  RoomData,
  TicketQueueItem,
  VoteValue,
  StructuredVote,
} from "@/types";

interface UseAutoJiraUpdateOptions {
  roomData: RoomData | null;
  userName: string;
  onTicketUpdate: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onError: (error: string) => void;
}

const PROVIDER_LABELS: Record<
  TicketQueueItem["externalService"],
  string
> = {
  jira: "Jira",
  linear: "Linear",
  github: "GitHub",
  none: "provider",
};

const SUPPORTED_AUTO_SYNC_PROVIDERS: Array<
  Exclude<TicketQueueItem["externalService"], "none">
> = ["jira", "linear"];

export const useAutoJiraUpdate = ({
  roomData,
  userName,
  onTicketUpdate,
  onError,
}: UseAutoJiraUpdateOptions) => {
  const lastUpdatedRef = useRef<{
    ticketId: number;
    provider: TicketQueueItem["externalService"];
    value: number;
  } | null>(null);
  const updateStoryPointsMutation = useMutation({
    mutationKey: ["jira-story-points", userName],
    mutationFn: async (variables: {
      ticketId: string;
      storyPoints: number;
      roomKey: string;
    }) =>
      updateJiraStoryPoints(variables.ticketId, variables.storyPoints, {
        roomKey: variables.roomKey,
        userName,
      }),
  });
  const updateLinearEstimateMutation = useMutation({
    mutationKey: ["linear-estimates", userName],
    mutationFn: async (variables: {
      issueId: string;
      estimate: number;
      roomKey: string;
    }) =>
      updateLinearEstimate(variables.issueId, variables.estimate, {
        roomKey: variables.roomKey,
        userName,
      }),
  });

  const calculateEstimate = (
    votes: Record<string, VoteValue | null>,
    structuredVotes?: Record<string, StructuredVote>
  ): number | null => {
    const numericVotes = Object.entries(votes)
      .map(([user, vote]) => {
        const structured = structuredVotes?.[user];
        const source = structured?.calculatedStoryPoints ?? vote;
        return source !== null ? convertVoteValueToStoryPoints(source) : null;
      })
      .filter((value): value is number => value !== null);

    if (numericVotes.length === 0) {
      return null;
    }

    const average =
      numericVotes.reduce((total, value) => total + value, 0) /
      numericVotes.length;

    return Math.round((average + Number.EPSILON) * 10) / 10;
  };

  const resolveLinearIssueId = (ticket: TicketQueueItem): string => {
    if (ticket.externalServiceId) {
      return ticket.externalServiceId;
    }

    const metadataId =
      typeof (ticket.externalServiceMetadata as { id?: unknown })?.id ===
      "string"
        ? (ticket.externalServiceMetadata as { id?: string }).id
        : undefined;

    return metadataId ?? ticket.ticketId;
  };

  useEffect(() => {
    if (!roomData) return;

    const currentTicket = roomData.currentTicket;
    if (!currentTicket) {
      return;
    }

    const provider = currentTicket.externalService;
    const roomProvider = roomData.settings.externalService ?? "none";
    const autoSyncEnabled = roomData.settings.autoSyncEstimates ?? true;

    if (
      provider === "none" ||
      !SUPPORTED_AUTO_SYNC_PROVIDERS.includes(provider) ||
      provider !== roomProvider ||
      roomData.showVotes !== true ||
      !autoSyncEnabled ||
      roomData.moderator !== userName
    ) {
      return;
    }

    const estimate = calculateEstimate(
      roomData.votes,
      roomData.structuredVotes
    );
    if (estimate === null) return;

    const lastUpdate = lastUpdatedRef.current;
    if (
      lastUpdate &&
      lastUpdate.ticketId === currentTicket.id &&
      lastUpdate.provider === provider &&
      lastUpdate.value === estimate
    ) {
      return;
    }

    const providerMutation =
      provider === "jira"
        ? updateStoryPointsMutation
        : updateLinearEstimateMutation;

    if (providerMutation.isPending) {
      return;
    }

    lastUpdatedRef.current = {
      ticketId: currentTicket.id,
      provider,
      value: estimate,
    };

    const mutationPromise =
      provider === "jira"
        ? providerMutation.mutateAsync({
            ticketId: currentTicket.ticketId,
            storyPoints: estimate,
            roomKey: roomData.key,
          })
        : providerMutation.mutateAsync({
            issueId: resolveLinearIssueId(currentTicket),
            estimate,
            roomKey: roomData.key,
          });

    mutationPromise
      .then((ticket) => {
        onTicketUpdate(currentTicket.id, {
          externalServiceMetadata: ticket,
        });
      })
      .catch((err) => {
        lastUpdatedRef.current = null;
        const providerLabel =
          PROVIDER_LABELS[provider] ?? PROVIDER_LABELS.none;
        const errorMessage =
          err instanceof Error
            ? err.message
            : `Failed to auto-update ${providerLabel} estimate`;
        onError(errorMessage);
      });
  }, [
    roomData,
    userName,
    onTicketUpdate,
    onError,
    updateStoryPointsMutation.isPending,
    updateStoryPointsMutation.mutateAsync,
    updateLinearEstimateMutation.isPending,
    updateLinearEstimateMutation.mutateAsync,
  ]);
};
