import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, Clock3, MailPlus, Users } from 'lucide-react';

import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { AdminSidebar } from '@/components/workspace/AdminSidebar';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useSessionActions } from '@/context/SessionContext';
import { META_CONFIGS } from '@/config/meta';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  inviteWorkspaceMember,
  updateWorkspaceProfile,
} from '@/lib/workspace-service';
import { BetaBadge } from '../../components/BetaBadge';

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
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const organisation = profile?.organisation ?? null;
  const members = profile?.members ?? [];
  const invites = profile?.invites ?? [];

  useEffect(() => {
    if (!organisation) {
      return;
    }

    setWorkspaceName(organisation.name);
    setWorkspaceLogoUrl(organisation.logoUrl ?? '');
  }, [organisation?.id, organisation?.logoUrl, organisation?.name]);

  const isSettingsDirty = useMemo(() => {
    if (!organisation) {
      return false;
    }

    return (
      workspaceName.trim() !== organisation.name ||
      (workspaceLogoUrl.trim() || '') !== (organisation.logoUrl ?? '')
    );
  }, [organisation, workspaceLogoUrl, workspaceName]);

  const handleSaveWorkspace = async () => {
    if (!workspaceName.trim()) {
      setLocalError('Workspace name is required');
      return;
    }

    setIsSavingWorkspace(true);
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await updateWorkspaceProfile({
        name: workspaceName.trim(),
        logoUrl: workspaceLogoUrl.trim() || null,
      });
      await refreshWorkspace(true);
      setSuccessMessage('Workspace settings updated');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to update workspace';
      setLocalError(message);
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = inviteEmail.toLowerCase().trim();

    if (!normalizedEmail) {
      setLocalError('Invite email is required');
      return;
    }

    setIsSendingInvite(true);
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await inviteWorkspaceMember(normalizedEmail);
      await refreshWorkspace(true);
      setInviteEmail('');
      setSuccessMessage(`Invite sent to ${normalizedEmail}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to send invite';
      setLocalError(message);
    } finally {
      setIsSendingInvite(false);
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
            Manage workspace settings and teams
          </p>
        </div>

        {actionError && <Alert variant="warning">{actionError}</Alert>}
        {localError && <Alert variant="error">{localError}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

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
                    Update the workspace name and logo shown to members.
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
                  Invite teammates by email. Invites bypass domain matching.
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

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Members ({members.length})
                  </p>
                  <div className="space-y-2">
                    {members.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No members yet.
                      </p>
                    )}
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      >
                        <p className="font-medium text-slate-900 dark:text-white">
                          {member.name?.trim() || member.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {member.email}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Pending invites ({invites.length})
                  </p>
                  <div className="space-y-2">
                    {invites.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No pending invites.
                      </p>
                    )}
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/60"
                      >
                        <p className="font-medium text-slate-900 dark:text-white">
                          {invite.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Sent {new Date(invite.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
