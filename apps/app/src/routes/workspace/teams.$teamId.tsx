import { useMemo, useState } from "react";
import {
  Link,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  Copy,
  ExternalLink,
  MessageSquareQuote,
  Plus,
  Radio,
} from "lucide-react";
import type { TeamSession } from "@sprintjam/types";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SessionList } from "@/components/workspace/SessionList";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { createMeta } from "@/utils/route-meta";
import { copyText } from "@/lib/clipboard";
import {
  listTeamSessions,
  requestTeamAccess,
} from "@/lib/workspace-service";
import {
  getTeamSessionType,
  type TeamSessionType,
} from "@/lib/team-session-metadata";
import {
  loadTeamSessions,
  loadWorkspaceAuthProfile,
} from "@/lib/workspace-loaders";
import { toast } from "@/components/ui";
import { getInitials } from "@/utils/initials";

export const meta = createMeta("workspaceTeam");

function parseTeamId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const teamId = Number.parseInt(value, 10);
  return Number.isNaN(teamId) ? null : teamId;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const teamId = parseTeamId(params.teamId);
  if (teamId === null) {
    throw new Response("Team not found", { status: 404 });
  }

  const args = { request, context };
  const profile = await loadWorkspaceAuthProfile(args);
  const team = profile?.teams.find((candidate) => candidate.id === teamId);
  const sessions = team?.canAccess ? await loadTeamSessions(args, teamId) : [];

  return {
    teamId,
    sessions,
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
        Failed to load team
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <Link
        to="/workspace/sessions"
        className="text-sm text-brand-600 underline dark:text-brand-400"
      >
        Back to sessions
      </Link>
    </div>
  );
}

export default function WorkspaceTeamHome() {
  const { teamId, sessions: initialSessions } = useLoaderData<typeof loader>();
  const {
    user,
    teams,
    setSelectedTeamId,
    isAuthenticated,
    isLoading,
    error,
    refreshWorkspace,
  } = useWorkspaceData();
  const { goToLogin, goToRoom, startCreateFlow } = useSessionActions();
  const navigateTo = useAppNavigation();
  const [isCopied, setIsCopied] = useState(false);
  const team = teams.find((candidate) => candidate.id === teamId) ?? null;
  const teamUrl =
    typeof window === "undefined"
      ? `/workspace/teams/${teamId}`
      : `${window.location.origin}/workspace/teams/${teamId}`;

  const sessionsQuery = useQuery<TeamSession[]>({
    queryKey: ["workspace-team-home-sessions", teamId],
    enabled: Boolean(team?.canAccess),
    initialData: initialSessions,
    queryFn: () => listTeamSessions(teamId),
    staleTime: 0,
  });
  const activeSessions = useMemo(
    () =>
      (sessionsQuery.data ?? []).filter(
        (session) => session.completedAt === null,
      ),
    [sessionsQuery.data],
  );
  const activePlanningCount = useMemo(
    () =>
      activeSessions.filter(
        (session) => getTeamSessionType(session) === "planning",
      ).length,
    [activeSessions],
  );
  const activeStandupCount = activeSessions.length - activePlanningCount;

  const requestAccessMutation = useMutation({
    mutationFn: () => requestTeamAccess(teamId),
    onSuccess: async () => {
      await refreshWorkspace(true);
      toast.success("Access request sent");
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Unable to request access";
      toast.error(message);
    },
  });

  const handleOpenSession = (session: TeamSession) => {
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

  const handleCopy = async () => {
    try {
      await copyText(teamUrl);
      setIsCopied(true);
      toast.success("Team page link copied");
    } catch {
      toast.error("Couldn't copy team page link");
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            {team && (
              <Avatar
                src={team.logoUrl ?? undefined}
                alt={`${team.name} logo`}
                fallback={getInitials(team.name)}
                className="mt-1 h-12 w-12 shrink-0 rounded-2xl bg-slate-200 text-base font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10"
                fallbackClassName="bg-brand-500/10 text-brand-700 dark:text-brand-300"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">
                Team home
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold text-slate-950 dark:text-white sm:text-3xl">
                {team?.name ?? "Team"}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Join an active team session or start the next planning room from
                the same shared page.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            icon={<Copy className="h-4 w-4" />}
            onClick={() => void handleCopy()}
          >
            {isCopied ? "Copied" : "Copy link"}
          </Button>
        </div>

        {!team && !isLoading && (
          <Alert variant="warning">
            This team is not available to your workspace account.
          </Alert>
        )}

        {team && !team.canAccess && (
          <SurfaceCard className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {team.currentUserStatus === "pending"
                    ? "Access request pending"
                    : "Restricted team"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {team.currentUserStatus === "pending"
                    ? "A team admin needs to approve your request before you can join or create team sessions."
                    : "Request access to join active sessions and create planning rooms for this team."}
                </p>
              </div>
            </div>
            {team.currentUserStatus !== "pending" && (
              <Button
                onClick={() => requestAccessMutation.mutate()}
                isLoading={requestAccessMutation.isPending}
              >
                Request access
              </Button>
            )}
          </SurfaceCard>
        )}

        {team?.canAccess && (
          <SurfaceCard className="space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Active sessions
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Rooms currently open for this team.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success" size="sm">
                    <Radio className="mr-1.5 h-3.5 w-3.5" />
                    {activeSessions.length} active
                  </Badge>
                  <Badge variant="warning" size="sm">
                    {activePlanningCount} planning
                  </Badge>
                  <Badge variant="info" size="sm">
                    {activeStandupCount} standups
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => startCreateFlow(team.id)}
                >
                  New planning room
                </Button>
                <Button
                  variant="secondary"
                  icon={<MessageSquareQuote className="h-4 w-4" />}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    navigateTo("standupCreate");
                  }}
                >
                  New standup
                </Button>
                <Button
                  variant="secondary"
                  icon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => navigateTo("workspaceSessions")}
                >
                  View all sessions
                </Button>
              </div>
            </div>

            <SessionList
              sessions={activeSessions}
              isLoading={sessionsQuery.isLoading}
              emptyTitle="No active sessions"
              emptyDescription="Start a planning room when the team is ready."
              onOpenSession={handleOpenSession}
            />
          </SurfaceCard>
        )}
      </div>
    </WorkspaceLayout>
  );
}
