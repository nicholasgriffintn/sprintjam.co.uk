import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightLeft, Shield, UserMinus } from "lucide-react";
import type { TeamIntegrationStatus, TeamMember } from "@sprintjam/types";

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
import {
  addTeamMember,
  approveTeamMember,
  getTeamSettings,
  listTeamMembers,
  removeTeamMember,
  saveTeamSettings,
  updateTeamMemberRole,
} from "@/lib/workspace-service";
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
    profile,
    user,
    teams,
    selectedTeamId,
    isAuthenticated,
    isLoading,
    error,
    refreshWorkspace,
  } = useWorkspaceData({ includeProfile: true });

  const { goToLogin, goToWorkspaceAdminTeams } = useSessionActions();
  const { serverDefaults } = useRoomState();
  const queryClient = useQueryClient();

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const canManageTeam = selectedTeam?.canManage ?? false;
  const isWorkspaceAdmin = profile?.membership.role === "admin";
  const defaults = serverDefaults?.roomSettings;
  const structuredOptions = serverDefaults?.structuredVotingOptions ?? [];
  const votingPresets = serverDefaults?.votingSequences;
  const extraVoteOptions = serverDefaults?.extraVoteOptions;

  const settingsQueryKey = ["team-settings", selectedTeamId] as const;
  const teamMembersQueryKey = ["team-members", selectedTeamId] as const;

  const settingsQuery = useQuery<RoomSettings | null>({
    queryKey: settingsQueryKey,
    enabled: selectedTeamId !== null,
    queryFn: () => getTeamSettings(selectedTeamId!),
    staleTime: 30_000,
  });

  const teamMembersQuery = useQuery<TeamMember[]>({
    queryKey: teamMembersQueryKey,
    enabled: selectedTeamId !== null && canManageTeam,
    queryFn: () => listTeamMembers(selectedTeamId!),
    staleTime: 15_000,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: RoomSettings) =>
      saveTeamSettings(selectedTeamId!, settings),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsQueryKey, saved);
      toast.success("Default settings saved");
    },
  });

  const refreshTeamMembers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey }),
      refreshWorkspace(true),
    ]);
  };

  const addMemberMutation = useMutation({
    mutationFn: (payload: { userId: number; role: "admin" | "member" }) =>
      addTeamMember(selectedTeamId!, payload.userId, payload.role),
    onSuccess: async () => {
      await refreshTeamMembers();
      toast.success("Team member added");
    },
  });

  const approveMemberMutation = useMutation({
    mutationFn: (userId: number) => approveTeamMember(selectedTeamId!, userId),
    onSuccess: async () => {
      await refreshTeamMembers();
      toast.success("Team member approved");
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
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => removeTeamMember(selectedTeamId!, userId),
    onSuccess: async () => {
      await refreshTeamMembers();
      toast.success("Team member removed");
    },
  });

  const moveMemberMutation = useMutation({
    mutationFn: async (payload: {
      targetTeamId: number;
      userId: number;
      role: "admin" | "member";
    }) => {
      await addTeamMember(payload.targetTeamId, payload.userId, payload.role);
      await removeTeamMember(selectedTeamId!, payload.userId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamMembersQueryKey }),
        refreshWorkspace(true),
      ]);
      toast.success("Team member moved");
    },
  });

  const settingsRef = useRef<RoomSettings | null>(null);
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

  const effectiveSettings: RoomSettings | null = useMemo(() => {
    if (settingsQuery.data && defaults) {
      return { ...defaults, ...settingsQuery.data };
    }

    return defaults ?? null;
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

  const handleSaveSettings = () => {
    if (settingsRef.current && selectedTeamId && canManageTeam) {
      saveSettingsMutation.mutate(settingsRef.current);
    }
  };

  const teamMembers = teamMembersQuery.data ?? [];
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

  const handleAddMember = async () => {
    if (!selectedWorkspaceUserId) {
      return;
    }

    await addMemberMutation.mutateAsync({
      userId: Number.parseInt(selectedWorkspaceUserId, 10),
      role: selectedRole,
    });
    setSelectedWorkspaceUserId("");
    setSelectedRole("member");
  };

  const handleRemoveMember = async () => {
    if (!pendingRemovalMember) {
      return;
    }

    await removeMemberMutation.mutateAsync(pendingRemovalMember.id);
    setPendingRemovalMember(null);
  };

  const handleMoveMember = async () => {
    if (!pendingMoveMember || !targetTeamId) {
      return;
    }

    await moveMemberMutation.mutateAsync({
      targetTeamId: Number.parseInt(targetTeamId, 10),
      userId: pendingMoveMember.id,
      role: pendingMoveMember.role,
    });
    setPendingMoveMember(null);
    setTargetTeamId("");
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
              {selectedTeam?.name ?? "Team"} Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Default settings, integrations, and access for this team
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
                  <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 md:grid-cols-[1fr_180px_160px] dark:border-white/10 dark:bg-slate-900/50">
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
                    >
                      Add to team
                    </Button>
                  </div>
                )}

                {teamMembersQuery.isLoading ? (
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
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {member.name?.trim() || member.email}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {member.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
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
                          <div className="mt-3 flex flex-wrap gap-2">
                            {member.status === "pending" ? (
                              <Button
                                size="sm"
                                isLoading={
                                  approveMemberMutation.isPending &&
                                  approveMemberMutation.variables === member.id
                                }
                                onClick={() =>
                                  void approveMemberMutation.mutateAsync(
                                    member.id,
                                  )
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
                                  void updateMemberRoleMutation.mutateAsync({
                                    userId: member.id,
                                    role: "member",
                                  })
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
                                  void updateMemberRoleMutation.mutateAsync({
                                    userId: member.id,
                                    role: "admin",
                                  })
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
                      disabled={!canManageTeam}
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
                disabled={disabled}
                variant="unstyled"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={onConnect}
                disabled={disabled}
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
        description={`This removes the shared ${label} credentials for this team.`}
        confirmLabel="Disconnect"
        variant="destructive"
        onConfirm={() => void onDisconnect()}
      />
    </>
  );
}
