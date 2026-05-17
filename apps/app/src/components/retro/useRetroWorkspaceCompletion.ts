import { useCallback } from "react";
import type { RetroData } from "@sprintjam/types";

import { HttpError } from "@/lib/errors";
import {
  completeSessionByRoomKey,
  recordRetroActionsByRoomKey,
} from "@/lib/workspace-service";

interface CompleteRetroWorkspaceHistoryOptions {
  retroData: RetroData | null;
  retroKey: string;
  isAuthenticated: boolean;
  forceCompleteSession?: boolean;
}

interface RetroWorkspaceHistoryServices {
  recordActions: typeof recordRetroActionsByRoomKey;
  completeSession: typeof completeSessionByRoomKey;
}

function buildRetroActionPayload(retroData: RetroData) {
  return {
    actions: retroData.actionItems.map((action) => ({
      id: action.id,
      title: action.title,
      owner: action.owner,
      dueAt: action.dueAt,
      priority: action.priority,
      completed: action.completed,
    })),
  };
}

function workspaceHistoryWarning(error: unknown, suffix: string): string {
  return error instanceof Error ? `${error.message} ${suffix}` : suffix;
}

export async function completeRetroWorkspaceHistory(
  options: CompleteRetroWorkspaceHistoryOptions,
  services: RetroWorkspaceHistoryServices = {
    recordActions: recordRetroActionsByRoomKey,
    completeSession: completeSessionByRoomKey,
  },
): Promise<string | null> {
  const { retroData, retroKey, isAuthenticated, forceCompleteSession } =
    options;
  if (!retroData || !isAuthenticated) {
    return null;
  }

  let actionsError: unknown = null;
  try {
    await services.recordActions({
      roomKey: retroKey,
      ...buildRetroActionPayload(retroData),
    });
  } catch (error) {
    if (!(error instanceof HttpError && error.status === 404)) {
      actionsError = error;
    }
  }

  if (retroData.status !== "completed" || forceCompleteSession) {
    try {
      await services.completeSession(retroKey, "retro");
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) {
        return workspaceHistoryWarning(
          error,
          "Workspace history was not updated.",
        );
      }
    }
  }

  if (actionsError) {
    return workspaceHistoryWarning(
      actionsError,
      "Workspace actions were not updated.",
    );
  }

  return null;
}

export function useRetroWorkspaceCompletion({
  retroData,
  retroKey,
  isAuthenticated,
}: CompleteRetroWorkspaceHistoryOptions) {
  return useCallback(
    (options: { forceCompleteSession?: boolean } = {}) =>
      completeRetroWorkspaceHistory({
        retroData,
        retroKey,
        isAuthenticated,
        forceCompleteSession: options.forceCompleteSession,
      }),
    [isAuthenticated, retroData, retroKey],
  );
}
