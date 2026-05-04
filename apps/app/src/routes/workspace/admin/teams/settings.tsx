import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightLeft,
  Copy,
  ExternalLink,
  MessageSquare,
  Shield,
  Trash2,
  UserMinus,
} from "lucide-react";
import type {
  TeamCollaborationInstallation,
  TeamIntegrationStatus,
  TeamMember,
} from "@sprintjam/types";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AdminSidebar } from "@/components/workspace/AdminSidebar";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import { RoomSettingsTabs } from "@/components/RoomSettingsTabs";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { useRoomState } from "@/context/RoomContext";
import { useTeamOAuth } from "@/hooks/useTeamOAuth";
import { toast } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import {
  addTeamMember,
  approveTeamMember,
  deleteTeamCollaborationInstallation,
  getTeamSettings,
  listTeamCollaborationInstallations,
  listTeamMembers,
  moveTeamMember,
  removeTeamMember,
  saveTeamSettings,
  updateTeamMemberRole,
} from "@/lib/workspace-service";
import type { RoomSettings } from "@/types";
import { createMeta } from "@/utils/route-meta";
import { loadWorkspaceProfile } from "@/lib/workspace-loaders";

export const meta = createMeta("workspaceAdminTeamSettings");

export async function loader({ request, context }: LoaderFunctionArgs) {
  return {
    profile: await loadWorkspaceProfile({ request, context }),
  };
}

function metaStr(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const val = metadata?.[key];
  return typeof val === "string" && val ? val : undefined;
}

