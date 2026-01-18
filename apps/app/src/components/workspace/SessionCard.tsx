import {
  Target,
  CalendarClock,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { TeamSession } from "@/lib/workspace-service";

interface SessionCardProps {
  session: TeamSession;
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

export function SessionCard({ session, onOpenRoom }: SessionCardProps) {
  const isComplete = Boolean(session.completedAt);

  return (
    <SurfaceCard
      variant="subtle"
      padding="sm"
      className="flex items-start justify-between gap-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
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
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          onClick={() => onOpenRoom(session.roomKey)}
        >
          Open room
        </Button>
      </div>
    </SurfaceCard>
  );
}
