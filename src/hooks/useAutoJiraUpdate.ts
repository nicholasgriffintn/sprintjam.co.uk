import { useEffect } from 'react';

import { updateJiraStoryPoints } from '../lib/jira-service';
import type { RoomData, JiraTicket } from '../types';

interface UseAutoJiraUpdateOptions {
  roomData: RoomData | null;
  name: string;
  onJiraTicketUpdated: (ticket: JiraTicket) => void;
  onError: (error: string) => void;
}

export const useAutoJiraUpdate = ({
  roomData,
  name,
  onJiraTicketUpdated,
  onError,
}: UseAutoJiraUpdateOptions) => {
  useEffect(() => {
    if (!roomData) return;

    if (
      roomData.settings.enableJiraIntegration &&
      roomData.settings.autoUpdateJiraStoryPoints &&
      roomData.jiraTicket &&
      roomData.judgeScore !== null &&
      roomData.showVotes
    ) {
      const storyPoint =
        typeof roomData.judgeScore === 'number'
          ? roomData.judgeScore
          : Number(roomData.judgeScore);

      if (!Number.isNaN(storyPoint)) {
        updateJiraStoryPoints(roomData.jiraTicket.key, storyPoint, {
          roomKey: roomData.key,
          userName: name,
        })
          .then((updatedTicket) => {
            onJiraTicketUpdated(updatedTicket);
          })
          .catch((err) => {
            const errorMessage =
              err instanceof Error
                ? err.message
                : 'Failed to auto-update Jira story points';
            onError(errorMessage);
          });
      }
    }
  }, [roomData, name, onJiraTicketUpdated, onError]);
};
