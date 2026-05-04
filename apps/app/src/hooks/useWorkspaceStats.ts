import type {
  SessionTimelineData,
  WorkspaceInsights,
  WorkspaceStats,
} from "@sprintjam/types";

interface WorkspaceStatsReturn {
  sessionsOverTime: SessionTimelineData[];
  insights: WorkspaceInsights | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkspaceStats(
  stats: WorkspaceStats | null,
  insights: WorkspaceInsights | null,
): WorkspaceStatsReturn {
  const sessionsOverTime = stats?.sessionTimeline ?? [];

  return {
    sessionsOverTime,
    insights,
    isLoading: !stats,
    error: null,
    refetch: async () => {},
  };
}
