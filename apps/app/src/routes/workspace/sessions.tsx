import { useEffect, useMemo, useState } from "react";
import {
  Link,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Building2, MessageSquareQuote, Plus, Target } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { toast } from "@/components/ui";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { TeamSelector } from "@/components/workspace/TeamSelector";
import { SessionList } from "@/components/workspace/SessionList";
import { TeamInsightsPanel } from "@/components/workspace/TeamInsightsPanel";
import { LinkedSessionSummaryPanel } from "@/components/workspace/LinkedSessionSummaryPanel";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { getTeamSessionType } from "@/lib/team-session-metadata";
import type {
  TeamSessionsPage,
  WorkspaceTeamSessionFilter,
} from "@sprintjam/types";
import {
  listTeamSessionsPage,
  requestTeamAccess,
} from "@/lib/workspace-service";
import { BetaBadge } from "@/components/BetaBadge";
import { createMeta } from "@/utils/route-meta";
import {
  WORKSPACE_SESSIONS_PAGE_SIZE,
  loadAccessibleTeamInsights,
  loadAccessibleTeamSessions,
  loadWorkspaceAuthProfile,
} from "@/lib/workspace-loaders";

export const meta = createMeta("workspaceSessions");

export async function loader({ request, context }: LoaderFunctionArgs) {
  const args = { request, context };
  const profile = await loadWorkspaceAuthProfile(args);
  const teams = profile?.teams ?? [];
  const [sessionsByTeamId, teamInsightsByTeamId] = await Promise.all([
    loadAccessibleTeamSessions(args, teams),
    loadAccessibleTeamInsights(args, teams),
  ]);

  return {
    sessionsByTeamId,
    teamInsightsByTeamId,
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
        Failed to load sessions
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <Link
        to="/workspace"
        className="text-sm text-brand-600 underline dark:text-brand-400"
      >
        Back to workspace
      </Link>
    </div>
  );
}

type SessionFilter = WorkspaceTeamSessionFilter;
type TeamSessionPagesByFilter = Partial<Record<SessionFilter, TeamSessionsPage>>;

