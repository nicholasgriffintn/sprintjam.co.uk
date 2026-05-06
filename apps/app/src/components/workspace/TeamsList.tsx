import { Pencil, ExternalLink, Settings } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { getInitials } from "@/utils/initials";
import type { WorkspaceTeam } from "@sprintjam/types";

interface TeamsListProps {
  teams: WorkspaceTeam[];
  getTeamPageHref: (team: WorkspaceTeam) => string;
  onOpenTeam?: (team: WorkspaceTeam) => void;
  onEditTeam: (team: WorkspaceTeam) => void;
  onTeamSettings?: (team: WorkspaceTeam) => void;
}

export function TeamsList({
  teams,
  getTeamPageHref,
  onOpenTeam,
  onEditTeam,
  onTeamSettings,
}: TeamsListProps) {
  return (
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
          className="grid w-full gap-4 rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm transition dark:border-white/10 dark:bg-slate-900/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="flex min-w-0 gap-3">
            <Avatar
              src={team.logoUrl ?? undefined}
              alt={`${team.name} logo`}
              fallback={getInitials(team.name)}
              className="h-11 w-11 shrink-0 rounded-xl bg-slate-200 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10"
              fallbackClassName="bg-brand-500/10 text-brand-700 dark:text-brand-300"
            />
            <div className="min-w-0 space-y-2">
              <p className="flex min-w-0 flex-wrap items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <span className="min-w-0 truncate">{team.name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    team.accessPolicy === "restricted" ? "warning" : "info"
                  }
                  size="sm"
                >
                  {team.accessPolicy === "restricted" ? "Restricted" : "Open"}
                </Badge>
                <Badge
                  variant={
                    team.canAccess
                      ? "success"
                      : team.currentUserStatus === "pending"
                        ? "warning"
                        : "default"
                  }
                  size="sm"
                >
                  {team.canAccess
                    ? "Active access"
                    : team.currentUserStatus === "pending"
                      ? "Access pending"
                      : "No access"}
                </Badge>
                {team.currentUserRole && (
                  <Badge
                    variant={team.canManage ? "success" : "default"}
                    size="sm"
                  >
                    {team.currentUserRole === "admin"
                      ? "Team admin"
                      : "Team member"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:justify-end">
            <a
              href={getTeamPageHref(team)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenTeam?.(team)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-2 text-sm font-semibold tracking-tight text-brand-700 transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:hover:bg-slate-900"
            >
              <ExternalLink className="h-4 w-4" />
              Open page
            </a>
            {team.canManage ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => onEditTeam(team)}
                  size="sm"
                >
                  Edit team
                </Button>
                {onTeamSettings && (
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Settings className="h-4 w-4" />}
                    onClick={() => onTeamSettings(team)}
                    size="sm"
                  >
                    Settings
                  </Button>
                )}
              </>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                Read only
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
