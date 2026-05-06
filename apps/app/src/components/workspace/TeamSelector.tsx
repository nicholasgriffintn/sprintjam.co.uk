import { Select, type SelectOption } from "@/components/ui/Select";
import type { WorkspaceTeam } from "@sprintjam/types";

interface TeamSelectorProps {
  teams: WorkspaceTeam[];
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number) => void;
  className?: string;
  label?: string;
  labelClassName?: string;
  selectClassName?: string;
}

export function TeamSelector({
  teams,
  selectedTeamId,
  onSelectTeam,
  className,
  label = "Select team",
  labelClassName,
  selectClassName,
}: TeamSelectorProps) {
  const options: SelectOption[] = teams.map((team) => ({
    label: team.canAccess
      ? team.name
      : team.currentUserStatus === "pending"
        ? `${team.name} (Access pending)`
        : `${team.name} (Restricted)`,
    value: String(team.id),
  }));

  const handleChange = (value: string) => {
    const teamId = Number.parseInt(value, 10);
    if (!Number.isNaN(teamId)) {
      onSelectTeam(teamId);
    }
  };

  return (
    <div className={className}>
      <label
        htmlFor="team-selector"
        className={
          labelClassName ??
          "mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        }
      >
        {label}
      </label>
      <Select
        id="team-selector"
        options={options}
        value={selectedTeamId ? String(selectedTeamId) : ""}
        onValueChange={handleChange}
        placeholder="Choose a team"
        className={selectClassName}
      />
    </div>
  );
}