export default function WorkspaceSessions() {
  const { sessionsByTeamId, teamInsightsByTeamId } =
    useLoaderData<typeof loader>();
  const initialSessionsByTeamId = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(sessionsByTeamId).map(([teamId, page]) => [
          Number(teamId),
          page.sessions,
        ]),
      ),
    [sessionsByTeamId],
  );
  const {
    user,
    teams,
    sessions: initialSessions,
    selectedTeamId,
    setSelectedTeamId,
    isAuthenticated,
    isLoading,
    isLoadingSessions,
    error,
    refreshWorkspace,
  } = useWorkspaceData({ sessionsByTeamId: initialSessionsByTeamId });

  const { goToLogin, goToRoom, startCreateFlow } = useSessionActions();
  const navigateTo = useAppNavigation();
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [sessionPagesByTeamId, setSessionPagesByTeamId] = useState<
    Record<number, TeamSessionPagesByFilter>
  >(() =>
    Object.fromEntries(
      Object.entries(sessionsByTeamId).map(([teamId, page]) => [
        Number(teamId),
        { all: page },
      ]),
    ),
  );
  const [isLoadingFilteredSessions, setIsLoadingFilteredSessions] =
    useState(false);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);

  useEffect(() => {
    setSessionPagesByTeamId(
      Object.fromEntries(
        Object.entries(sessionsByTeamId).map(([teamId, page]) => [
          Number(teamId),
          { all: page },
        ]),
      ),
    );
  }, [sessionsByTeamId]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const selectedTeamSessionPages =
    selectedTeamId === null
      ? null
      : (sessionPagesByTeamId[selectedTeamId] ?? null);
  const selectedTeamSessionPage =
    selectedTeamSessionPages?.[sessionFilter] ?? null;
  const selectedTeamAllSessionsPage = selectedTeamSessionPages?.all ?? null;
  const sessions = selectedTeamSessionPage?.sessions ?? initialSessions;
  const linkedSummarySessions =
    selectedTeamAllSessionsPage?.sessions ?? initialSessions;
  const sessionCounts =
    selectedTeamSessionPage?.counts ?? selectedTeamAllSessionsPage?.counts;
  const totalSessions = sessionCounts?.[sessionFilter] ?? sessions.length;
  const canLoadMoreSessions =
    selectedTeam?.canAccess === true &&
    selectedTeamId !== null &&
    selectedTeamSessionPage?.pagination.hasMore === true;

  useEffect(() => {
    if (
      selectedTeamId === null ||
      !selectedTeam?.canAccess ||
      sessionPagesByTeamId[selectedTeamId]?.[sessionFilter]
    ) {
      return;
    }

    let isCancelled = false;
    setIsLoadingFilteredSessions(true);

    void listTeamSessionsPage(selectedTeamId, {
      limit: WORKSPACE_SESSIONS_PAGE_SIZE,
      offset: 0,
      type: sessionFilter,
    })
      .then((page) => {
        if (isCancelled) {
          return;
        }

        setSessionPagesByTeamId((current) => ({
          ...current,
          [selectedTeamId]: {
            ...(current[selectedTeamId] ?? {}),
            [sessionFilter]: page,
          },
        }));
      })
      .catch((err) => {
        if (isCancelled) {
          return;
        }

        const message =
          err instanceof Error ? err.message : "Unable to load sessions";
        toast.error(message);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingFilteredSessions(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedTeam, selectedTeamId, sessionFilter, sessionPagesByTeamId]);

  const handleOpenSession = (session: (typeof sessions)[number]) => {
    const targetKey = session.roomKey.trim();
    if (!targetKey) {
      return;
    }

    const sessionType = getTeamSessionType(session);
    if (sessionType === "standup") {
      navigateTo("standupJoin", { standupKey: targetKey });
      return;
    }

    if (sessionType === "wheel") {
      navigateTo("wheel", { wheelKey: targetKey });
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

  const handleLoadMoreSessions = async () => {
    if (
      selectedTeamId === null ||
      selectedTeamSessionPage?.pagination.nextOffset === null ||
      selectedTeamSessionPage?.pagination.nextOffset === undefined
    ) {
      return;
    }

    setIsLoadingMoreSessions(true);
    try {
      const nextPage = await listTeamSessionsPage(selectedTeamId, {
        limit: WORKSPACE_SESSIONS_PAGE_SIZE,
        offset: selectedTeamSessionPage.pagination.nextOffset,
        type: sessionFilter,
      });
      setSessionPagesByTeamId((current) => {
        const existingPage =
          current[selectedTeamId]?.[sessionFilter] ?? selectedTeamSessionPage;
        const existingSessionIds = new Set(
          existingPage.sessions.map((session) => session.id),
        );
        const newSessions = nextPage.sessions.filter(
          (session) => !existingSessionIds.has(session.id),
        );

        return {
          ...current,
          [selectedTeamId]: {
            ...(current[selectedTeamId] ?? {}),
            [sessionFilter]: {
              sessions: [...existingPage.sessions, ...newSessions],
              pagination: nextPage.pagination,
              counts: nextPage.counts,
            },
          },
        };
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load more sessions";
      toast.error(message);
    } finally {
      setIsLoadingMoreSessions(false);
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
            View and manage planning sessions, standups, and wheels
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
                  teamName={selectedTeam.name}
                  insights={teamInsightsByTeamId[selectedTeam.id] ?? null}
                  sessionCounts={selectedTeamAllSessionsPage?.counts}
                />
              ) : (
                <Alert variant="warning">
                  {selectedTeam.currentUserStatus === "pending"
                    ? "Your access request is pending team admin approval."
                    : "This is a restricted team. Request access from a team admin to view sessions."}
                </Alert>
              )}

              <SurfaceCard className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                    <Badge
                      variant="success"
                      size="sm"
                      className="w-fit self-start font-semibold sm:self-auto"
                    >
                      <Target className="mr-1.5 h-3.5 w-3.5" />
                      {totalSessions}
                    </Badge>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => startCreateFlow(selectedTeam.id)}
                        icon={<Plus className="h-4 w-4" />}
                        disabled={!selectedTeam.canAccess}
                        className="w-full sm:w-auto"
                      >
                        New planning session
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigateTo("standupCreate")}
                        icon={<MessageSquareQuote className="h-4 w-4" />}
                        disabled={!selectedTeam.canAccess}
                        className="w-full sm:w-auto"
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
                  <div className="space-y-4">
                    <LinkedSessionSummaryPanel
                      sessions={linkedSummarySessions}
                    />
                    <Tabs.Root
                      value={sessionFilter}
                      onValueChange={(value) =>
                        setSessionFilter(value as SessionFilter)
                      }
                    >
                      <Tabs.List fullWidth>
                        <Tabs.Tab value="all">
                          All ({sessionCounts?.all ?? totalSessions})
                        </Tabs.Tab>
                        <Tabs.Tab value="planning">
                          Planning ({sessionCounts?.planning ?? 0})
                        </Tabs.Tab>
                        <Tabs.Tab value="standup">
                          Standups ({sessionCounts?.standup ?? 0})
                        </Tabs.Tab>
                        <Tabs.Tab value="wheel">
                          Wheels ({sessionCounts?.wheel ?? 0})
                        </Tabs.Tab>
                      </Tabs.List>

                      <Tabs.Panel value={sessionFilter}>
                        <SessionList
                          sessions={sessions}
                          isLoading={
                            isLoadingSessions || isLoadingFilteredSessions
                          }
                          emptyTitle={
                            sessionFilter === "standup"
                              ? "No standups linked"
                              : sessionFilter === "wheel"
                                ? "No wheels linked"
                                : sessionFilter === "planning"
                                  ? "No planning sessions linked"
                                  : "No sessions linked"
                          }
                          emptyDescription={
                            sessionFilter === "standup"
                              ? "Create a team standup to link it here."
                              : sessionFilter === "wheel"
                                ? "Create or link a wheel to show it here."
                                : sessionFilter === "planning"
                                  ? "Use the save flow in a planning room to link it to this team."
                                  : "Create or link a session to show it here."
                          }
                          onOpenSession={handleOpenSession}
                        />
                        {canLoadMoreSessions && (
                          <div className="flex justify-center pt-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleLoadMoreSessions()}
                              isLoading={isLoadingMoreSessions}
                            >
                              Load more sessions
                            </Button>
                          </div>
                        )}
                      </Tabs.Panel>
                    </Tabs.Root>
                  </div>
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
