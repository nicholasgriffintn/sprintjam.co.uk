import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  BarChart3,
  PlayCircle,
  CheckCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";

import { PageBackground } from "@/components/layout/PageBackground";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";
import { Spinner } from "@/components/ui/Spinner";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import {
  listTeams,
  listTeamSessions,
  getWorkspaceStats,
  type Team,
  type TeamSession,
  type WorkspaceStats,
} from "@/lib/workspace-service";
import DarkModeToggle from "@/components/Header/DarkModeToggle";
import { CreateTeamModal } from "@/components/workspace/CreateTeamModal";
import { CreateSessionModal } from "@/components/workspace/CreateSessionModal";

export default function WorkspaceScreen() {
  const { user, isLoading: authLoading, logout } = useWorkspaceAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [sessions, setSessions] = useState<TeamSession[]>([]);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);

  useEffect(() => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teamsData, statsData] = await Promise.all([
        listTeams(),
        getWorkspaceStats(),
      ]);
      setTeams(teamsData);
      setStats(statsData);

      if (teamsData.length > 0 && !selectedTeam) {
        handleSelectTeam(teamsData[0]);
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTeam = async (team: Team) => {
    setSelectedTeam(team);
    setIsLoadingSessions(true);
    try {
      const sessionsData = await listTeamSessions(team.id);
      setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleTeamCreated = async (team: Team) => {
    setTeams((prev) => [team, ...prev]);
    setShowCreateTeam(false);
    handleSelectTeam(team);
    const statsData = await getWorkspaceStats();
    setStats(statsData);
  };

  const handleSessionCreated = async (session: TeamSession) => {
    setSessions((prev) => [session, ...prev]);
    setShowCreateSession(false);
    const statsData = await getWorkspaceStats();
    setStats(statsData);
    window.location.href = `/room?key=${session.roomKey}`;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleJoinSession = (session: TeamSession) => {
    window.location.href = `/room?key=${session.roomKey}`;
  };

  if (authLoading || isLoading) {
    return (
      <PageBackground maxWidth="xl">
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PageBackground>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageBackground maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                Workspace
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button
              variant="secondary"
              onClick={handleLogout}
              icon={<LogOut className="h-4 w-4" />}
            >
              Sign out
            </Button>
          </div>
        </header>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SurfaceCard className="text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
                  <Users className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.totalTeams}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Teams
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.totalSessions}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total Sessions
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <PlayCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.activeSessions}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Active
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.completedSessions}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Completed
                  </p>
                </div>
              </div>
            </SurfaceCard>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Teams
              </h2>
              <Button
                size="sm"
                onClick={() => setShowCreateTeam(true)}
                icon={<Plus className="h-4 w-4" />}
              >
                New Team
              </Button>
            </div>

            {teams.length === 0 ? (
              <SurfaceCard className="text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  No teams yet. Create your first team to get started.
                </p>
              </SurfaceCard>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <Button
                    key={team.id}
                    variant={
                      selectedTeam?.id === team.id ? "primary" : "secondary"
                    }
                    fullWidth
                    className="justify-between"
                    onClick={() => handleSelectTeam(team)}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {team.name}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-2">
            {selectedTeam ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedTeam.name} Sessions
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateSession(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    New Session
                  </Button>
                </div>

                {isLoadingSessions ? (
                  <div className="flex min-h-[200px] items-center justify-center">
                    <Spinner />
                  </div>
                ) : sessions.length === 0 ? (
                  <SurfaceCard className="text-center">
                    <p className="text-slate-600 dark:text-slate-400">
                      No sessions yet. Create a session to start planning.
                    </p>
                  </SurfaceCard>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sessions.map((session) => (
                      <SurfaceCard
                        key={session.id}
                        className="cursor-pointer transition-shadow hover:shadow-md"
                        onClick={() => handleJoinSession(session)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-slate-900 dark:text-white">
                              {session.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Room: {session.roomKey}
                            </p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              session.completedAt
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {session.completedAt ? "Completed" : "Active"}
                          </div>
                        </div>
                      </SurfaceCard>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <SurfaceCard className="text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  Select a team to view its sessions
                </p>
              </SurfaceCard>
            )}
          </div>
        </div>
      </motion.div>

      <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />

      <CreateTeamModal
        isOpen={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        onTeamCreated={handleTeamCreated}
      />

      {selectedTeam && (
        <CreateSessionModal
          isOpen={showCreateSession}
          onClose={() => setShowCreateSession(false)}
          onSessionCreated={handleSessionCreated}
          team={selectedTeam}
        />
      )}
    </PageBackground>
  );
}
