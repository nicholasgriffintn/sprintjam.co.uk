import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AdminSidebar } from "@/components/workspace/AdminSidebar";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Alert } from "@/components/ui/Alert";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { META_CONFIGS } from "@/config/meta";
import { usePageMeta } from "@/hooks/usePageMeta";
export default function WorkspaceAdminOverview() {
  usePageMeta(META_CONFIGS.workspaceAdmin);
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    actionError,
    refreshWorkspace,
  } = useWorkspaceData();
  const { goToLogin } = useSessionActions();
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
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
            Admin
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Manage workspace settings and teams
          </p>
        </div>
        {actionError && <Alert variant="warning">{actionError}</Alert>}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AdminSidebar activeScreen="workspaceAdmin" />
          <SurfaceCard className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Workspace Overview
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Quick workspace information and settings
              </p>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Coming soon
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Additional workspace settings and configuration options will
                  be available here.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
