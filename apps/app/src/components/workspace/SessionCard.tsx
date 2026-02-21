import {
  Target,
  CalendarClock,
  CheckCircle2,
  ArrowUpRight,
  Users,
  Vote,
  Clock,
  Percent,
} from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { SessionStats, TeamSession } from "@sprintjam/types";

interface SessionCardProps {
  session: TeamSession;
  stats?: SessionStats | null;
  onOpenRoom: (key: string) => void;
}

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDuration = (minutes: number | null) => {
  if (minutes === null) return null;
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

function StatBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
      {icon}
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {value}
      </span>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

export function SessionCard({ session, stats, onOpenRoom }: SessionCardProps) {
  const isComplete = Boolean(session.completedAt);
  const duration = formatDuration(stats?.durationMinutes ?? null);

  return (
    <SurfaceCard variant="subtle" padding="sm" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {session.name}
            </p>
            <Badge variant={isComplete ? "default" : "success"} size="sm">
              {isComplete ? "Completed" : "Active"}
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
        <div className="flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            icon={<ArrowUpRight className="h-3.5 w-3.5" />}
            onClick={() => onOpenRoom(session.roomKey)}
          >
            Open room
          </Button>
        </div>
      </div>

      {stats && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <StatBadge
            icon={<Users className="h-3 w-3 text-slate-500" />}
            value={stats.uniqueParticipants}
            label="participants"
          />
          <StatBadge
            icon={<Vote className="h-3 w-3 text-slate-500" />}
            value={stats.totalVotes}
            label="votes"
          />
          <StatBadge
            icon={<Target className="h-3 w-3 text-slate-500" />}
            value={stats.totalRounds}
            label="rounds"
          />
          <StatBadge
            icon={<Percent className="h-3 w-3 text-slate-500" />}
            value={`${Math.round(stats.consensusRate)}%`}
            label="consensus"
          />
          {duration && (
            <StatBadge
              icon={<Clock className="h-3 w-3 text-slate-500" />}
              value={duration}
              label=""
            />
          )}
        </div>
      )}
    </SurfaceCard>
  );
}
