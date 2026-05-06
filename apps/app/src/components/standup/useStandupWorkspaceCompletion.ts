import { useCallback } from "react";
import type { StandupData } from "@sprintjam/types";

import {
  completeSessionByRoomKey,
  recordStandupActionsByRoomKey,
} from "@/lib/workspace-service";
import { HttpError } from "@/lib/errors";

interface CompleteStandupWorkspaceHistoryOptions {
  standupData: StandupData | null;
  standupKey: string;
  isAuthenticated: boolean;
}

interface StandupWorkspaceHistoryServices {
  recordActions: typeof recordStandupActionsByRoomKey;
  completeSession: typeof completeSessionByRoomKey;
}

function buildStandupActionPayload(standupData: StandupData) {
  return {
    blockers: standupData.responses
      .filter((response) => response.hasBlocker && !response.blockerResolved)
      .map((response) => ({
        userName: response.userName,
        description: response.blockerDescription ?? null,
        linkedTickets: response.linkedTickets,
      })),
    nextSteps: standupData.responses.map((response) => ({
      userName: response.userName,
      description: response.today ?? null,
      linkedTickets: response.linkedTickets,
    })),
  };
}

function workspaceHistoryWarning(error: unknown, suffix: string): string {
  return error instanceof Error
    ? `${error.message} ${suffix}`
    : suffix;
}

export async function completeStandupWorkspaceHistory(
  options: CompleteStandupWorkspaceHistoryOptions,
  services: StandupWorkspaceHistoryServices = {
    recordActions: recordStandupActionsByRoomKey,
    completeSession: completeSessionByRoomKey,
  },
): Promise<string | null> {
  const { standupData, standupKey, isAuthenticated } = options;
  if (!standupData?.teamId || !isAuthenticated) {
    return null;
  }

  let actionsError: unknown = null;
  try {
    await services.recordActions({
      roomKey: standupKey,
      ...buildStandupActionPayload(standupData),
    });
  } catch (error) {
    if (!(error instanceof HttpError && error.status === 404)) {
      actionsError = error;
    }
  }

  try {
    await services.completeSession(standupKey);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }

    return workspaceHistoryWarning(
      error,
      "The standup is complete, but workspace history was not updated.",
    );
  }

  return actionsError
    ? workspaceHistoryWarning(
        actionsError,
        "The standup is complete, but workspace actions were not updated.",
      )
    : null;
}

export function useStandupWorkspaceCompletion({
  standupData,
  standupKey,
  isAuthenticated,
}: CompleteStandupWorkspaceHistoryOptions) {
  return useCallback(
    () =>
      completeStandupWorkspaceHistory({
        standupData,
        standupKey,
        isAuthenticated,
      }),
    [isAuthenticated, standupData, standupKey],
  );
}
