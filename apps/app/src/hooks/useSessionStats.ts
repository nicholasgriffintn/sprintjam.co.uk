import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  batchSessionStatsQueryKey,
  normaliseSessionRoomKeys,
  SESSION_STATS_STALE_TIME_MS,
  sessionStatsQueryKey,
} from "@/lib/workspace-query";
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
  const queryClient = useQueryClient();
  const roomKeys = useMemo(
    () => normaliseSessionRoomKeys(sessions.map((session) => session.roomKey)),
    [sessions],
  );

  const statsQuery = useQuery<Record<string, SessionStats>>({
    queryKey: batchSessionStatsQueryKey(roomKeys),
    enabled: roomKeys.length > 0,
    staleTime: SESSION_STATS_STALE_TIME_MS,
    queryFn: async () => {
      const data = await getBatchSessionStats(roomKeys);
      for (const roomKey of roomKeys) {
        queryClient.setQueryData(
          sessionStatsQueryKey(roomKey),
          data[roomKey] ?? null,
        );
      }
      return data;
    },
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
