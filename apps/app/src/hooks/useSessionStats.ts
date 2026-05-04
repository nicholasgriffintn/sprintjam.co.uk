import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { normaliseSessionRoomKeys } from "@/lib/session-stats";
import { getTeamSessionType } from "@/lib/team-session-metadata";
import { getBatchSessionStats } from "@/lib/workspace-service";
import type { SessionStats, TeamSession } from "@sprintjam/types";

interface UseSessionStatsReturn {
  statsMap: Record<string, SessionStats>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSessionStats(
  sessions: TeamSession[],
): UseSessionStatsReturn {
  const roomKeys = useMemo(
    () =>
      normaliseSessionRoomKeys(
        sessions
          .filter((session) => getTeamSessionType(session) === "planning")
          .map((session) => session.roomKey),
      ),
    [sessions],
  );
  const statsQuery = useQuery<Record<string, SessionStats>>({
    queryKey: ["batch-session-stats", roomKeys],
    enabled: roomKeys.length > 0,
    queryFn: () => getBatchSessionStats(roomKeys),
    staleTime: 0,
  });

  return {
    statsMap: roomKeys.length === 0 ? {} : (statsQuery.data ?? {}),
    isLoading: roomKeys.length > 0 && statsQuery.isFetching,
    error: statsQuery.error instanceof Error ? statsQuery.error : null,
    refetch: async () => {
      await statsQuery.refetch();
    },
  };
}
