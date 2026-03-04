import type { StandupData } from "@sprintjam/types";
import { CheckCircle2, Crosshair, Radio, ShieldCheck } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { cn } from "@/lib/cn";

interface StandupSidebarProps {
  standupData: StandupData;
  currentUserName: string;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function StandupSidebar({
  standupData,
  currentUserName,
}: StandupSidebarProps) {
  const submittedUsers = new Set(standupData.respondedUsers);
  const connectedCount = standupData.users.filter(
    (user) => standupData.connectedUsers[user],
  ).length;

  return (
    <SurfaceCard className="flex min-h-[28rem] flex-col gap-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="info">
            <Radio className="mr-1 h-3 w-3" />
            Live roster
          </Badge>
          <Badge variant="primary">
            {standupData.respondedUsers.length}/{standupData.users.length} ready
          </Badge>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Participants
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {connectedCount} connected now. Submission status updates for everyone,
          response content stays private.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-3xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Connected
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {connectedCount}
          </div>
        </div>
        <div className="rounded-3xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Waiting
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {standupData.users.length - standupData.respondedUsers.length}
          </div>
        </div>
      </div>

      <ScrollArea
        className="rounded-3xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-white/[0.03]"
        contentClassName="space-y-2 pr-3"
        aria-label="Standup participants"
      >
        {standupData.users.map((participant) => {
          const isModerator = participant === standupData.moderator;
          const isConnected = !!standupData.connectedUsers[participant];
          const hasResponded = submittedUsers.has(participant);
          const isFocused = standupData.focusedUser === participant;
          const isCurrentUser =
            participant.toLowerCase() === currentUserName.toLowerCase();

          return (
            <div
              key={participant}
              className={cn(
                "rounded-[1.5rem] border px-4 py-3 transition-colors",
                isFocused
                  ? "border-brand-300 bg-brand-50/90 dark:border-brand-400/40 dark:bg-brand-950/20"
                  : "border-black/5 bg-white/80 dark:border-white/10 dark:bg-slate-950/35",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={standupData.userAvatars?.[participant]}
                    alt={participant}
                    fallback={getInitials(participant)}
                    className="h-10 w-10 border border-black/5 bg-brand-100 text-sm font-semibold text-brand-900 dark:border-white/10 dark:bg-brand-500/20 dark:text-brand-100"
                    fallbackClassName="bg-transparent"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900 dark:text-white">
                      {participant}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {isModerator
                        ? "Facilitator"
                        : isConnected
                          ? "In the room"
                          : "Offline"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-1.5">
                  {isCurrentUser ? <Badge size="sm">You</Badge> : null}
                  {isModerator ? (
                    <Badge variant="warning" size="sm">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Lead
                    </Badge>
                  ) : null}
                  {isFocused ? (
                    <Badge variant="primary" size="sm">
                      <Crosshair className="mr-1 h-3 w-3" />
                      Live
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={isConnected ? "success" : "default"} size="sm">
                  {isConnected ? "Online" : "Away"}
                </Badge>
                <Badge variant={hasResponded ? "primary" : "default"} size="sm">
                  {hasResponded ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Submitted
                    </>
                  ) : (
                    "Waiting"
                  )}
                </Badge>
              </div>
            </div>
          );
        })}
      </ScrollArea>
    </SurfaceCard>
  );
}
