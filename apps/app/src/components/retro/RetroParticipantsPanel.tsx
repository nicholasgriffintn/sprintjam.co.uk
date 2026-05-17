import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface RetroParticipantsPanelProps {
  users: string[];
  readyUsers: string[];
  isReady: boolean;
  onReadyChange: (ready: boolean) => void;
}

export function RetroParticipantsPanel({
  users,
  readyUsers,
  isReady,
  onReadyChange,
}: RetroParticipantsPanelProps) {
  const readyUserSet = new Set(readyUsers);

  return (
    <div
      data-testid="participants-panel"
      className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-950 dark:text-white">
          Participants
        </h2>
        <Badge
          variant={readyUsers.length === users.length ? "success" : "info"}
        >
          {readyUsers.length}/{users.length} ready
        </Badge>
      </div>
      <div
        data-testid="participants-list"
        className="mt-3 flex flex-wrap gap-2"
      >
        {users.map((user) => {
          const participantReady = readyUserSet.has(user);

          return (
            <span
              key={user}
              data-testid="participant-row"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {user}
              {participantReady ? (
                <span
                  data-testid="participant-ready"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      <Button
        type="button"
        variant={isReady ? "primary" : "secondary"}
        fullWidth
        className="mt-4"
        icon={<CheckCircle2 className="h-4 w-4" />}
        aria-pressed={isReady}
        onClick={() => onReadyChange(!isReady)}
      >
        {isReady ? "Marked ready" : "I am ready"}
      </Button>
    </div>
  );
}
