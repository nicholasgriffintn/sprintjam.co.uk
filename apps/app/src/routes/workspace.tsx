import { RefreshCcw } from "lucide-react";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { StatCards } from "@/components/workspace/StatCards";
import { SessionsChart } from "@/components/workspace/SessionsChart";
import { InsightsGrid } from "@/components/workspace/InsightsGrid";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { BetaBadge } from "@/components/BetaBadge";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useWorkspaceStats } from "@/hooks/useWorkspaceStats";
import { useSessionActions } from "@/context/SessionContext";
import { createMeta } from "../utils/route-meta";

export const meta = createMeta("workspace");

export default function WorkspaceDashboard() {
  const {
    user,
    teams,
    stats,
    isAuthenticated,
    isLoading,
    error,
    refreshWorkspace,
  } = useWorkspaceData({ includeStats: true });

  const { goToLogin } = useSessionActions();

  const {
    sessionsOverTime,
    insights,
    refetch: refetchInsights,
  } = useWorkspaceStats(stats);

  const handleRefresh = async () => {
    await refreshWorkspace(true);
    await refetchInsights();
  };

  return (
    <WorkspaceLayout
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      user={user}
      error={error}
      onRefresh={() => void handleRefresh()}
      onLogin={goToLogin}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              Dashboard <BetaBadge />
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Manage your teams and planning sessions
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleRefresh()}
            isLoading={isLoading}
            icon={<RefreshCcw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>

        <StatCards
          stats={stats}
          insights={insights}
          teamCount={teams.length}
          sessionCount={stats?.totalSessions ?? 0}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <SurfaceCard>
            <SessionsChart data={sessionsOverTime} />
          </SurfaceCard>

          <SurfaceCard>
            <InsightsGrid insights={insights} />
          </SurfaceCard>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
