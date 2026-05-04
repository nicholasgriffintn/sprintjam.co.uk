import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Building2, ExternalLink, MessageSquare } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { createMeta } from "@/utils/route-meta";
import { loadWorkspaceProfile } from "@/lib/workspace-loaders";
import { getTeamsContext } from "@/lib/teams-client";
import { saveTeamsCollaborationInstallation } from "@/lib/workspace-service";
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
  externalUserId: string | null;
  displayName: string | null;
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
    externalUserId: params.get("userId")?.trim() || null,
    displayName: params.get("name")?.trim() || null,
    source: tenantId ? "query" : "empty",
  };
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
  const { goToLogin, goToWorkspaceSessions, startCreateFlow } =
    useSessionActions();
  const queryClient = useQueryClient();
  const selectedTeam =
    teams.find((team) => team.id === selectedTeamId) ?? null;
  const [context, setContext] = useState<TeamsLaunchContext>(() =>
    typeof window === "undefined"
      ? {
          tenantId: "",
          externalTeamId: null,
          externalChannelId: null,
          externalChatId: null,
          externalUserId: null,
          displayName: null,
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
        externalUserId: teamsContext.user?.id ?? queryContext.externalUserId,
        displayName:
          teamsContext.channel?.displayName ??
          teamsContext.team?.displayName ??
          queryContext.displayName,
        source: "teams",
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const canConnect = Boolean(selectedTeam?.canManage && context.tenantId);
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
        externalUserId: context.externalUserId,
        displayName: contextLabel,
        metadata: { source: context.source },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["team-collaboration-installations", selectedTeamId],
      });
      toast.success("Teams context connected");
    },
  });

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
            Connect this Teams context to a workspace team, then start a
            planning room with the team defaults already in place.
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
                  ? `Tenant ${context.tenantId}`
                  : "Teams context has not been detected yet."}
              </p>
            </div>
          </div>

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
              disabled={!canConnect}
              isLoading={connectMutation.isPending}
            >
              Connect Teams context
            </Button>
            <Button
              variant="secondary"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => startCreateFlow(selectedTeamId ?? undefined)}
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
