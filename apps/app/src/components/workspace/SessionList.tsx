import { CalendarClock } from "lucide-react";

import { SessionCard } from "./SessionCard";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TeamSession } from "@/lib/workspace-service";

interface SessionListProps {
  sessions: TeamSession[];
  isLoading: boolean;
  onOpenRoom: (key: string) => void;
}

export function SessionList({
  sessions,
  isLoading,
  onOpenRoom,
}: SessionListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Spinner size="sm" />
        <span>Loading sessions...</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-8 w-8" />}
        title="No sessions linked"
        description="Use the 'Save' button in a room to link it to this team."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard
          key={`${session.teamId}-${session.id}`}
          session={session}
          onOpenRoom={onOpenRoom}
        />
      ))}
    </div>
  );
}
