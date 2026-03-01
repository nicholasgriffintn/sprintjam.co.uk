import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { TeamIntegrationStatus } from "@sprintjam/types";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AdminSidebar } from "@/components/workspace/AdminSidebar";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { RoomSettingsTabs } from "@/components/RoomSettingsTabs";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { useRoomState } from "@/context/RoomContext";
import { useTeamOAuth } from "@/hooks/useTeamOAuth";
import { toast } from "@/components/ui";
import { getTeamSettings, saveTeamSettings } from "@/lib/workspace-service";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import type { RoomSettings } from "@/types";

function metaStr(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const val = metadata?.[key];
  return typeof val === "string" && val ? val : undefined;
}

export default function WorkspaceTeamSettings() {
  usePageMeta(META_CONFIGS.workspaceAdminTeamSettings);

  const {
    user,
    teams,
    selectedTeamId,
    isAuthenticated,
    isLoading,
    error,
    refreshWorkspace,
  } = useWorkspaceData();

  const { goToLogin, goToWorkspaceAdminTeams } = useSessionActions();
  const { serverDefaults } = useRoomState();
  const queryClient = useQueryClient();

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;
  const defaults = serverDefaults?.roomSettings;
  const structuredOptions = serverDefaults?.structuredVotingOptions ?? [];
  const votingPresets = serverDefaults?.votingSequences;
  const extraVoteOptions = serverDefaults?.extraVoteOptions;

  const settingsQueryKey = ["team-settings", selectedTeamId] as const;

  const settingsQuery = useQuery<RoomSettings | null>({
    queryKey: settingsQueryKey,
    enabled: selectedTeamId !== null,
    queryFn: () => getTeamSettings(selectedTeamId!),
    staleTime: 30_000,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: RoomSettings) =>
      saveTeamSettings(selectedTeamId!, settings),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsQueryKey, saved);
      toast.success("Default settings saved");
    },
  });

  const settingsRef = useRef<RoomSettings | null>(null);
  const [settingsResetKey, setSettingsResetKey] = useState(0);

  const effectiveSettings: RoomSettings | null = useMemo(() => {
    if (settingsQuery.data && defaults)
      return { ...defaults, ...settingsQuery.data };
    return defaults ?? null;
  }, [settingsQuery.data, defaults]);

  useEffect(() => {
    if (effectiveSettings) {
      settingsRef.current = effectiveSettings;
      setSettingsResetKey((k) => k + 1);
    }
    // Re-run when team changes or settings load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, settingsQuery.data]);

  const jiraOAuth = useTeamOAuth(selectedTeamId, "jira");
  const linearOAuth = useTeamOAuth(selectedTeamId, "linear");
  const githubOAuth = useTeamOAuth(selectedTeamId, "github");

  const handleSaveSettings = () => {
    if (settingsRef.current && selectedTeamId) {
      saveSettingsMutation.mutate(settingsRef.current);
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
        <button
          type="button"
          onClick={() => goToWorkspaceAdminTeams()}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to teams
        </button>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              {selectedTeam?.name ?? 'Team'} Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Default settings and integrations for this team
            </p>
          </div>
        </div>

        {!selectedTeam && !isLoading && (
          <Alert variant="warning">
            No team selected. Go back and select a team first.
          </Alert>
        )}

        {selectedTeam && (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <AdminSidebar activeScreen="workspaceAdminTeams" />
            <div className="space-y-6">
              <SurfaceCard className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Default Settings
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    These settings are preloaded when creating a room for this
                    team.
                  </p>
                </div>

                {settingsQuery.isLoading || !effectiveSettings || !defaults ? (
                  <div className="flex items-center gap-3">
                    <Spinner />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Loading settings…
                    </span>
                  </div>
                ) : (
                  <>
                    <RoomSettingsTabs
                      initialSettings={effectiveSettings}
                      defaultSettings={defaults}
                      structuredVotingOptions={structuredOptions}
                      votingPresets={votingPresets}
                      extraVoteOptions={extraVoteOptions}
                      onSettingsChange={(updated) => {
                        settingsRef.current = updated;
                      }}
                      resetKey={settingsResetKey}
                      isCreating={true}
                      teamId={selectedTeamId}
                    />

                    {saveSettingsMutation.error instanceof Error && (
                      <Alert variant="warning">
                        {saveSettingsMutation.error.message}
                      </Alert>
                    )}

                    <Button
                      onClick={handleSaveSettings}
                      isLoading={saveSettingsMutation.isPending}
                    >
                      Save default settings
                    </Button>
                  </>
                )}
              </SurfaceCard>

              <SurfaceCard className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Integrations
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Connect services at the team level. All rooms in this team
                    will use these credentials automatically.
                  </p>
                </div>

                <IntegrationRow
                  label="Jira"
                  description="Import Jira issues and sync story points"
                  status={jiraOAuth.status}
                  loading={jiraOAuth.loading}
                  error={jiraOAuth.error}
                  onConnect={jiraOAuth.connect}
                  onDisconnect={jiraOAuth.disconnect}
                  metadata={
                    jiraOAuth.status.connected
                      ? [
                          metaStr(jiraOAuth.status.metadata, 'jiraDomain'),
                          metaStr(jiraOAuth.status.metadata, 'jiraUserEmail'),
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      : undefined
                  }
                />

                <IntegrationRow
                  label="Linear"
                  description="Import Linear issues and sync estimates"
                  status={linearOAuth.status}
                  loading={linearOAuth.loading}
                  error={linearOAuth.error}
                  onConnect={linearOAuth.connect}
                  onDisconnect={linearOAuth.disconnect}
                  metadata={
                    linearOAuth.status.connected
                      ? [
                          metaStr(
                            linearOAuth.status.metadata,
                            'linearOrganizationId',
                          )
                            ? `Org: ${metaStr(linearOAuth.status.metadata, 'linearOrganizationId')}`
                            : undefined,
                          metaStr(
                            linearOAuth.status.metadata,
                            'linearUserEmail',
                          ),
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      : undefined
                  }
                />

                <IntegrationRow
                  label="GitHub"
                  description="Import GitHub issues and sync estimates"
                  status={githubOAuth.status}
                  loading={githubOAuth.loading}
                  error={githubOAuth.error}
                  onConnect={githubOAuth.connect}
                  onDisconnect={githubOAuth.disconnect}
                  metadata={
                    githubOAuth.status.connected
                      ? [
                          metaStr(githubOAuth.status.metadata, 'githubLogin'),
                          metaStr(
                            githubOAuth.status.metadata,
                            'defaultOwner',
                          ) &&
                          metaStr(githubOAuth.status.metadata, 'defaultRepo')
                            ? `${metaStr(githubOAuth.status.metadata, 'defaultOwner')}/${metaStr(githubOAuth.status.metadata, 'defaultRepo')}`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      : undefined
                  }
                />
              </SurfaceCard>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

function IntegrationRow({
  label,
  description,
  status,
  loading,
  error,
  onConnect,
  onDisconnect,
  metadata,
}: {
  label: string;
  description: string;
  status: TeamIntegrationStatus;
  loading: boolean;
  error: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  metadata?: string;
}) {
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);

  const handleDisconnect = () => {
    setIsDisconnectConfirmOpen(true);
  };

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {status.connected ? `✓ Connected to ${label}` : label}
            </p>
            {status.connected && metadata ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {metadata}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
            {status.connected && status.authorizedBy && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Authorized by {status.authorizedBy}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            {loading ? (
              <Spinner />
            ) : status.connected ? (
              <Button
                onClick={handleDisconnect}
                variant="unstyled"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={onConnect}
                variant="unstyled"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Connect
              </Button>
            )}
          </div>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
      <ConfirmDialog
        open={isDisconnectConfirmOpen}
        onOpenChange={setIsDisconnectConfirmOpen}
        title={`Disconnect ${label}?`}
        description="This will remove the integration for all rooms in this team."
        confirmLabel="Disconnect"
        variant="destructive"
        onConfirm={() => void onDisconnect()}
      />
    </>
  );
}
