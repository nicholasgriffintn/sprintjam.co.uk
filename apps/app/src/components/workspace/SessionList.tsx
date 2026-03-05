import { CalendarClock } from "lucide-react";

import { SessionCard } from "./SessionCard";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSessionStats } from "@/hooks/useSessionStats";
import type { TeamSession } from "@sprintjam/types";

interface SessionListProps {
  sessions: TeamSession[];
  isLoading: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenSession: (session: TeamSession) => void;
}

export function SessionList({
  sessions,
  isLoading,
  emptyTitle = "No sessions linked",
  emptyDescription = "Use the save flow from a room or standup to link it to this team.",
  onOpenSession,
}: SessionListProps) {
  const { statsMap, isLoading: isLoadingStats } = useSessionStats(sessions);

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
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-3">
      {isLoadingStats && sessions.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pb-1">
          <Spinner size="sm" />
          <span>Loading session stats...</span>
        </div>
      )}
      {sessions.map((session) => (
        <SessionCard
          key={`${session.teamId}-${session.id}`}
          session={session}
          stats={statsMap[session.roomKey] ?? null}
          onOpenSession={onOpenSession}
        />
      ))}
    </div>
  );
}
