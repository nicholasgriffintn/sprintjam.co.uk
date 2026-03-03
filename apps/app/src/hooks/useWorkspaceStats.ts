import { useQuery } from "@tanstack/react-query";
import type {
  SessionTimelineData,
  WorkspaceInsights,
  WorkspaceStats,
} from "@sprintjam/types";
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
  const insightsQuery = useQuery({
    queryKey: [
      "workspace-insights",
      stats?.totalTeams ?? 0,
      stats?.totalSessions ?? 0,
      stats?.completedSessions ?? 0,
    ],
    enabled: Boolean(stats && stats.totalTeams > 0),
    queryFn: () => getWorkspaceInsights(),
    staleTime: 1000 * 60 * 5,
  });

  const sessionsOverTime = stats?.sessionTimeline ?? [];

  return {
    sessionsOverTime,
    insights: insightsQuery.data ?? null,
    isLoading: !stats || insightsQuery.isLoading,
    error: insightsQuery.error instanceof Error ? insightsQuery.error : null,
    refetch: async () => {
      await insightsQuery.refetch();
    },
  };
}
