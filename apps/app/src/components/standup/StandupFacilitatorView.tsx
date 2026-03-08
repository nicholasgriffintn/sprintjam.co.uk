import { type StandupData } from "@sprintjam/types";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  LockOpen,
  Play,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StandupUserCard } from "@/components/standup/StandupUserCard";

interface StandupFacilitatorViewProps {
  standupData: StandupData;
  isSocketConnected: boolean;
  onLockResponses: () => void;
  onUnlockResponses: () => void;
  onStartPresentation: () => void;
  onCompleteStandup: () => void;
  onFocusUser: (userName: string) => void;
  isCompletingStandup?: boolean;
}

const HEALTH_SCALE = [1, 2, 3, 4, 5] as const;

export function StandupFacilitatorView({
  standupData,
  isSocketConnected,
  onLockResponses,
  onUnlockResponses,
  onStartPresentation,
  onCompleteStandup,
  onFocusUser,
  isCompletingStandup = false,
}: StandupFacilitatorViewProps) {
  const responseOrder = new Map(
    standupData.users.map((user, index) => [user, index]),
  );
  const orderedResponses = [...standupData.responses].sort(
    (left, right) =>
      (responseOrder.get(left.userName) ?? Number.MAX_SAFE_INTEGER) -
      (responseOrder.get(right.userName) ?? Number.MAX_SAFE_INTEGER),
  );
  const blockers = orderedResponses.filter((response) => response.hasBlocker);
  const pendingUsers = standupData.users.filter(
    (user) => !standupData.respondedUsers.includes(user),
  );
  const averageHealth = orderedResponses.length
    ? orderedResponses.reduce(
        (sum, response) => sum + response.healthCheck,
        0,
      ) / orderedResponses.length
    : 0;
  const distribution = HEALTH_SCALE.map((value) => ({
    value,
    count: orderedResponses.filter((response) => response.healthCheck === value)
      .length,
  }));
  const isCompleted = standupData.status === "completed";

  return (
    <div className="space-y-6">
      <SurfaceCard className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Results
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">
                {standupData.respondedUsers.length}/{standupData.users.length}{' '}
                submitted
              </Badge>
              {blockers.length ? (
                <Badge variant="error">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {blockers.length} blocker{blockers.length === 1 ? '' : 's'}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!isSocketConnected || isCompleted}
              onClick={
                standupData.status === 'locked'
                  ? onUnlockResponses
                  : onLockResponses
              }
              icon={
                standupData.status === 'locked' ? (
                  <LockOpen className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )
              }
            >
              {standupData.status === 'locked'
                ? 'Unlock responses'
                : 'Lock responses'}
            </Button>
            <Button
              size="sm"
              disabled={
                !isSocketConnected ||
                orderedResponses.length === 0 ||
                isCompleted
              }
              onClick={onStartPresentation}
              icon={<Play className="h-4 w-4" />}
            >
              Start presentation
            </Button>
            <Button
              size="sm"
              variant={isCompleted ? 'secondary' : 'primary'}
              disabled={!isSocketConnected || isCompleted}
              isLoading={isCompletingStandup}
              onClick={onCompleteStandup}
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Complete standup
            </Button>
          </div>
        </div>

        {isCompleted ? (
          <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:text-emerald-100">
            This standup is complete. The responses below remain available as
            read-only history.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Average health
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              {orderedResponses.length ? averageHealth.toFixed(1) : '--'}
            </div>
            <div className="mt-3 space-y-2">
              {distribution.map((item) => (
                <div
                  key={item.value}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-3 text-slate-500 dark:text-slate-400">
                    {item.value}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-slate-200/80 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: orderedResponses.length
                          ? `${(item.count / orderedResponses.length) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-slate-600 dark:text-slate-300">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Blocker summary
            </div>
            {blockers.length ? (
              <div className="mt-3 space-y-2">
                {blockers.map((response) => (
                  <div
                    key={response.userName}
                    className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-950/20 dark:text-rose-100"
                  >
                    <span className="font-semibold">{response.userName}</span>
                    <span className="ml-2">
                      {response.blockerDescription || 'Needs follow-up'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                No blockers flagged yet.
              </p>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Waiting on
            </div>
            {pendingUsers.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingUsers.map((user) => (
                  <span
                    key={user}
                    className="rounded-full border border-black/5 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"
                  >
                    {user}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Everyone has checked in.
              </p>
            )}
          </div>
        </div>
      </SurfaceCard>

      {orderedResponses.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {orderedResponses.map((response) => (
            <StandupUserCard
              key={response.userName}
              response={response}
              avatar={standupData.userAvatars?.[response.userName]}
              isFocused={standupData.focusedUser === response.userName}
              canFocus
              onFocus={onFocusUser}
            />
          ))}
        </div>
      ) : (
        <SurfaceCard className="py-10 text-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            No responses yet
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Submitted updates will appear here.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}
