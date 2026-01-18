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
import { META_CONFIGS } from "@/config/meta";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function WorkspaceDashboard() {
  usePageMeta(META_CONFIGS.workspace);

  const {
    user,
    teams,
    sessions,
    stats,
    isAuthenticated,
    isLoading,
    error,
    refreshWorkspace,
  } = useWorkspaceData();

  const { goToLogin } = useSessionActions();

  const { sessionsOverTime, orgInsights } = useWorkspaceStats(stats);

  return (
    <WorkspaceLayout
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      user={user}
      error={error}
      onRefresh={() => refreshWorkspace(true)}
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
            onClick={() => refreshWorkspace(true)}
            isLoading={isLoading}
            icon={<RefreshCcw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>

        <StatCards
          stats={stats}
          teamCount={teams.length}
          sessionCount={sessions.length}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <SurfaceCard>
            <SessionsChart data={sessionsOverTime} />
          </SurfaceCard>

          <SurfaceCard>
            <InsightsGrid insights={orgInsights} />
          </SurfaceCard>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
