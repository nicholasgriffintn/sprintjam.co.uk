import { useEffect, useRef } from 'react';

import { updateJiraStoryPoints } from '../lib/jira-service';
import type { RoomData, TicketQueueItem } from '../types';

interface UseAutoJiraUpdateOptions {
  roomData: RoomData | null;
  userName: string;
  onTicketUpdate: (
    ticketId: number,
    updates: Partial<TicketQueueItem>
  ) => void;
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

  useEffect(() => {
    if (!roomData) return;

    const currentTicket = roomData.currentTicket;

    if (
      !currentTicket ||
      currentTicket.externalService !== 'jira' ||
      !roomData.settings.enableJiraIntegration ||
      !roomData.settings.autoUpdateJiraStoryPoints ||
      roomData.showVotes !== true ||
      roomData.judgeScore === null ||
      roomData.moderator !== userName
    ) {
      return;
    }

    const storyPoints = Number(roomData.judgeScore);
    if (Number.isNaN(storyPoints)) {
      return;
    }

    const lastUpdate = lastUpdatedRef.current;
    if (
      lastUpdate &&
      lastUpdate.ticketId === currentTicket.id &&
      lastUpdate.storyPoints === storyPoints
    ) {
      return;
    }

    lastUpdatedRef.current = { ticketId: currentTicket.id, storyPoints };

    updateJiraStoryPoints(currentTicket.ticketId, storyPoints, {
      roomKey: roomData.key,
      userName,
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
  }, [roomData, userName, onTicketUpdate, onError]);
};
