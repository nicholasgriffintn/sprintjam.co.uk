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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useSessionActions } from "@/context/SessionContext";
import type { TeamAccessPolicy, WorkspaceTeam } from "@sprintjam/types";
import { BetaBadge } from "@/components/BetaBadge";
import { createMeta } from "../../meta";

export const meta = createMeta("workspaceAdminTeams");

export default function WorkspaceAdminTeams() {
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

  const { goToLogin, goToWorkspaceAdminTeamSettings } = useSessionActions();
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<WorkspaceTeam | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [accessPolicy, setAccessPolicy] = useState<TeamAccessPolicy>("open");

  const handleCreateTeam = async (payload: {
    name: string;
    accessPolicy: TeamAccessPolicy;
  }) => {
    await createTeam(payload);
  };

  const handleEditTeam = (team: WorkspaceTeam) => {
    setEditingTeam(team);
    setRenameInput(team.name);
    setAccessPolicy(team.accessPolicy);
    setIsTeamModalOpen(true);
  };

  const handleTeamSettings = (team: WorkspaceTeam) => {
    setSelectedTeamId(team.id);
    goToWorkspaceAdminTeamSettings();
  };

  const handleSaveTeam = async () => {
    if (!editingTeam || !renameInput.trim()) return;
    await updateTeam(editingTeam.id, {
      name: renameInput.trim(),
      accessPolicy,
    });
    setIsTeamModalOpen(false);
    setEditingTeam(null);
  };

  const handleDeleteTeam = () => {
    if (!editingTeam) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteTeamConfirmed = async () => {
    if (!editingTeam) return;
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
            Admin <BetaBadge />
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
              onTeamSettings={handleTeamSettings}
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
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Team access
              </p>
              <Select
                options={[
                  { label: "Open to workspace", value: "open" },
                  { label: "Restricted members", value: "restricted" },
                ]}
                value={accessPolicy}
                onValueChange={(value) =>
                  setAccessPolicy(value as TeamAccessPolicy)
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSaveTeam}
                isLoading={isMutating}
                disabled={!renameInput.trim()}
              >
                Save team
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
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete team?"
        description="This will not remove any existing rooms but will remove linked sessions."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void handleDeleteTeamConfirmed()}
      />
    </WorkspaceLayout>
  );
}
