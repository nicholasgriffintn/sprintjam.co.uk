import type { TeamSession } from "@sprintjam/types";

export type TeamSessionType = "planning" | "standup";

export function parseTeamSessionMetadata(
  session: Pick<TeamSession, "metadata">,
): Record<string, unknown> | null {
  if (!session.metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(session.metadata) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function getTeamSessionType(
  session: Pick<TeamSession, "metadata">,
): TeamSessionType {
  const metadata = parseTeamSessionMetadata(session);
  return metadata?.type === "standup" ? "standup" : "planning";
}
