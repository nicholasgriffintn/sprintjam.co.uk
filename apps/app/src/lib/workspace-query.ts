export const TEAM_INSIGHTS_STALE_TIME_MS = 1000 * 60 * 5;
export const SESSION_STATS_STALE_TIME_MS = 1000 * 60;
export const WORKSPACE_STATS_QUERY_KEY = ["workspace-stats"] as const;

export function teamInsightsQueryKey(teamId: number, limit = 6) {
  return ["team-insights", teamId, limit] as const;
}

export function teamSessionsQueryKey(teamId: number) {
  return ["team-sessions", teamId] as const;
}

export function linkedRoomSessionQueryKey(roomKey: string) {
  return ["linked-room-session", roomKey] as const;
}

export function sessionStatsQueryKey(roomKey: string) {
  return ["session-stats", roomKey] as const;
}

export function normaliseSessionRoomKeys(roomKeys: string[]) {
  return [...new Set(roomKeys)].sort();
}

export function batchSessionStatsQueryKey(roomKeys: string[]) {
  return ["session-stats-batch", roomKeys] as const;
}