export default function WorkspaceTeamSettings() {
  const { profile: initialProfile } = useLoaderData<typeof loader>();
  const {
    profile,
    user,
    teams,
    selectedTeamId,
    isAuthenticated,
    isLoading,
    error,
    refreshWorkspace,
  } = useWorkspaceData({ profile: initialProfile });

  const { goToLogin, goToWorkspaceAdminTeams } = useSessionActions();
  const { serverDefaults } = useRoomState();

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const canManageTeam = selectedTeam?.canManage ?? false;
  const isWorkspaceAdmin = profile?.membership.role === "admin";
  const defaults = serverDefaults.roomSettings;
  const structuredOptions = serverDefaults.structuredVotingOptions;
  const votingPresets = serverDefaults.votingSequences;
  const extraVoteOptions = serverDefaults.extraVoteOptions;

  const queryClient = useQueryClient();
  const settingsQueryKey = ["team-settings", selectedTeamId] as const;
  const teamMembersQueryKey = ["team-members", selectedTeamId] as const;
  const collaborationQueryKey = [
    "team-collaboration-installations",
    selectedTeamId,
  ] as const;
  const settingsRef = useRef<RoomSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsResetKey, setSettingsResetKey] = useState(0);
  const [selectedWorkspaceUserId, setSelectedWorkspaceUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"member" | "admin">(
    "member",
  );
  const [pendingRemovalMember, setPendingRemovalMember] =
    useState<TeamMember | null>(null);
  const [pendingMoveMember, setPendingMoveMember] = useState<TeamMember | null>(
    null,
  );
  const [targetTeamId, setTargetTeamId] = useState("");
  const teamHomeUrl = useMemo(() => {
    if (!selectedTeamId) {
      return null;
    }

    if (typeof window === "undefined") {
      return `https://sprintjam.co.uk/workspace/teams/${selectedTeamId}`;
    }

    return `${window.location.origin}/workspace/teams/${selectedTeamId}`;
  }, [selectedTeamId]);

  const settingsQuery = useQuery<RoomSettings | null>({
    queryKey: settingsQueryKey,
    enabled: selectedTeamId !== null,
    queryFn: () => getTeamSettings(selectedTeamId!),
    staleTime: 0,
  });

  const teamMembersQuery = useQuery<TeamMember[]>({
    queryKey: teamMembersQueryKey,
    enabled: selectedTeamId !== null && canManageTeam,
    queryFn: () => listTeamMembers(selectedTeamId!),
    staleTime: 0,
  });

  const teamMembers = teamMembersQuery.data ?? [];

  const effectiveSettings: RoomSettings = useMemo(() => {
    if (settingsQuery.data) {
      return { ...defaults, ...settingsQuery.data };
    }

    return defaults;
  }, [settingsQuery.data, defaults]);

  useEffect(() => {
    if (effectiveSettings) {
      settingsRef.current = effectiveSettings;
      setSettingsResetKey((key) => key + 1);
    }
  }, [effectiveSettings, selectedTeamId]);

  const jiraOAuth = useTeamOAuth(selectedTeamId, "jira");
  const linearOAuth = useTeamOAuth(selectedTeamId, "linear");
  const githubOAuth = useTeamOAuth(selectedTeamId, "github");

  const collaborationQuery = useQuery<TeamCollaborationInstallation[]>({
    queryKey: collaborationQueryKey,
    enabled: selectedTeamId !== null,
    queryFn: () => listTeamCollaborationInstallations(selectedTeamId!),
    staleTime: 0,
  });

  const handleSaveSettings = () => {
    if (settingsRef.current && selectedTeamId && canManageTeam) {
      setSettingsError(null);
      void saveSettingsMutation.mutateAsync(settingsRef.current);
    }
  };

  const availableWorkspaceMembers = useMemo(() => {
    const currentIds = new Set(teamMembers.map((member) => member.id));
    return (profile?.members ?? [])
      .filter((member) => member.status === "active")
      .filter((member) => !currentIds.has(member.id));
  }, [profile?.members, teamMembers]);
  const movableTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          team.id !== selectedTeamId && (isWorkspaceAdmin || team.canManage),
      ),
    [isWorkspaceAdmin, selectedTeamId, teams],
  );

  const refreshTeamMembers = async () => {
    if (!selectedTeamId || !canManageTeam) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey }),
      refreshWorkspace(true),
    ]);
  };

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: RoomSettings) =>
      saveTeamSettings(selectedTeamId!, settings),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsQueryKey, saved);
      toast.success("Default settings saved");
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Unable to save default settings",
      );
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload: { userId: number; role: "admin" | "member" }) =>
      addTeamMember(selectedTeamId!, payload.userId, payload.role),
    onSuccess: async () => {
      await refreshTeamMembers();
      setSelectedWorkspaceUserId("");
      setSelectedRole("member");
      toast.success("Team member added");
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to add team member",
      );
    },
  });

  const approveMemberMutation = useMutation({
    mutationFn: (userId: number) => approveTeamMember(selectedTeamId!, userId),
    onSuccess: async () => {
      await refreshTeamMembers();
      toast.success("Team member approved");
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to approve member",
      );
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: (payload: { userId: number; role: "admin" | "member" }) =>
      updateTeamMemberRole(selectedTeamId!, payload.userId, payload.role),
    onSuccess: async (_, variables) => {
      await refreshTeamMembers();
      toast.success(
        variables.role === "admin"
          ? "Team admin granted"
          : "Team admin removed",
      );
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to update member role",
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => removeTeamMember(selectedTeamId!, userId),
    onSuccess: async () => {
      await refreshTeamMembers();
      toast.success("Team member removed");
      setPendingRemovalMember(null);
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to remove team member",
      );
    },
  });

  const moveMemberMutation = useMutation({
    mutationFn: (payload: {
      targetTeamId: number;
      userId: number;
      role: "admin" | "member";
    }) =>
      moveTeamMember(
        selectedTeamId!,
        payload.userId,
        payload.targetTeamId,
        payload.role,
      ),
    onSuccess: async () => {
      await refreshTeamMembers();
      toast.success("Team member moved");
      setPendingMoveMember(null);
      setTargetTeamId("");
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to move team member",
      );
    },
  });

  const disconnectCollaborationMutation = useMutation({
    mutationFn: (installationId: number) =>
      deleteTeamCollaborationInstallation(selectedTeamId!, installationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: collaborationQueryKey });
      toast.success("Collaboration app disconnected");
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Unable to disconnect collaboration app",
      );
    },
  });

  const handleApproveMember = async (userId: number) => {
    if (!selectedTeamId || !canManageTeam) {
      return;
    }

    setSettingsError(null);
    await approveMemberMutation.mutateAsync(userId);
  };

  const handleUpdateMemberRole = async (
    userId: number,
    role: "admin" | "member",
  ) => {
    if (!selectedTeamId || !canManageTeam) {
      return;
    }

    setSettingsError(null);
    await updateMemberRoleMutation.mutateAsync({ userId, role });
  };

  const handleAddMember = async () => {
    if (!selectedWorkspaceUserId || !selectedTeamId || !canManageTeam) {
      return;
    }

    setSettingsError(null);
    await addMemberMutation.mutateAsync({
      userId: Number.parseInt(selectedWorkspaceUserId, 10),
      role: selectedRole,
    });
  };

  const handleRemoveMember = async () => {
    if (!pendingRemovalMember || !selectedTeamId || !canManageTeam) {
      return;
    }

    setSettingsError(null);
    await removeMemberMutation.mutateAsync(pendingRemovalMember.id);
  };

  const handleMoveMember = async () => {
    if (
      !pendingMoveMember ||
      !targetTeamId ||
      !selectedTeamId ||
      !isWorkspaceAdmin
    ) {
      return;
    }

    setSettingsError(null);
    await moveMemberMutation.mutateAsync({
      targetTeamId: Number.parseInt(targetTeamId, 10),
      userId: pendingMoveMember.id,
      role: pendingMoveMember.role,
    });
  };

  const handleCopyTeamHomeUrl = async () => {
    if (!teamHomeUrl) {
      return;
    }

    try {
      await copyText(teamHomeUrl);
      toast.success("Team page URL copied");
    } catch (error) {
      console.error("Failed to copy team page URL:", error);
      toast.error("Couldn't copy team page URL");
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              {selectedTeam?.name ?? "Team"} Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Default settings, integrations, and access for this team
            </p>
          </div>
          {teamHomeUrl && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy className="h-4 w-4" />}
                onClick={() => void handleCopyTeamHomeUrl()}
                className="w-full sm:w-auto"
              >
                Copy team page
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={() => window.open(teamHomeUrl, "_blank")}
                className="w-full sm:w-auto"
              >
                Open
              </Button>
            </div>
          )}
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
              {!canManageTeam && (
                <Alert variant="warning">
                  You can view this team, but only team admins can change
                  settings or membership.
                </Alert>
              )}

              <SurfaceCard className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Team members
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Add workspace members, promote team admins, and remove
                    access.
                  </p>
                </div>

                {canManageTeam && (
                  <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 lg:grid-cols-[1fr_180px_160px] dark:border-white/10 dark:bg-slate-900/50">
                    <Select
                      options={availableWorkspaceMembers.map((member) => ({
                        label: member.name?.trim() || member.email,
                        value: String(member.id),
                      }))}
                      value={selectedWorkspaceUserId}
                      onValueChange={setSelectedWorkspaceUserId}
                      placeholder="Select a workspace member"
                    />
                    <Select
                      options={[
                        { label: "Team member", value: "member" },
                        { label: "Team admin", value: "admin" },
                      ]}
                      value={selectedRole}
                      onValueChange={(value) =>
                        setSelectedRole(value as "member" | "admin")
                      }
                    />
                    <Button
                      onClick={() => void handleAddMember()}
                      isLoading={addMemberMutation.isPending}
                      disabled={!selectedWorkspaceUserId}
                      className="w-full"
                    >
                      Add to team
                    </Button>
                  </div>
                )}

                {!canManageTeam ? (
                  <Alert variant="info">
                    Team membership is only visible to team admins.
                  </Alert>
                ) : teamMembersQuery.isLoading ? (
                  <div className="flex items-center gap-3">
                    <Spinner />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Loading team members…
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No team members yet.
                      </p>
                    )}

                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {member.name?.trim() || member.email}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {member.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Badge
                              variant={
                                member.status === "pending"
                                  ? "warning"
                                  : member.role === "admin"
                                    ? "primary"
                                    : "default"
                              }
                              size="sm"
                            >
                              {member.status === "pending"
                                ? "Pending"
                                : member.role === "admin"
                                  ? "Admin"
                                  : "Member"}
                            </Badge>
                            {member.role === "admin" &&
                              member.status === "active" && (
                                <Badge variant="success" size="sm">
                                  <Shield className="mr-1 h-3.5 w-3.5" />
                                  Can manage
                                </Badge>
                              )}
                          </div>
                        </div>

                        {canManageTeam && (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {member.status === "pending" ? (
                              <Button
                                size="sm"
                                isLoading={
                                  approveMemberMutation.isPending &&
                                  approveMemberMutation.variables === member.id
                                }
                                onClick={() =>
                                  void handleApproveMember(member.id)
                                }
                              >
                                Approve
                              </Button>
                            ) : member.role === "admin" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                isLoading={
                                  updateMemberRoleMutation.isPending &&
                                  updateMemberRoleMutation.variables?.userId ===
                                    member.id
                                }
                                onClick={() =>
                                  void handleUpdateMemberRole(
                                    member.id,
                                    "member",
                                  )
                                }
                              >
                                Make member
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                isLoading={
                                  updateMemberRoleMutation.isPending &&
                                  updateMemberRoleMutation.variables?.userId ===
                                    member.id
                                }
                                onClick={() =>
                                  void handleUpdateMemberRole(
                                    member.id,
                                    "admin",
                                  )
                                }
                              >
                                Make admin
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="danger"
                              icon={<UserMinus className="h-4 w-4" />}
                              isLoading={
                                removeMemberMutation.isPending &&
                                removeMemberMutation.variables === member.id
                              }
                              onClick={() => setPendingRemovalMember(member)}
                            >
                              Remove
                            </Button>
                            {isWorkspaceAdmin && member.status === "active" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<ArrowRightLeft className="h-4 w-4" />}
                                disabled={movableTeams.length === 0}
                                onClick={() => setPendingMoveMember(member)}
                              >
                                Move
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SurfaceCard>

              <SurfaceCard className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Default settings
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    These settings are preloaded when creating a room for this
                    team.
                  </p>
                </div>

                {settingsQuery.isLoading ? (
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

                    {settingsError && (
                      <Alert variant="warning">{settingsError}</Alert>
                    )}

                    <Button
                      onClick={handleSaveSettings}
                      isLoading={saveSettingsMutation.isPending}
                      disabled={!canManageTeam}
                      className="w-full sm:w-auto"
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
                  disabled={!canManageTeam}
                  onConnect={jiraOAuth.connect}
                  onDisconnect={jiraOAuth.disconnect}
                  metadata={
                    jiraOAuth.status.connected
                      ? [
                          metaStr(jiraOAuth.status.metadata, "jiraDomain"),
                          metaStr(jiraOAuth.status.metadata, "jiraUserEmail"),
                        ]
                          .filter(Boolean)
                          .join(" · ") || undefined
                      : undefined
                  }
                />

                <IntegrationRow
                  label="Linear"
                  description="Import Linear issues and sync estimates"
                  status={linearOAuth.status}
                  loading={linearOAuth.loading}
                  error={linearOAuth.error}
                  disabled={!canManageTeam}
                  onConnect={linearOAuth.connect}
                  onDisconnect={linearOAuth.disconnect}
                  metadata={
                    linearOAuth.status.connected
                      ? [
                          metaStr(
                            linearOAuth.status.metadata,
                            "linearOrganizationId",
                          )
                            ? `Org: ${metaStr(linearOAuth.status.metadata, "linearOrganizationId")}`
                            : undefined,
                          metaStr(
                            linearOAuth.status.metadata,
                            "linearUserEmail",
                          ),
                        ]
                          .filter(Boolean)
                          .join(" · ") || undefined
                      : undefined
                  }
                />

                <IntegrationRow
                  label="GitHub"
                  description="Import GitHub issues and sync estimates"
                  status={githubOAuth.status}
                  loading={githubOAuth.loading}
                  error={githubOAuth.error}
                  disabled={!canManageTeam}
                  onConnect={githubOAuth.connect}
                  onDisconnect={githubOAuth.disconnect}
                  metadata={
                    githubOAuth.status.connected
                      ? [
                          metaStr(githubOAuth.status.metadata, "githubLogin"),
                          metaStr(
                            githubOAuth.status.metadata,
                            "defaultOwner",
                          ) &&
                          metaStr(githubOAuth.status.metadata, "defaultRepo")
                            ? `${metaStr(githubOAuth.status.metadata, "defaultOwner")}/${metaStr(githubOAuth.status.metadata, "defaultRepo")}`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(" · ") || undefined
                      : undefined
                  }
                />
              </SurfaceCard>

              <SurfaceCard className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Collaboration apps
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Link this team to chat apps that can launch SprintJam from a
                    shared conversation.
                  </p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-950 dark:text-blue-200">
                          How to connect Microsoft Teams
                        </p>
                        <p className="mt-1 text-xs text-blue-900 dark:text-blue-300">
                          In Microsoft Teams, go to Apps, install SprintJam, and
                          open it from the channel, chat, or meeting you want to
                          connect. Then sign in, select this workspace team, and
                          connect it.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {collaborationQuery.isLoading ? (
                  <div className="flex items-center gap-3">
                    <Spinner />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Loading collaboration apps…
                    </span>
                  </div>
                ) : collaborationQuery.data?.length ? (
                  <div className="space-y-3">
                    {collaborationQuery.data.map((installation) => (
                      <CollaborationInstallationRow
                        key={installation.id}
                        installation={installation}
                        disabled={!canManageTeam}
                        isDisconnecting={
                          disconnectCollaborationMutation.isPending &&
                          disconnectCollaborationMutation.variables ===
                            installation.id
                        }
                        onDisconnect={() =>
                          disconnectCollaborationMutation.mutateAsync(
                            installation.id,
                          )
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="mt-0.5 h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          No collaboration apps connected
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Add the SprintJam Teams app and open the launch tab to
                          connect a channel, chat, or meeting to this workspace
                          team.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </SurfaceCard>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingRemovalMember !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemovalMember(null);
          }
        }}
        title="Remove team member?"
        description={
          pendingRemovalMember
            ? `This removes ${pendingRemovalMember.email} from ${selectedTeam?.name ?? "this team"}.`
            : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => void handleRemoveMember()}
      />
      <Modal
        isOpen={pendingMoveMember !== null}
        onClose={() => {
          setPendingMoveMember(null);
          setTargetTeamId("");
        }}
        title="Move team member"
        size="sm"
      >
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {pendingMoveMember
              ? `${pendingMoveMember.email} will be removed from ${selectedTeam?.name ?? "this team"} and added to another team.`
              : "Choose the destination team."}
          </p>
          <Select
            options={movableTeams.map((team) => ({
              label: team.name,
              value: String(team.id),
            }))}
            value={targetTeamId}
            onValueChange={setTargetTeamId}
            placeholder="Select destination team"
          />
          {movableTeams.length === 0 && (
            <Alert variant="warning">
              Create another team or grant access to one before moving members.
            </Alert>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPendingMoveMember(null);
                setTargetTeamId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleMoveMember()}
              isLoading={moveMemberMutation.isPending}
              disabled={!targetTeamId}
            >
              Move member
            </Button>
          </div>
        </div>
      </Modal>
    </WorkspaceLayout>
  );
}

function getCollaborationLabel(installation: TeamCollaborationInstallation) {
  if (installation.displayName) {
    return installation.displayName;
  }
  if (installation.externalChannelId) {
    return "Teams channel";
  }
  if (installation.externalChatId) {
    return "Teams chat";
  }
  if (installation.externalMeetingId) {
    return "Teams meeting";
  }
  if (installation.externalTeamId) {
    return "Teams team";
  }
  return "Teams";
}

function CollaborationInstallationRow({
  installation,
  disabled,
  isDisconnecting,
  onDisconnect,
}: {
  installation: TeamCollaborationInstallation;
  disabled: boolean;
  isDisconnecting: boolean;
  onDisconnect: () => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {getCollaborationLabel(installation)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Microsoft Teams · Tenant {installation.tenantId}
            {metaStr(installation.metadata, "frameContext")
              ? ` · ${metaStr(installation.metadata, "frameContext")}`
              : ""}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Connected {new Date(installation.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          onClick={() => void onDisconnect()}
          disabled={disabled}
          isLoading={isDisconnecting}
          variant="secondary"
          size="sm"
          icon={<Trash2 className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}

function IntegrationRow({
  label,
  description,
  status,
  loading,
  error,
  disabled,
  onConnect,
  onDisconnect,
  metadata,
}: {
  label: string;
  description: string;
  status: TeamIntegrationStatus;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  metadata?: string;
}) {
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);

  const handleDisconnect = () => {
    if (!disabled) {
      setIsDisconnectConfirmOpen(true);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                disabled={disabled}
                variant="unstyled"
                className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={onConnect}
                disabled={disabled}
                variant="unstyled"
                className="w-full rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
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
        description={`This removes the shared ${label} credentials for this team.`}
        confirmLabel="Disconnect"
        variant="destructive"
        onConfirm={() => void onDisconnect()}
      />
    </>
  );
}
