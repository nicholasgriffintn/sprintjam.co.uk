import { Select, type SelectOption } from "@/components/ui/Select";
import type { Team } from "@sprintjam/types";

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number) => void;
}

export function TeamSelector({
  teams,
  selectedTeamId,
  onSelectTeam,
}: TeamSelectorProps) {
  const options: SelectOption[] = teams.map((team) => ({
    label: team.name,
    value: String(team.id),
  }));

  const handleChange = (value: string) => {
    const teamId = Number.parseInt(value, 10);
    if (!Number.isNaN(teamId)) {
      onSelectTeam(teamId);
    }
  };

  return (
    <div>
      <label
        htmlFor="team-selector"
        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        Select team
      </label>
      <Select
        id="team-selector"
        options={options}
        value={selectedTeamId ? String(selectedTeamId) : ""}
        onValueChange={handleChange}
        placeholder="Choose a team"
      />
    </div>
  );
}
