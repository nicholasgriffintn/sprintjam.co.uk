import { useCallback, useRef } from "react";

import {
  createTeamSession,
  getTeamSessionByRoomKey,
} from "@/lib/workspace-service";
import { buildTeamSessionMetadata } from "@/lib/team-session-metadata";

function buildWheelSessionName(): string {
  return `Wheel ${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date())}`;
}

export function useWorkspaceWheelSession(team?: { id: number; slug: string }) {
  const attemptsRef = useRef(new Set<string>());

  return useCallback(
    async (wheelKey: string) => {
      if (!team) {
        return;
      }

      const attemptKey = `${team.id}:${wheelKey}`;
      if (attemptsRef.current.has(attemptKey)) {
        return;
      }

      attemptsRef.current.add(attemptKey);
      try {
        const existingSession = await getTeamSessionByRoomKey(wheelKey);
        if (existingSession) {
          return;
        }

        await createTeamSession(
          team.slug,
          buildWheelSessionName(),
          wheelKey,
          buildTeamSessionMetadata({
            type: "wheel",
            teamId: team.id,
          }),
        );
      } catch (error) {
        attemptsRef.current.delete(attemptKey);
        throw error;
      }
    },
    [team],
  );
}
