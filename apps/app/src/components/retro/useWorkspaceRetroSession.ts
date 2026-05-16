import { useCallback, useRef } from "react";
import type { RetroTemplate } from "@sprintjam/types";

import {
  createTeamSession,
  getTeamSessionByRoomKey,
} from "@/lib/workspace-service";
import { buildTeamSessionMetadata } from "@/lib/team-session-metadata";

function buildRetroSessionName(): string {
  return `Retro ${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date())}`;
}

export function useWorkspaceRetroSession(team?: { id: number; slug: string }) {
  const attemptsRef = useRef(new Set<string>());

  return useCallback(
    async (retroKey: string, template?: RetroTemplate) => {
      if (!team) {
        return;
      }

      const attemptKey = `${team.id}:${retroKey}`;
      if (attemptsRef.current.has(attemptKey)) {
        return;
      }

      attemptsRef.current.add(attemptKey);
      try {
        const existingSession = await getTeamSessionByRoomKey(retroKey);
        if (existingSession) {
          return;
        }

        await createTeamSession(team.slug, buildRetroSessionName(), retroKey, {
          ...buildTeamSessionMetadata({
            type: "retro",
            teamId: team.id,
          }),
          ...(template
            ? { templateId: template.id, templateName: template.name }
            : {}),
        });
      } catch (error) {
        attemptsRef.current.delete(attemptKey);
        throw error;
      }
    },
    [team],
  );
}
