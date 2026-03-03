import { useState } from "react";
import { Plus, Pencil, ChevronRight, Settings } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { TeamAccessPolicy, WorkspaceTeam } from "@sprintjam/types";

interface TeamsListProps {
  teams: WorkspaceTeam[];
  selectedTeamId: number | null;
  isMutating: boolean;
  onCreateTeam: (payload: {
    name: string;
    accessPolicy: TeamAccessPolicy;
  }) => Promise<void>;
  onSelectTeam: (teamId: number) => void;
  onEditTeam: (team: WorkspaceTeam) => void;
  onTeamSettings?: (team: WorkspaceTeam) => void;
}

export function TeamsList({
  teams,
  selectedTeamId,
  isMutating,
  onCreateTeam,
  onSelectTeam,
  onEditTeam,
  onTeamSettings,
}: TeamsListProps) {
  const [newTeamName, setNewTeamName] = useState("");
  const [accessPolicy, setAccessPolicy] = useState<TeamAccessPolicy>("open");

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    await onCreateTeam({
      name: newTeamName.trim(),
      accessPolicy,
    });
    setNewTeamName("");
    setAccessPolicy("open");
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleCreateTeam}
        className="grid gap-3 sm:grid-cols-[7fr_3fr] sm:items-end"
      >
        <Input
          label="New team"
          placeholder="Product team"
          value={newTeamName}
          onChange={(event) => setNewTeamName(event.target.value)}
          required
          fullWidth
        />
        <div className="grid gap-3 sm:grid-cols-2">
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
          <Button
            type="submit"
            icon={<Plus className="h-4 w-4" />}
            isLoading={isMutating}
            disabled={!newTeamName.trim()}
            className="sm:h-[50px]"
            fullWidth
          >
            Create team
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {teams.length === 0 && (
          <EmptyState
            title="No teams yet"
            description="Create your first team to start linking rooms."
          />
        )}
        {teams.map((team) => (
          <div
            key={team.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectTeam(team.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectTeam(team.id);
              }
            }}
            className={cn(
              "w-full rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-left shadow-sm transition hover:border-brand-200 hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:hover:border-brand-700/50 dark:hover:bg-slate-900",
              selectedTeamId === team.id &&
                "border-brand-300 bg-brand-50/70 shadow-md dark:border-brand-800/80 dark:bg-brand-900/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {team.name}
                  {selectedTeamId === team.id && (
                    <Badge variant="primary" size="sm">
                      Selected
                    </Badge>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge
                    variant={
                      team.accessPolicy === "restricted" ? "warning" : "info"
                    }
                    size="sm"
                  >
                    {team.accessPolicy === "restricted"
                      ? "Restricted"
                      : "Open"}
                  </Badge>
                  {team.canManage && (
                    <Badge variant="success" size="sm">
                      Team admin
                    </Badge>
                  )}
                </div>
              </div>
              {selectedTeamId === team.id ? (
                <div className="flex flex-col items-end gap-2 sm:flex-row">
                  {team.canManage ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditTeam(team);
                        }}
                        size="sm"
                      >
                        Edit team
                      </Button>
                      {onTeamSettings && (
                        <Button
                          type="button"
                          variant="secondary"
                          icon={<Settings className="h-4 w-4" />}
                          onClick={(event) => {
                            event.stopPropagation();
                            onTeamSettings(team);
                          }}
                          size="sm"
                        >
                          Settings
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                    >
                      Read only
                    </Button>
                  )}
                </div>
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
