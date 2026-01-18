import { useState, useEffect, useCallback } from "react";
import type {
  WorkspaceStats,
  WorkspaceInsights,
  SessionTimelineData,
} from "@/lib/workspace-service";
import { getWorkspaceInsights } from "@/lib/workspace-service";

interface WorkspaceStatsReturn {
  sessionsOverTime: SessionTimelineData[];
  insights: WorkspaceInsights | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkspaceStats(
  stats: WorkspaceStats | null,
): WorkspaceStatsReturn {
  const [insights, setInsights] = useState<WorkspaceInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!stats || stats.totalTeams === 0) {
      setInsights(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getWorkspaceInsights();
      setInsights(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch insights"),
      );
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const sessionsOverTime = stats?.sessionTimeline ?? [];

  return {
    sessionsOverTime,
    insights,
    isLoading: !stats || isLoading,
    error,
    refetch: fetchInsights,
  };
}
