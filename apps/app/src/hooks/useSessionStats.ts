import { useState, useEffect, useCallback } from "react";
import type { SessionStats, TeamSession } from "@/lib/workspace-service";
import { getBatchSessionStats } from "@/lib/workspace-service";

interface UseSessionStatsReturn {
  statsMap: Record<string, SessionStats>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSessionStats(
  sessions: TeamSession[],
): UseSessionStatsReturn {
  const [statsMap, setStatsMap] = useState<Record<string, SessionStats>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (sessions.length === 0) {
      setStatsMap({});
      return;
    }

    const roomKeys = sessions.map((s) => s.roomKey);

    setIsLoading(true);
    setError(null);

    try {
      const data = await getBatchSessionStats(roomKeys);
      setStatsMap(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch session stats"),
      );
      setStatsMap({});
    } finally {
      setIsLoading(false);
    }
  }, [sessions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    statsMap,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
