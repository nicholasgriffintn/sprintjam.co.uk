import { useState } from "react";
import { Building2, Trash2 } from "lucide-react";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AdminSidebar } from "@/components/workspace/AdminSidebar";
import { TeamsList } from "@/components/workspace/TeamsList";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import { META_CONFIGS } from "@/config/meta";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { Team } from "@/lib/workspace-service";

export default function WorkspaceAdminTeams() {
  usePageMeta(META_CONFIGS.workspaceAdminTeams);

  const {
    user,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    isAuthenticated,
    isLoading,
    isMutating,
    error,
    actionError,
    refreshWorkspace,
    createTeam,
    updateTeam,
    deleteTeam,
  } = useWorkspaceData();

  const { goToLogin } = useSessionActions();
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const handleCreateTeam = async (name: string) => {
    await createTeam(name);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setRenameInput(team.name);
    setIsTeamModalOpen(true);
  };

  const handleSaveTeamName = async () => {
    if (!editingTeam || !renameInput.trim()) return;
    await updateTeam(editingTeam.id, renameInput.trim());
    setIsTeamModalOpen(false);
    setEditingTeam(null);
  };

  const handleDeleteTeam = async () => {
    if (!editingTeam) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this team? This will not remove any existing rooms but will remove linked sessions.',
    );
    if (!confirmed) return;
    await deleteTeam(editingTeam.id);
    setIsTeamModalOpen(false);
    setEditingTeam(null);
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
            Admin
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Manage workspace settings and teams
          </p>
        </div>
        {actionError && <Alert variant="warning">{actionError}</Alert>}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AdminSidebar activeScreen="workspaceAdminTeams" />
          <SurfaceCard className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Teams
                </h2>
              </div>
              <Badge variant="primary" size="sm" className="font-semibold">
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                {teams.length}
              </Badge>
            </div>
            <TeamsList
              teams={teams}
              selectedTeamId={selectedTeamId}
              isMutating={isMutating}
              onCreateTeam={handleCreateTeam}
              onSelectTeam={setSelectedTeamId}
              onEditTeam={handleEditTeam}
            />
          </SurfaceCard>
        </div>
      </div>
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setEditingTeam(null);
        }}
        title="Team settings"
        size="sm"
      >
        {editingTeam ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Selected team
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                {editingTeam.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Team ID: {editingTeam.id}
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
    </WorkspaceLayout>
  );
}
