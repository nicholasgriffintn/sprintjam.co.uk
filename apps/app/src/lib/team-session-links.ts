import { getPathFromScreen } from "@/config/routes";
import { getTeamSessionType } from "@/lib/team-session-metadata";
import type { TeamSession } from "@sprintjam/types";

export function getTeamSessionPath(session: TeamSession): string | null {
  const targetKey = session.roomKey.trim();
  if (!targetKey) {
    return null;
  }

  const sessionType = getTeamSessionType(session);
  if (sessionType === "standup") {
    return getPathFromScreen("standupJoin", { standupKey: targetKey });
  }

  if (sessionType === "wheel") {
    return getPathFromScreen("wheel", { wheelKey: targetKey });
  }

  return getPathFromScreen("room", { roomKey: targetKey });
}
