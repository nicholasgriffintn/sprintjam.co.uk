import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { updateJiraStoryPoints, convertVoteValueToStoryPoints } from "@/lib/jira-service";
import type { RoomData, TicketQueueItem, VoteValue, StructuredVote } from "@/types";

interface UseAutoJiraUpdateOptions {
  roomData: RoomData | null;
  userName: string;
  onTicketUpdate: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onError: (error: string) => void;
}

export const useAutoJiraUpdate = ({
  roomData,
  userName,
  onTicketUpdate,
  onError,
}: UseAutoJiraUpdateOptions) => {
  const lastUpdatedRef = useRef<{
    ticketId: number;
    storyPoints: number;
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

  const calculateStoryPoints = (
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

  useEffect(() => {
    if (!roomData) return;

    const currentTicket = roomData.currentTicket;

    if (
      !currentTicket ||
      currentTicket.externalService !== 'jira' ||
      roomData.settings.externalService !== 'jira' ||
      !roomData.settings.autoUpdateJiraStoryPoints ||
      roomData.showVotes !== true ||
      roomData.moderator !== userName
    ) {
      return;
    }

    const storyPoints = calculateStoryPoints(
      roomData.votes,
      roomData.structuredVotes
    );
    if (storyPoints === null) return;

    const lastUpdate = lastUpdatedRef.current;
    if (
      lastUpdate &&
      lastUpdate.ticketId === currentTicket.id &&
      lastUpdate.storyPoints === storyPoints
    ) {
      return;
    }

    lastUpdatedRef.current = { ticketId: currentTicket.id, storyPoints };

    if (updateStoryPointsMutation.isPending) {
      return;
    }

    updateStoryPointsMutation
      .mutateAsync({
        ticketId: currentTicket.ticketId,
        storyPoints,
        roomKey: roomData.key,
      })
      .then((ticket) => {
        onTicketUpdate(currentTicket.id, {
          externalServiceMetadata: ticket,
        });
      })
      .catch((err) => {
        lastUpdatedRef.current = null;
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to auto-update Jira story points';
        onError(errorMessage);
      });
  }, [
    roomData,
    userName,
    onTicketUpdate,
    onError,
    updateStoryPointsMutation.isPending,
    updateStoryPointsMutation.mutateAsync,
  ]);
};
