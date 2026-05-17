import { useState } from "react";
import { type StandupData } from "@sprintjam/types";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Play,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StandupUserCard } from "@/components/standup/StandupUserCard";
import { copyText } from "@/lib/clipboard";
import { downloadCsv } from "@/utils/csv";
import {
  buildStandupBlockerFollowUpText,
  buildStandupRecapCsv,
  getOrderedStandupResponses,
} from "@/utils/standup-recap";

interface StandupFacilitatorViewProps {
  standupData: StandupData;
  isSocketConnected: boolean;
  onLockResponses: () => void;
  onUnlockResponses: () => void;
  onStartPresentation: () => void;
  onCompleteStandup: () => void;
  onFocusUser: (userName: string) => void;
  onSetBlockerResolved: (userName: string, resolved: boolean) => void;
  isLockingResponses?: boolean;
  isStartingPresentation?: boolean;
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
  onSetBlockerResolved,
  isLockingResponses = false,
  isStartingPresentation = false,
  isCompletingStandup = false,
}: StandupFacilitatorViewProps) {
  const [showResponses, setShowResponses] = useState(false);
  const [healthRevealed, setHealthRevealed] = useState(false);
  const orderedResponses = getOrderedStandupResponses(standupData);
  const blockers = orderedResponses.filter((response) => response.hasBlocker);
  const unresolvedBlockers = blockers.filter(
    (response) => !response.blockerResolved,
  );
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
  const firstSubmitter = orderedResponses.length
    ? orderedResponses.reduce((min, r) =>
        r.submittedAt < min.submittedAt ? r : min,
      ).userName
    : undefined;
  const hasPrivateHealth = orderedResponses.some(
    (response) => response.isHealthCheckPrivate,
  );
  const shouldHideHealth = hasPrivateHealth && !healthRevealed;

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
                {standupData.respondedUsers.length}/{standupData.users.length}{" "}
                submitted
              </Badge>
              {unresolvedBlockers.length ? (
                <Badge variant="error">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {unresolvedBlockers.length} blocker
                  {unresolvedBlockers.length === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!isSocketConnected || isCompleted || isLockingResponses}
              isLoading={isLockingResponses}
              onClick={
                standupData.status === "locked"
                  ? onUnlockResponses
                  : onLockResponses
              }
              icon={
                standupData.status === "locked" ? (
                  <LockOpen className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )
              }
            >
              {standupData.status === "locked"
                ? "Unlock responses"
                : "Lock responses"}
            </Button>
            <Button
              size="sm"
              disabled={
                !isSocketConnected ||
                orderedResponses.length === 0 ||
                isCompleted ||
                isStartingPresentation
              }
              isLoading={isStartingPresentation}
              onClick={onStartPresentation}
              icon={<Play className="h-4 w-4" />}
            >
              Start presentation
            </Button>
            <Button
              size="sm"
              variant={isCompleted ? "secondary" : "primary"}
              disabled={!isSocketConnected || isCompleted}
              isLoading={isCompletingStandup}
              onClick={onCompleteStandup}
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Complete standup
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void copyText(
                  buildStandupBlockerFollowUpText(standupData, {
                    resolvedBlockers: new Set(
                      blockers
                        .filter((response) => response.blockerResolved)
                        .map((response) => response.userName),
                    ),
                  }),
                )
              }
              icon={<ClipboardCheck className="h-4 w-4" />}
            >
              Copy blockers
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadCsv(
                  `standup-${standupData.key}-recap.csv`,
                  buildStandupRecapCsv(standupData),
                )
              }
              icon={<Download className="h-4 w-4" />}
            >
              Export recap
            </Button>
          </div>
        </div>

        {isCompleted ? (
          <div className="rounded-[1.5rem] border border-emerald-200/40 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/10 dark:bg-emerald-950/10 dark:text-emerald-100">
            This standup is complete. The responses below remain available as
            read-only history.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Average health
            </div>
            {shouldHideHealth ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hidden because one or more responses are private.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHealthRevealed(true)}
                  icon={<Eye className="h-3.5 w-3.5" />}
                >
                  Reveal
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                  {orderedResponses.length ? averageHealth.toFixed(1) : "--"}
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
                              : "0%",
                          }}
                        />
                      </div>
                      <span className="w-6 text-right text-slate-600 dark:text-slate-300">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Blocker summary
            </div>
            {blockers.length ? (
              <div className="mt-3 space-y-2">
                {blockers.map((response) => {
                  const isResolved = response.blockerResolved === true;

                  return (
                    <div
                      key={response.userName}
                      className={
                        isResolved
                          ? "rounded-2xl border border-emerald-200/50 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-400/10 dark:bg-emerald-950/10 dark:text-emerald-100"
                          : "rounded-2xl border border-rose-200/40 bg-rose-50/50 px-3 py-2 text-sm text-rose-800 dark:border-rose-400/10 dark:bg-rose-950/10 dark:text-rose-100"
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <span className="font-semibold">
                            {response.userName}
                          </span>
                          <span className="ml-2">
                            {response.blockerDescription || "Needs follow-up"}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          {isResolved ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Resolved
                            </Badge>
                          ) : null}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              onSetBlockerResolved(
                                response.userName,
                                !isResolved,
                              )
                            }
                          >
                            {isResolved ? "Mark unresolved" : "Mark resolved"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                No blockers flagged yet.
              </p>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Waiting on
            </div>
            {pendingUsers.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingUsers.map((user) => (
                  <span
                    key={user}
                    className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"
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
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {!isCompleted && showResponses ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use <span className="font-semibold">Set first</span> to pick who
                starts when presentation begins.
              </p>
            ) : (
              <div />
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowResponses((prev) => !prev)}
              icon={
                showResponses ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )
              }
            >
              {showResponses ? "Hide responses" : "Show responses"}
            </Button>
          </div>
          {showResponses ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {orderedResponses.map((response) => (
                <StandupUserCard
                  key={response.userName}
                  response={response}
                  avatar={standupData.userAvatars?.[response.userName]}
                  isFocused={standupData.focusedUser === response.userName}
                  isFirstSubmitter={response.userName === firstSubmitter}
                  isModerator
                  canFocus={!isCompleted}
                  onFocus={onFocusUser}
                />
              ))}
            </div>
          ) : null}
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
