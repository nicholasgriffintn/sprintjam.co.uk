import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock3,
  MailPlus,
  Shield,
  UserMinus,
} from "lucide-react";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AdminSidebar } from "@/components/workspace/AdminSidebar";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { META_CONFIGS } from "@/config/meta";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  approveWorkspaceMember,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  updateWorkspaceProfile,
} from "@/lib/workspace-service";
import { toast } from "@/components/ui";
import type { WorkspaceMember } from "@sprintjam/types";
import { BetaBadge } from "../../components/BetaBadge";

export default function WorkspaceAdminOverview() {
  usePageMeta(META_CONFIGS.workspaceAdmin);

  const {
    profile,
    user,
    isAuthenticated,
    isLoading,
    error,
    actionError,
    refreshWorkspace,
  } = useWorkspaceData();

  const { goToLogin } = useSessionActions();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState("");
  const [requireMemberApproval, setRequireMemberApproval] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isUpdatingMemberId, setIsUpdatingMemberId] = useState<number | null>(
    null,
  );
  const [pendingRemovalMember, setPendingRemovalMember] =
    useState<WorkspaceMember | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const organisation = profile?.organisation ?? null;
  const members = profile?.members ?? [];
  const invites = profile?.invites ?? [];
  const isWorkspaceAdmin = profile?.membership.role === "admin";

  const pendingMembers = useMemo(
    () => members.filter((member) => member.status === "pending"),
    [members],
  );
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members],
  );

  useEffect(() => {
    if (!organisation) {
      return;
    }

    setWorkspaceName(organisation.name);
    setWorkspaceLogoUrl(organisation.logoUrl ?? "");
    setRequireMemberApproval(organisation.requireMemberApproval);
  }, [
    organisation?.id,
    organisation?.logoUrl,
    organisation?.name,
    organisation?.requireMemberApproval,
  ]);

  const isSettingsDirty = useMemo(() => {
    if (!organisation) {
      return false;
    }

    return (
      workspaceName.trim() !== organisation.name ||
      (workspaceLogoUrl.trim() || "") !== (organisation.logoUrl ?? "") ||
      requireMemberApproval !== organisation.requireMemberApproval
    );
  }, [
    organisation,
    requireMemberApproval,
    workspaceLogoUrl,
    workspaceName,
  ]);

  const handleSaveWorkspace = async () => {
    if (!workspaceName.trim()) {
      setLocalError("Workspace name is required");
      return;
    }

    setIsSavingWorkspace(true);
    setLocalError(null);

    try {
      await updateWorkspaceProfile({
        name: workspaceName.trim(),
        logoUrl: workspaceLogoUrl.trim() || null,
        requireMemberApproval,
      });
      await refreshWorkspace(true);
      toast.success("Workspace settings updated");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update workspace";
      setLocalError(message);
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = inviteEmail.toLowerCase().trim();

    if (!normalizedEmail) {
      setLocalError("Invite email is required");
      return;
    }

    setIsSendingInvite(true);
    setLocalError(null);

    try {
      await inviteWorkspaceMember(normalizedEmail);
      await refreshWorkspace(true);
      setInviteEmail("");
      toast.success(`Invite sent to ${normalizedEmail}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to send invite";
      setLocalError(message);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleApproveMember = async (member: WorkspaceMember) => {
    setIsUpdatingMemberId(member.id);
    setLocalError(null);

    try {
      await approveWorkspaceMember(member.id);
      await refreshWorkspace(true);
      toast.success(`${member.email} approved`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to approve member";
      setLocalError(message);
    } finally {
      setIsUpdatingMemberId(null);
    }
  };

  const handleRoleChange = async (
    member: WorkspaceMember,
    role: "admin" | "member",
  ) => {
    setIsUpdatingMemberId(member.id);
    setLocalError(null);

    try {
      await updateWorkspaceMemberRole(member.id, role);
      await refreshWorkspace(true);
      toast.success(
        role === "admin"
          ? `${member.email} is now a workspace admin`
          : `${member.email} is now a workspace member`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update role";
      setLocalError(message);
    } finally {
      setIsUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!pendingRemovalMember) {
      return;
    }

    setIsUpdatingMemberId(pendingRemovalMember.id);
    setLocalError(null);

    try {
      await removeWorkspaceMember(pendingRemovalMember.id);
      await refreshWorkspace(true);
      toast.success(`${pendingRemovalMember.email} removed`);
      setPendingRemovalMember(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove member";
      setLocalError(message);
    } finally {
      setIsUpdatingMemberId(null);
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
            Admin <BetaBadge />
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Manage workspace access, approvals, and roles
          </p>
        </div>

        {actionError && <Alert variant="warning">{actionError}</Alert>}
        {localError && <Alert variant="error">{localError}</Alert>}
        {!isLoading && profile && !isWorkspaceAdmin && (
          <Alert variant="warning">
            Only workspace admins can manage workspace access.
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AdminSidebar activeScreen="workspaceAdmin" />

          <div className="space-y-6">
            <SurfaceCard className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Workspace profile
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Update the workspace identity and how new members join.
                  </p>
                </div>
                {organisation && (
                  <Badge variant="primary" size="sm" className="font-semibold">
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    {organisation.domain}
                  </Badge>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-[1fr_170px]">
                <div className="space-y-4">
                  <Input
                    label="Workspace name"
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    placeholder="Acme Engineering"
                    fullWidth
                  />

                  <Input
                    label="Logo URL"
                    value={workspaceLogoUrl}
                    onChange={(event) =>
                      setWorkspaceLogoUrl(event.target.value)
                    }
                    placeholder="https://example.com/logo.png"
                    helperText="Optional. Use a public HTTPS image URL."
                    fullWidth
                  />

                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Require manual member approval
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          New users from the allowed domain stay pending until a
                          workspace admin approves them.
                        </p>
                      </div>
                      <Switch
                        checked={requireMemberApproval}
                        onCheckedChange={setRequireMemberApproval}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveWorkspace}
                      isLoading={isSavingWorkspace}
                      disabled={!organisation || !isSettingsDirty}
                    >
                      Save workspace
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-slate-950 dark:text-slate-500">
                    {workspaceLogoUrl.trim() ? (
                      <img
                        src={workspaceLogoUrl.trim()}
                        alt="Workspace logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-8 w-8" />
                    )}
                  </div>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Logo preview
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Invite members
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Invites bypass domain matching and join approval.
                </p>
              </div>

              <form
                onSubmit={handleInvite}
                className="grid gap-3 sm:grid-cols-[7fr_3fr] sm:items-end"
              >
                <Input
                  label="Email address"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@example.com"
                  fullWidth
                  required
                />
                <Button
                  type="submit"
                  icon={<MailPlus className="h-4 w-4" />}
                  isLoading={isSendingInvite}
                  disabled={!inviteEmail.trim()}
                  className="sm:h-[50px]"
                >
                  Send invite
                </Button>
              </form>
            </SurfaceCard>

            <SurfaceCard className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Workspace members ({activeMembers.length})
                  </p>
                  <div className="space-y-3">
                    {activeMembers.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No active members.
                      </p>
                    )}
                    {activeMembers.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-slate-900/60"
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
                          <Badge
                            variant={
                              member.role === "admin" ? "primary" : "default"
                            }
                            size="sm"
                          >
                            {member.role === "admin" ? "Admin" : "Member"}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {member.role === "admin" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              isLoading={isUpdatingMemberId === member.id}
                              onClick={() => void handleRoleChange(member, "member")}
                            >
                              Make member
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              isLoading={isUpdatingMemberId === member.id}
                              onClick={() => void handleRoleChange(member, "admin")}
                            >
                              Make admin
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            icon={<UserMinus className="h-4 w-4" />}
                            isLoading={isUpdatingMemberId === member.id}
                            onClick={() => setPendingRemovalMember(member)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Pending access ({pendingMembers.length + invites.length})
                  </p>
                  <div className="space-y-3">
                    {pendingMembers.length === 0 && invites.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No pending approvals or invites.
                      </p>
                    )}

                    {pendingMembers.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-slate-900/60"
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
                          <Badge variant="warning" size="sm">
                            Pending approval
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            isLoading={isUpdatingMemberId === member.id}
                            onClick={() => void handleApproveMember(member)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            isLoading={isUpdatingMemberId === member.id}
                            onClick={() => setPendingRemovalMember(member)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}

                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-slate-900/60"
                      >
                        <p className="font-medium text-slate-900 dark:text-white">
                          {invite.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Invite sent{" "}
                          {new Date(invite.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemovalMember !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemovalMember(null);
          }
        }}
        title="Remove member?"
        description={
          pendingRemovalMember
            ? `This removes ${pendingRemovalMember.email} from the workspace and all teams.`
            : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => void handleRemoveMember()}
      />
    </WorkspaceLayout>
  );
}
