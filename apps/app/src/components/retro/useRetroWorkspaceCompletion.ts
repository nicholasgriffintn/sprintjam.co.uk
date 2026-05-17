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
  const { retroData, retroKey, isAuthenticated } = options;
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

  if (retroData.status !== "completed") {
    try {
      await services.completeSession(retroKey, "retro");
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) {
        return workspaceHistoryWarning(
          error,
          "The retro is complete, but workspace history was not updated.",
        );
      }
    }
  }

  if (actionsError) {
    return workspaceHistoryWarning(
      actionsError,
      "The retro is complete, but workspace actions were not updated.",
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
    () =>
      completeRetroWorkspaceHistory({
        retroData,
        retroKey,
        isAuthenticated,
      }),
    [isAuthenticated, retroData, retroKey],
  );
}
