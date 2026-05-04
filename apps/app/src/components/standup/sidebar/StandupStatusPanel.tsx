import { useId } from "react";
import type { StandupData } from "@sprintjam/types";
import { ChevronDown, ChevronUp, Info, Radio } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { ScrollArea } from "@/components/ui";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { cn } from "@/lib/cn";

interface StandupStatusPanelProps {
  standupData: StandupData;
  currentUserName: string;
  isSocketConnected: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function StandupStatusPanel({
  standupData,
  currentUserName,
  isSocketConnected,
  isCollapsed,
  onToggleCollapse,
}: StandupStatusPanelProps) {
  const submittedCount = standupData.respondedUsers.length;
  const totalParticipants = standupData.users.length;
  const connectedCount = standupData.users.filter(
    (user) => standupData.connectedUsers[user],
  ).length;
  const waitingCount = Math.max(totalParticipants - submittedCount, 0);
  const progressPercent = totalParticipants
    ? Math.round((submittedCount / totalParticipants) * 100)
    : 0;
  const hasResponded = standupData.respondedUsers.some(
    (user) => user.toLowerCase() === currentUserName.toLowerCase(),
  );
  const statusSectionId = useId();
  const contentId = `${statusSectionId}-content`;
  const headingId = `${statusSectionId}-heading`;
  const progressLabelId = `${statusSectionId}-progress`;
  const progressDescriptionId = `${statusSectionId}-progress-description`;

  return (
    <SurfaceCard
      padding="none"
      className="flex flex-col overflow-hidden border border-slate-200/80 shadow-lg dark:border-slate-800"
      role="region"
      aria-labelledby={headingId}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-white/40 px-4 py-3 dark:border-white/10",
          isCollapsed && "border-b-0 py-2",
        )}
      >
        <h2
          id={headingId}
          className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"
        >
          <Info size={18} className="hidden md:inline-flex" />
          <span className="inline-flex items-center gap-1 leading-none">
            Live room status
          </span>
        </h2>
        <Button
          type="button"
          variant="unstyled"
          className="inline-flex items-center rounded-full border border-white/40 bg-white/70 p-1 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/10 dark:bg-white/10 dark:text-white"
          onClick={onToggleCollapse}
          aria-label={
            isCollapsed ? "Expand room status" : "Collapse room status"
          }
          aria-expanded={!isCollapsed}
          aria-controls={contentId}
          data-testid="standup-status-toggle"
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </Button>
      </div>

      <ScrollArea
        id={contentId}
        aria-label="Live room status summary"
        className={cn("px-4 py-4", isCollapsed && "hidden")}
        contentClassName="space-y-3"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isSocketConnected ? "success" : "warning"}>
              <Radio className="mr-1 h-3 w-3" />
              {isSocketConnected ? "Connected" : "Reconnecting"}
            </Badge>
            <Badge variant={hasResponded ? "success" : "default"}>
              {hasResponded ? "Your update saved" : "Waiting for your update"}
            </Badge>
          </div>

          <div className="space-y-2">
            <div
              id={progressLabelId}
              className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
            >
              <span>Submission progress</span>
              <span id={progressDescriptionId}>
                {submittedCount}/{totalParticipants}
              </span>
            </div>
            <Progress
              value={progressPercent}
              aria-labelledby={progressLabelId}
              aria-describedby={progressDescriptionId}
              aria-valuetext={`${submittedCount} of ${totalParticipants} participants have submitted`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Connected
              </div>
              <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {connectedCount}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Waiting
              </div>
              <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {waitingCount}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </SurfaceCard>
  );
}
