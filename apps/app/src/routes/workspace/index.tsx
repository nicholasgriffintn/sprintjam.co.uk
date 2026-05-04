import { RefreshCcw } from "lucide-react";
import {
  Link,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";

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
import { createMeta } from "@/utils/route-meta";
import {
  loadWorkspaceInsights,
  loadWorkspaceStats,
} from "@/lib/workspace-loaders";

export const meta = createMeta("workspace");

export async function loader({ request, context }: LoaderFunctionArgs) {
  const args = { request, context };
  const [stats, insights] = await Promise.all([
    loadWorkspaceStats(args),
    loadWorkspaceInsights(args),
  ]);

  return {
    stats,
    insights,
  };
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.data
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred";
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-lg font-semibold text-slate-900 dark:text-white">
        Failed to load workspace
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <Link
        to="/"
        className="text-sm text-brand-600 underline dark:text-brand-400"
      >
        Go home
      </Link>
    </div>
  );
}

export default function WorkspaceDashboard() {
  const { stats, insights: initialInsights } = useLoaderData<typeof loader>();
  const {
    user,
    teams,
    isAuthenticated,
    isLoading,
    error,
    refreshWorkspace,
  } = useWorkspaceData({ stats });

  const { goToLogin } = useSessionActions();

  const {
    sessionsOverTime,
    insights,
    refetch: refetchInsights,
  } = useWorkspaceStats(stats, initialInsights);

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
