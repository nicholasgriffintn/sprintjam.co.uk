import { Building2, Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { TeamSelector } from "@/components/workspace/TeamSelector";
import { SessionList } from "@/components/workspace/SessionList";
import { TeamInsightsPanel } from "@/components/workspace/TeamInsightsPanel";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { META_CONFIGS } from "@/config/meta";
import { usePageMeta } from "@/hooks/usePageMeta";
import { BetaBadge } from "../../components/BetaBadge";

export default function WorkspaceSessions() {
  usePageMeta(META_CONFIGS.workspaceSessions);

  const {
    user,
    teams,
    sessions,
    selectedTeamId,
    setSelectedTeamId,
    isAuthenticated,
    isLoading,
    isLoadingSessions,
    error,
    refreshWorkspace,
  } = useWorkspaceData();

  const { goToLogin, goToRoom, startCreateFlow } = useSessionActions();

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  const handleOpenRoom = (roomKey: string) => {
    const targetKey = roomKey.trim();
    if (!targetKey) {
      return;
    }
    goToRoom(targetKey);
  };

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
            Sessions <BetaBadge />
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            View and manage team planning sessions
          </p>
        </div>

        <div className="space-y-4">
          <TeamSelector
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={setSelectedTeamId}
          />

          {!selectedTeam && (
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="Select a team"
              description="Choose a team to see linked sessions."
            />
          )}

          {selectedTeam && (
            <div className="space-y-4">
              <TeamInsightsPanel
                teamId={selectedTeam.id}
                teamName={selectedTeam.name}
              />

              <SurfaceCard className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedTeam.name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Team sessions
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="success" size="sm" className="font-semibold">
                      <Target className="mr-1.5 h-3.5 w-3.5" />
                      {sessions.length}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => startCreateFlow(selectedTeam.id)}
                      icon={<Plus className="h-4 w-4" />}
                    >
                      New Session
                    </Button>
                  </div>
                </div>
                <SessionList
                  sessions={sessions}
                  isLoading={isLoadingSessions}
                  onOpenRoom={handleOpenRoom}
                />
              </SurfaceCard>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
