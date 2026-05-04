import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Building2,
  ExternalLink,
  MessageSquare,
  Play,
  Radio,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamSession } from "@sprintjam/types";

import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { createMeta } from "@/utils/route-meta";
import { loadWorkspaceProfile } from "@/lib/workspace-loaders";
import { getTeamsContext } from "@/lib/teams-client";
import {
  listTeamSessions,
  resolveTeamsCollaborationInstallation,
  saveTeamsCollaborationInstallation,
} from "@/lib/workspace-service";
import { toast } from "@/components/ui";

export const meta = createMeta("teamsLaunch");

export async function loader({ request, context }: LoaderFunctionArgs) {
  return {
    profile: await loadWorkspaceProfile({ request, context }),
  };
}

type TeamsLaunchContext = {
  tenantId: string;
  externalTeamId: string | null;
  externalChannelId: string | null;
  externalChatId: string | null;
  externalMeetingId: string | null;
  externalUserId: string | null;
  displayName: string | null;
  frameContext: string | null;
  source: "teams" | "query" | "empty";
};

function getQueryContext(): TeamsLaunchContext {
  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get("tenantId")?.trim() || "";

  return {
    tenantId,
    externalTeamId: params.get("teamId")?.trim() || null,
    externalChannelId: params.get("channelId")?.trim() || null,
    externalChatId: params.get("chatId")?.trim() || null,
    externalMeetingId: params.get("meetingId")?.trim() || null,
    externalUserId: params.get("userId")?.trim() || null,
    displayName: params.get("name")?.trim() || null,
    frameContext: params.get("frameContext")?.trim() || null,
    source: tenantId ? "query" : "empty",
  };
}

function getTeamsFrameLabel(frameContext: string | null): string {
  switch (frameContext) {
    case "sidePanel":
      return "Meeting side panel";
    case "meetingStage":
      return "Meeting stage";
    case "content":
      return "Teams tab";
    case "task":
      return "Teams task view";
    case "setting":
      return "Teams setup view";
    case "remove":
      return "Teams remove view";
    default:
      return "Teams tab";
  }
}

