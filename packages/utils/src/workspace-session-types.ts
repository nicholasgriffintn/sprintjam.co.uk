import type {
  TeamSessionCounts,
  WorkspaceTeamSessionType,
} from "@sprintjam/types";

import { isRecord } from "./object";
import { safeJsonParse } from "./parse";

export function createEmptyTeamSessionCounts(): TeamSessionCounts {
  return {
    all: 0,
    planning: 0,
    standup: 0,
    wheel: 0,
  };
}

export function normaliseWorkspaceTeamSessionType(
  value: unknown,
): WorkspaceTeamSessionType {
  if (value === "standup" || value === "wheel" || value === "planning") {
    return value;
  }

  return "planning";
}

export function parseWorkspaceTeamSessionMetadata(
  metadata: string | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  if (isRecord(metadata)) {
    return metadata;
  }

  const parsed = safeJsonParse<unknown>(metadata, { silent: true });
  return isRecord(parsed) ? parsed : null;
}

export function getWorkspaceTeamSessionType(
  metadata: string | Record<string, unknown> | null | undefined,
): WorkspaceTeamSessionType {
  return normaliseWorkspaceTeamSessionType(
    parseWorkspaceTeamSessionMetadata(metadata)?.type,
  );
}

export function countWorkspaceTeamSessionTypes(
  sessions: Array<{ metadata: string | Record<string, unknown> | null }>,
): TeamSessionCounts {
  const counts = createEmptyTeamSessionCounts();

  for (const session of sessions) {
    counts.all++;
    counts[getWorkspaceTeamSessionType(session.metadata)]++;
  }

  return counts;
}
