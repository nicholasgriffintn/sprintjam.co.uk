import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCcw,
  Target,
  Trash2,
  ArrowLeft,
} from 'lucide-react';

import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { PageBackground } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Footer } from '@/components/layout/Footer';
import { Logo } from '@/components/Logo';
import { META_CONFIGS } from '@/config/meta';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { useSessionActions } from '@/context/SessionContext';
import { BetaBadge } from '@/components/BetaBadge';

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function WorkspaceScreen() {
  usePageMeta(META_CONFIGS.workspace);

  const {
    user,
    teams,
    stats,
    sessions,
    selectedTeamId,
    setSelectedTeamId,
    isAuthenticated,
    isLoading,
    isLoadingSessions,
    isMutating,
    error,
    actionError,
    refreshWorkspace,
    refreshSessions,
    createTeam,
    updateTeam,
    deleteTeam,
    createSession,
    logout,
  } = useWorkspaceData();

  const { goHome, goToLogin, goToRoom } = useSessionActions();

  const [newTeamName, setNewTeamName] = useState('');
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionRoomKey, setSessionRoomKey] = useState('');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  useEffect(() => {
    const nextName = selectedTeam?.name ?? '';
    if (teamNameDraft !== nextName) {
      setTeamNameDraft(nextName);
    }
    setRenameInput(nextName);
  }, [selectedTeam, teamNameDraft]);

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    const created = await createTeam(newTeamName.trim());
    if (created) {
      setNewTeamName('');
    }
  };

  const handleUpdateTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTeamId || !teamNameDraft.trim()) return;
    await updateTeam(selectedTeamId, teamNameDraft.trim());
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeamId) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this team? This will not remove any existing rooms but will remove linked sessions.'
    );
    if (!confirmed) return;
    await deleteTeam(selectedTeamId);
  };

  const handleCreateSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTeamId || !sessionName.trim() || !sessionRoomKey.trim()) {
      return;
    }

    const session = await createSession({
      teamId: selectedTeamId,
      name: sessionName.trim(),
      roomKey: sessionRoomKey.trim().toUpperCase(),
    });

    if (session) {
      setSessionName('');
      setSessionRoomKey('');
      void refreshSessions(selectedTeamId);
    }
  };

  const handleOpenRoom = (roomKey: string) => {
    const targetKey = roomKey.trim();
    if (!targetKey) {
      return;
    }
    goToRoom(targetKey);
  };

  const handleOpenTeamModal = () => {
    if (!selectedTeam) return;
    setRenameInput(selectedTeam.name);
    setIsTeamModalOpen(true);
  };

  const handleSaveTeamName = async () => {
    if (!selectedTeamId || !renameInput.trim()) return;
    await updateTeam(selectedTeamId, renameInput.trim());
    setIsTeamModalOpen(false);
  };

  const showSignedOut =
    !isLoading && !user && !isAuthenticated && !selectedTeamId;

  const statCards = [
    {
      label: 'Teams',
      value: stats?.totalTeams ?? teams.length,
      icon: <Building2 className="h-5 w-5 text-brand-500" />,
    },
    {
      label: 'Sessions',
      value: stats?.totalSessions ?? sessions.length,
      icon: <Target className="h-5 w-5 text-indigo-500" />,
    },
    {
      label: 'Active',
      value:
        stats?.activeSessions ?? sessions.filter((s) => !s.completedAt).length,
      icon: <Activity className="h-5 w-5 text-emerald-500" />,
    },
    {
      label: 'Completed',
      value:
        stats?.completedSessions ??
        sessions.filter((s) => s.completedAt).length,
      icon: <CheckCircle2 className="h-5 w-5 text-amber-500" />,
    },
  ];

  if (isLoading && !user) {
    return (
      <PageBackground align="start" maxWidth="sm" variant="compact">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>
        <SurfaceCard className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-slate-700 dark:text-slate-200">
              Loading workspace...
            </span>
          </div>
        </SurfaceCard>
      </PageBackground>
    );
  }

  if (showSignedOut) {
    return (
      <PageBackground align="start" maxWidth="sm" variant="compact">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <Logo size="md" />
          </div>

          <div className="space-y-3 text-left">
            <Button
              type="button"
              variant="unstyled"
              onClick={goHome}
              icon={<ArrowLeft className="h-4 w-4" />}
              className="p-0 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Back to home
            </Button>
          </div>

          <SurfaceCard className="text-left">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
                Sign in to manage your workspace <BetaBadge />
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300">
                Workspaces are designed to help teams organise and manage their
                planning rooms and sessions. To access your workspace, please
                sign in to your account.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="workspace-retry"
                  className="sm:w-auto sm:flex-shrink-0"
                  fullWidth
                  onClick={() => refreshWorkspace(true)}
                  icon={<RefreshCcw className="h-4 w-4" />}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  data-testid="workspace-login"
                  className="sm:flex-1"
                  fullWidth
                  onClick={goToLogin}
                  icon={<LogIn className="h-4 w-4" />}
                >
                  Go to login
                </Button>
              </div>
            </motion.div>
          </SurfaceCard>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Need help? Ask your workspace administrator for more information.
          </p>
        </motion.div>
        <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
      </PageBackground>
    );
  }

  return (
    <>
      <PageBackground align="start" maxWidth="xl" variant="compact">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <a
              href="/"
              aria-label="SprintJam home"
              className="hover:opacity-80"
            >
              <Logo size="md" />
            </a>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                  Your Workspace <BetaBadge />
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  Link planning rooms back to your workspace, keep sessions
                  tidy, and jump into the right room fast.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => refreshWorkspace(true)}
                isLoading={isLoading}
                icon={<RefreshCcw className="h-4 w-4" />}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                onClick={logout}
                icon={<LogOut className="h-4 w-4" />}
                disabled={isMutating}
              >
                Sign out
              </Button>
            </div>
          </div>

          {error && (
            <SurfaceCard className="border border-rose-200/70 bg-rose-50/80 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/30 dark:text-rose-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>{error}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refreshWorkspace(true)}
                  icon={<RefreshCcw className="h-3 w-3" />}
                >
                  Retry
                </Button>
              </div>
            </SurfaceCard>
          )}

          {actionError && (
            <SurfaceCard className="border border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>{actionError}</span>
              </div>
            </SurfaceCard>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <SurfaceCard
                key={stat.label}
                variant="subtle"
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {stat.value ?? '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/70 p-2 dark:bg-slate-900/40">
                  {stat.icon}
                </div>
              </SurfaceCard>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            <SurfaceCard className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Manage teams
                  </h2>
                </div>
                <Badge variant="primary" size="sm" className="font-semibold">
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  {teams.length}
                </Badge>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-3">
                <Input
                  label="New team"
                  placeholder="Product team"
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  required
                  fullWidth
                />
                <Button
                  type="submit"
                  icon={<Plus className="h-4 w-4" />}
                  isLoading={isMutating}
                  disabled={!newTeamName.trim()}
                  fullWidth
                >
                  Create team
                </Button>
              </form>

              <div className="space-y-2">
                {teams.length === 0 && (
                  <EmptyState
                    title="No teams yet"
                    description="Create your first team to start linking rooms."
                  />
                )}
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeamId(team.id)}
                    className={cn(
                      'w-full rounded-2xl border border-white/60 bg-white/70 p-4 text-left shadow-sm transition hover:border-brand-200 hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:hover:border-brand-700/50 dark:hover:bg-slate-900',
                      selectedTeamId === team.id &&
                        'border-brand-300 bg-brand-50/70 shadow-md dark:border-brand-800/80 dark:bg-brand-900/20'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {team.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Team ID: {team.id}
                        </p>
                      </div>
                      {selectedTeamId === team.id ? (
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant="primary" size="sm">
                            Selected
                          </Badge>
                          <Button
                            type="button"
                            variant="secondary"
                            icon={<Pencil className="h-4 w-4" />}
                            onClick={handleOpenTeamModal}
                            disabled={!selectedTeam}
                            size="sm"
                          >
                            Edit team
                          </Button>
                        </div>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Room sessions
                  </h2>
                </div>
                <Badge variant="success" size="sm" className="font-semibold">
                  <Target className="mr-1.5 h-3.5 w-3.5" />
                  {sessions.length}
                </Badge>
              </div>

              {!selectedTeam && (
                <EmptyState
                  icon={<Building2 className="h-8 w-8" />}
                  title="Select a team"
                  description="Choose a team on the left to see linked sessions."
                />
              )}

              {selectedTeam && (
                <>
                  <form onSubmit={handleCreateSession} className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Session name"
                        placeholder="Sprint 18 planning"
                        value={sessionName}
                        onChange={(event) => setSessionName(event.target.value)}
                        required
                        fullWidth
                      />
                      <Input
                        label="Room key"
                        placeholder="ABCD"
                        value={sessionRoomKey}
                        onChange={(event) =>
                          setSessionRoomKey(event.target.value)
                        }
                        helperText="Use the room code from SprintJam"
                        required
                        fullWidth
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        icon={<Plus className="h-4 w-4" />}
                        isLoading={isMutating}
                        disabled={!sessionName.trim() || !sessionRoomKey.trim()}
                      >
                        Link session
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {isLoadingSessions && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Spinner size="sm" />
                        <span>Loading sessions...</span>
                      </div>
                    )}

                    {!isLoadingSessions && sessions.length === 0 && (
                      <EmptyState
                        icon={<CalendarClock className="h-8 w-8" />}
                        title="No sessions linked"
                        description="Link a planning room to start tracking it here."
                      />
                    )}

                    {sessions.map((session) => {
                      const isComplete = Boolean(session.completedAt);
                      return (
                        <SurfaceCard
                          key={`${session.teamId}-${session.id}`}
                          variant="subtle"
                          padding="sm"
                          className="flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {session.name}
                              </p>
                              <Badge
                                variant={isComplete ? 'default' : 'success'}
                                size="sm"
                              >
                                {isComplete ? 'Completed' : 'Active'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Target className="h-3.5 w-3.5" />
                                Room {session.roomKey}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" />
                                Created {formatDate(session.createdAt)}
                              </span>
                              {session.completedAt && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Completed {formatDate(session.completedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                              onClick={() => handleOpenRoom(session.roomKey)}
                            >
                              Open room
                            </Button>
                          </div>
                        </SurfaceCard>
                      );
                    })}
                  </div>
                </>
              )}
            </SurfaceCard>
          </div>
        </motion.div>
        <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
      </PageBackground>

      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title="Team settings"
        size="sm"
      >
        {selectedTeam ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Selected team
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                {selectedTeam.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Team ID: {selectedTeam.id}
              </p>
            </div>

            <Input
              label="Rename team"
              value={renameInput}
              onChange={(event) => setRenameInput(event.target.value)}
              fullWidth
            />

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSaveTeamName}
                isLoading={isMutating}
                disabled={!renameInput.trim()}
              >
                Save name
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteTeam}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Delete team
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Select a team first to edit details.
          </p>
        )}
      </Modal>
    </>
  );
}