export default function TeamsLaunch() {
  const { profile: initialProfile } = useLoaderData<typeof loader>();
  const {
    user,
    teams,
    selectedTeamId,
    isAuthenticated,
    isLoading,
    error,
    setSelectedTeamId,
    refreshWorkspace,
  } = useWorkspaceData({ profile: initialProfile });
  const { goToLogin, goToRoom, goToWorkspaceSessions, startCreateFlow } =
    useSessionActions();
  const queryClient = useQueryClient();
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const [context, setContext] = useState<TeamsLaunchContext>(() =>
    typeof window === "undefined"
      ? {
          tenantId: "",
          externalTeamId: null,
          externalChannelId: null,
          externalChatId: null,
          externalMeetingId: null,
          externalUserId: null,
          displayName: null,
          frameContext: null,
          source: "empty",
        }
      : getQueryContext(),
  );

  useEffect(() => {
    let cancelled = false;
    const queryContext = getQueryContext();

    void getTeamsContext().then((teamsContext) => {
      if (cancelled || !teamsContext) {
        return;
      }

      const tenantId = teamsContext.user?.tenant?.id ?? queryContext.tenantId;
      if (!tenantId) {
        return;
      }

      setContext({
        tenantId,
        externalTeamId:
          teamsContext.team?.groupId ?? queryContext.externalTeamId,
        externalChannelId:
          teamsContext.channel?.id ?? queryContext.externalChannelId,
        externalChatId: teamsContext.chat?.id ?? queryContext.externalChatId,
        externalMeetingId:
          teamsContext.meeting?.id ?? queryContext.externalMeetingId,
        externalUserId: teamsContext.user?.id ?? queryContext.externalUserId,
        displayName:
          teamsContext.channel?.displayName ??
          teamsContext.team?.displayName ??
          queryContext.displayName,
        frameContext:
          teamsContext.page?.frameContext ?? queryContext.frameContext,
        source: "teams",
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasResolvableContext = Boolean(
    context.tenantId &&
    (context.externalTeamId ||
      context.externalChannelId ||
      context.externalChatId ||
      context.externalMeetingId ||
      context.externalUserId),
  );
  const frameLabel = getTeamsFrameLabel(context.frameContext);
  const teamsMetadata = {
    source: context.source,
    frameContext: context.frameContext,
    meetingId: context.externalMeetingId,
  };
  const resolvedInstallationQuery = useQuery({
    queryKey: ["teams-collaboration-installation", context],
    enabled: isAuthenticated && hasResolvableContext,
    queryFn: () =>
      resolveTeamsCollaborationInstallation({
        tenantId: context.tenantId,
        externalTeamId: context.externalTeamId,
        externalChannelId: context.externalChannelId,
        externalChatId: context.externalChatId,
        externalMeetingId: context.externalMeetingId,
        externalUserId: context.externalUserId,
        displayName: context.displayName,
        metadata: teamsMetadata,
      }),
    staleTime: 0,
  });
  const resolvedInstallation = resolvedInstallationQuery.data ?? null;
  const linkedTeam =
    teams.find((team) => team.id === resolvedInstallation?.teamId) ?? null;
  const effectiveTeam = linkedTeam ?? selectedTeam;
  const canConnect = Boolean(selectedTeam?.canManage && hasResolvableContext);
  const canStartMeeting = Boolean(effectiveTeam?.canAccess);
  const sessionsQuery = useQuery<TeamSession[]>({
    queryKey: ["teams-collaboration-sessions", resolvedInstallation?.teamId],
    enabled: resolvedInstallation !== null && Boolean(linkedTeam?.canAccess),
    queryFn: () => listTeamSessions(resolvedInstallation!.teamId),
    staleTime: 0,
  });
  const activeSessions = (sessionsQuery.data ?? []).filter(
    (session) => session.completedAt === null,
  );
  const latestActiveSession = activeSessions[0] ?? null;

  useEffect(() => {
    if (
      resolvedInstallation &&
      selectedTeamId !== resolvedInstallation.teamId
    ) {
      setSelectedTeamId(resolvedInstallation.teamId);
    }
  }, [resolvedInstallation, selectedTeamId, setSelectedTeamId]);

  const contextLabel = useMemo(() => {
    if (context.displayName) {
      return context.displayName;
    }
    if (context.externalChannelId) {
      return "Teams channel";
    }
    if (context.externalChatId) {
      return "Teams chat";
    }
    if (context.externalMeetingId) {
      return "Teams meeting";
    }
    if (context.externalTeamId) {
      return "Teams team";
    }
    return "Teams";
  }, [context]);

  const connectMutation = useMutation({
    mutationFn: () =>
      saveTeamsCollaborationInstallation(selectedTeamId!, {
        tenantId: context.tenantId,
        externalTeamId: context.externalTeamId,
        externalChannelId: context.externalChannelId,
        externalChatId: context.externalChatId,
        externalMeetingId: context.externalMeetingId,
        externalUserId: context.externalUserId,
        displayName: contextLabel,
        metadata: teamsMetadata,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["team-collaboration-installations", selectedTeamId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["teams-collaboration-installation"],
        }),
      ]);
      toast.success("Teams context connected");
    },
  });

  const handleStartMeeting = () => {
    if (!effectiveTeam) {
      return;
    }

    startCreateFlow(effectiveTeam.id);
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
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">
            Microsoft Teams
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white sm:text-3xl">
            Launch SprintJam from Teams
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Use this {frameLabel.toLowerCase()} as the shared SprintJam entry
            point for this Teams conversation.
          </p>
        </div>

        {!context.tenantId && (
          <Alert variant="warning">
            Open this page from a SprintJam Teams app tab to connect the Teams
            tenant and channel context automatically.
          </Alert>
        )}

        <SurfaceCard className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-100 p-2 text-brand-700 dark:bg-brand-400/10 dark:text-brand-200">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {contextLabel}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {context.tenantId
                  ? `${frameLabel} · Tenant ${context.tenantId}`
                  : "Teams context has not been detected yet."}
              </p>
            </div>
          </div>

          {resolvedInstallationQuery.isLoading && (
            <Alert variant="info">Checking this Teams conversation...</Alert>
          )}

          {linkedTeam && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <Radio className="mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                    Linked to {linkedTeam.name}
                  </p>
                  <p className="text-xs text-emerald-900 dark:text-emerald-300">
                    Everyone in this Teams chat, channel, or meeting uses this
                    same SprintJam team context.
                  </p>
                </div>
              </div>
            </div>
          )}

          {linkedTeam && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={handleStartMeeting}
                disabled={!canStartMeeting}
                icon={<Play className="h-4 w-4" />}
                fullWidth
              >
                Start new planning meeting
              </Button>
              <Button
                variant="secondary"
                icon={<ExternalLink className="h-4 w-4" />}
                disabled={!latestActiveSession}
                onClick={() => {
                  if (latestActiveSession) {
                    goToRoom(latestActiveSession.roomKey);
                  }
                }}
                fullWidth
              >
                Join active room
              </Button>
            </div>
          )}

          {linkedTeam && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Active rooms
              </p>
              {sessionsQuery.isLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Loading active rooms...
                </p>
              ) : activeSessions.length > 0 ? (
                <div className="space-y-2">
                  {activeSessions.slice(0, 3).map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => goToRoom(session.roomKey)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <span>
                        <span className="block text-sm font-medium text-slate-900 dark:text-white">
                          {session.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Room {session.roomKey}
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No active planning room yet. Start a meeting when the team is
                  ready.
                </p>
              )}
            </div>
          )}

          {!linkedTeam && resolvedInstallationQuery.isSuccess && (
            <Alert variant="info">
              This Teams conversation is not linked yet. A SprintJam team admin
              can select the workspace team below and connect it once.
            </Alert>
          )}

          {teams.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {teams.map((team) => (
                <button
                  type="button"
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900"
                  data-selected={team.id === selectedTeamId}
                >
                  <Building2 className="mb-3 h-5 w-5 text-slate-500" />
                  <p className="font-medium text-slate-900 dark:text-white">
                    {team.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {team.canManage ? "Can connect Teams" : "View only"}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void connectMutation.mutateAsync()}
              disabled={!canConnect || Boolean(linkedTeam)}
              isLoading={connectMutation.isPending}
            >
              {linkedTeam ? "Teams context connected" : "Connect Teams context"}
            </Button>
            <Button
              variant="secondary"
              icon={<ExternalLink className="h-4 w-4" />}
              disabled={!canStartMeeting}
              onClick={handleStartMeeting}
            >
              Start planning room
            </Button>
            <Button variant="secondary" onClick={goToWorkspaceSessions}>
              View workspace sessions
            </Button>
          </div>

          {connectMutation.error instanceof Error && (
            <Alert variant="warning">{connectMutation.error.message}</Alert>
          )}
        </SurfaceCard>
      </div>
    </WorkspaceLayout>
  );
}
