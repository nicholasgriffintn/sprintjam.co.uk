import { useMemo, useState } from "react";
import { Building2, MessageSquareQuote, Plus, Target } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { toast } from "@/components/ui";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { TeamSelector } from "@/components/workspace/TeamSelector";
import { SessionList } from "@/components/workspace/SessionList";
import { TeamInsightsPanel } from "@/components/workspace/TeamInsightsPanel";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import {
  getTeamSessionType,
  type TeamSessionType,
} from "@/lib/team-session-metadata";
import { requestTeamAccess } from "@/lib/workspace-service";
import { BetaBadge } from "@/components/BetaBadge";
import { createMeta } from "../meta";

export const meta = createMeta("workspaceSessions");

type SessionFilter = "all" | TeamSessionType;

export default function WorkspaceSessions() {
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
  } = useWorkspaceData({ includeSessions: true });

  const { goToLogin, goToRoom, startCreateFlow } =
    useSessionActions();
  const navigateTo = useAppNavigation();
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) =>
        sessionFilter === "all"
          ? true
          : getTeamSessionType(session) === sessionFilter,
      ),
    [sessionFilter, sessions],
  );
  const planningCount = useMemo(
    () =>
      sessions.filter((session) => getTeamSessionType(session) === "planning")
        .length,
    [sessions],
  );
  const standupCount = useMemo(
    () =>
      sessions.filter((session) => getTeamSessionType(session) === "standup")
        .length,
    [sessions],
  );

  const handleOpenSession = (session: (typeof sessions)[number]) => {
    const targetKey = session.roomKey.trim();
    if (!targetKey) {
      return;
    }

    if (getTeamSessionType(session) === "standup") {
      navigateTo("standupJoin", { standupKey: targetKey });
      return;
    }

    goToRoom(targetKey);
  };

  const handleRequestAccess = async () => {
    if (!selectedTeam) {
      return;
    }

    setIsRequestingAccess(true);
    try {
      await requestTeamAccess(selectedTeam.id);
      await refreshWorkspace(true);
      toast.success("Access request sent");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to request access";
      toast.error(message);
    } finally {
      setIsRequestingAccess(false);
    }
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
            View and manage planning sessions and standups
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
              {selectedTeam.canAccess ? (
                <TeamInsightsPanel
                  teamId={selectedTeam.id}
                  teamName={selectedTeam.name}
                />
              ) : (
                <Alert variant="warning">
                  {selectedTeam.currentUserStatus === "pending"
                    ? "Your access request is pending team admin approval."
                    : "This is a restricted team. Request access from a team admin to view sessions."}
                </Alert>
              )}

              <SurfaceCard className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedTeam.name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedTeam.canAccess
                        ? "Team sessions"
                        : selectedTeam.currentUserStatus === "pending"
                          ? "Access request pending"
                          : "Restricted team"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="success"
                      size="sm"
                      className="font-semibold"
                    >
                      <Target className="mr-1.5 h-3.5 w-3.5" />
                      {filteredSessions.length}
                    </Badge>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => startCreateFlow(selectedTeam.id)}
                        icon={<Plus className="h-4 w-4" />}
                        disabled={!selectedTeam.canAccess}
                      >
                        New planning session
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigateTo("standupCreate")}
                        icon={<MessageSquareQuote className="h-4 w-4" />}
                        disabled={!selectedTeam.canAccess}
                      >
                        New standup
                      </Button>
                    </div>
                    {!selectedTeam.canAccess &&
                      selectedTeam.currentUserStatus !== "pending" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleRequestAccess()}
                          isLoading={isRequestingAccess}
                        >
                          Request access
                        </Button>
                      )}
                  </div>
                </div>
                {selectedTeam.canAccess ? (
                  <Tabs.Root
                    value={sessionFilter}
                    onValueChange={(value) =>
                      setSessionFilter(value as SessionFilter)
                    }
                  >
                    <Tabs.List fullWidth>
                      <Tabs.Tab value="all">All ({sessions.length})</Tabs.Tab>
                      <Tabs.Tab value="planning">
                        Planning ({planningCount})
                      </Tabs.Tab>
                      <Tabs.Tab value="standup">
                        Standups ({standupCount})
                      </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value={sessionFilter}>
                      <SessionList
                        sessions={filteredSessions}
                        isLoading={isLoadingSessions}
                        emptyTitle={
                          sessionFilter === "standup"
                            ? "No standups linked"
                            : sessionFilter === "planning"
                              ? "No planning sessions linked"
                              : "No sessions linked"
                        }
                        emptyDescription={
                          sessionFilter === "standup"
                            ? "Create a team standup to keep daily check-ins alongside your planning history."
                            : sessionFilter === "planning"
                              ? "Use the save flow in a planning room to link it to this team."
                              : "Create a planning session or standup to start building team history."
                        }
                        onOpenSession={handleOpenSession}
                      />
                    </Tabs.Panel>
                  </Tabs.Root>
                ) : (
                  <EmptyState
                    icon={<Building2 className="h-8 w-8" />}
                    title={
                      selectedTeam.currentUserStatus === "pending"
                        ? "Access pending"
                        : "Restricted team"
                    }
                    description={
                      selectedTeam.currentUserStatus === "pending"
                        ? "A team admin needs to approve your request before you can view or create sessions."
                        : "You cannot view or create sessions for this team until a team admin approves you."
                    }
                  />
                )}
              </SurfaceCard>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
