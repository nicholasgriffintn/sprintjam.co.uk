import { useState, type FormEvent } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";

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
import { createMeta } from "@/utils/route-meta";
import { getPathFromScreen } from "@/config/routes";

export const meta = createMeta("workspaceAdminTeams");

export default function WorkspaceAdminTeams() {
  const {
    user,
    teams,
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
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newTeamNameInput, setNewTeamNameInput] = useState("");
  const [newTeamLogoUrlInput, setNewTeamLogoUrlInput] = useState("");
  const [newTeamAccessPolicy, setNewTeamAccessPolicy] =
    useState<TeamAccessPolicy>("open");
  const [editingTeam, setEditingTeam] = useState<WorkspaceTeam | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [accessPolicy, setAccessPolicy] = useState<TeamAccessPolicy>("open");

  const resetCreateTeamForm = () => {
    setNewTeamNameInput("");
    setNewTeamLogoUrlInput("");
    setNewTeamAccessPolicy("open");
  };

  const handleCreateTeam = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTeamNameInput.trim()) return;

    const createdTeam = await createTeam({
      name: newTeamNameInput.trim(),
      logoUrl: newTeamLogoUrlInput.trim() || null,
      accessPolicy: newTeamAccessPolicy,
    });
    if (!createdTeam) return;

    setIsCreateTeamModalOpen(false);
    resetCreateTeamForm();
  };

  const handleOpenTeam = (team: WorkspaceTeam) => {
    setSelectedTeamId(team.id);
  };

  const handleEditTeam = (team: WorkspaceTeam) => {
    setSelectedTeamId(team.id);
    setEditingTeam(team);
    setRenameInput(team.name);
    setLogoUrlInput(team.logoUrl ?? "");
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
      logoUrl: logoUrlInput.trim() || null,
      accessPolicy,
    });
    setIsTeamModalOpen(false);
    setEditingTeam(null);
    setLogoUrlInput("");
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
    setLogoUrlInput("");
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Teams
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="primary"
                  size="sm"
                  className="w-fit font-semibold"
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  {teams.length}
                </Badge>
                <Button
                  type="button"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setIsCreateTeamModalOpen(true)}
                  size="sm"
                >
                  New team
                </Button>
              </div>
            </div>
            <TeamsList
              teams={teams}
              getTeamPageHref={(team) =>
                getPathFromScreen("workspaceTeam", { teamSlug: team.slug })
              }
              onOpenTeam={handleOpenTeam}
              onEditTeam={handleEditTeam}
              onTeamSettings={handleTeamSettings}
            />
          </SurfaceCard>
        </div>
      </div>
      <Modal
        isOpen={isCreateTeamModalOpen}
        onClose={() => {
          setIsCreateTeamModalOpen(false);
          resetCreateTeamForm();
        }}
        title="Create team"
        size="sm"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => void handleCreateTeam(event)}
        >
          <Input
            label="Team name"
            placeholder="Product team"
            value={newTeamNameInput}
            onChange={(event) => setNewTeamNameInput(event.target.value)}
            disabled={isMutating}
            required
            fullWidth
          />
          <Input
            label="Team logo URL"
            value={newTeamLogoUrlInput}
            onChange={(event) => setNewTeamLogoUrlInput(event.target.value)}
            placeholder="https://example.com/team-logo.png"
            helperText="Optional. Use a public HTTP or HTTPS image URL."
            disabled={isMutating}
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
              value={newTeamAccessPolicy}
              disabled={isMutating}
              onValueChange={(value) =>
                setNewTeamAccessPolicy(value as TeamAccessPolicy)
              }
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateTeamModalOpen(false);
                resetCreateTeamForm();
              }}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={<Plus className="h-4 w-4" />}
              isLoading={isMutating}
              disabled={!newTeamNameInput.trim() || isMutating}
            >
              Create team
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setEditingTeam(null);
          setLogoUrlInput("");
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
              disabled={isMutating}
              fullWidth
            />
            <Input
              label="Team logo URL"
              value={logoUrlInput}
              onChange={(event) => setLogoUrlInput(event.target.value)}
              placeholder="https://example.com/team-logo.png"
              helperText="Optional. Use a public HTTP or HTTPS image URL."
              disabled={isMutating}
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
                disabled={isMutating}
                onValueChange={(value) =>
                  setAccessPolicy(value as TeamAccessPolicy)
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSaveTeam}
                isLoading={isMutating}
                disabled={!renameInput.trim() || isMutating}
              >
                Save team
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteTeam}
                icon={<Trash2 className="h-4 w-4" />}
                disabled={isMutating}
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
