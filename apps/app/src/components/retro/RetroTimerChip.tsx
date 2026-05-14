import { useEffect, useMemo, useRef, useState } from "react";
import type { RetroData } from "@sprintjam/types";
import {
  ChevronDown,
  Clock3,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";

import { TIMER_DURATION_PRESETS } from "@/constants";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui";
import {
  configureRetroTimer,
  extendRetroTimer,
  pauseRetroTimer,
  resetRetroTimer,
  startRetroTimer,
} from "@/lib/retro-api-service";
import { playChime, primeChimeAudio } from "@/lib/audio";
import { cn } from "@/lib/cn";
import { formatTime } from "@/utils/time";
import {
  calculateRemainingSeconds,
  getTargetDurationSeconds,
} from "@/utils/timer";

interface RetroTimerChipProps {
  retro: RetroData;
  isModerator: boolean;
}

const EXTENSION_SECONDS = 5 * 60;

export function RetroTimerChip({ retro, isModerator }: RetroTimerChipProps) {
  const timerState = retro.timerState;
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const lastSyncRef = useRef<{ seconds: number; time: number } | null>(null);
  const hasNotifiedRef = useRef(false);
  const [showControls, setShowControls] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(timerState?.seconds ?? 0);

  useEffect(() => {
    if (!timerState) {
      setLocalSeconds(0);
      lastSyncRef.current = null;
      return;
    }

    setLocalSeconds(timerState.seconds);
    lastSyncRef.current = { seconds: timerState.seconds, time: Date.now() };
  }, [timerState?.lastUpdateTime, timerState?.running, timerState?.seconds]);

  useEffect(() => {
    if (!timerState?.running) return undefined;

    const intervalId = window.setInterval(() => {
      if (!lastSyncRef.current) return;
      const elapsedSinceSync = Math.floor(
        (Date.now() - lastSyncRef.current.time) / 1000,
      );
      setLocalSeconds(lastSyncRef.current.seconds + elapsedSinceSync);
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [timerState?.running]);

  useEffect(() => {
    if (!showControls) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        setShowControls(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showControls]);

  const targetDurationSeconds = getTargetDurationSeconds(timerState);
  const remainingSeconds = calculateRemainingSeconds(timerState, localSeconds);
  const remainingRatio =
    targetDurationSeconds > 0 ? remainingSeconds / targetDurationSeconds : 1;
  const isRunning = timerState?.running ?? false;
  const isFinished = Boolean(timerState) && remainingSeconds <= 0;

  useEffect(() => {
    if (!timerState || !isRunning) {
      hasNotifiedRef.current = false;
      return;
    }

    if (remainingSeconds > 0) {
      hasNotifiedRef.current = false;
      return;
    }

    if (hasNotifiedRef.current) return;

    hasNotifiedRef.current = true;
    playChime();
    toast.warning({
      title: "Retro timer finished",
      description: "Time is up for this retro phase.",
      timeout: 10000,
      data: isModerator
        ? {
            actions: [
              {
                label: "Extend 5 min",
                onClick: () => extendRetroTimer(EXTENSION_SECONDS),
              },
            ],
          }
        : undefined,
    });
  }, [isModerator, isRunning, remainingSeconds, timerState]);

  const chipStyles = useMemo(() => {
    if (isFinished) {
      return "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-100";
    }

    if (!isRunning) {
      return "border-slate-200/70 bg-white/90 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100";
    }

    if (remainingRatio <= 0.25) {
      return "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100";
    }

    return "border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-100";
  }, [isFinished, isRunning, remainingRatio]);

  const handleToggleTimer = () => {
    primeChimeAudio();
    if (isRunning) {
      pauseRetroTimer();
      return;
    }
    startRetroTimer();
  };

  const handleReset = () => {
    resetRetroTimer();
  };

  const handleSelectDuration = (seconds: number) => {
    configureRetroTimer({
      targetDurationSeconds: seconds,
      resetCountdown: true,
    });
  };

  const handleExtend = () => {
    primeChimeAudio();
    extendRetroTimer(EXTENSION_SECONDS);
  };

  return (
    <div className="relative" ref={controlsRef}>
      <Button
        type="button"
        variant="unstyled"
        onClick={() => isModerator && setShowControls((current) => !current)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm",
          isModerator && "hover:opacity-85",
          chipStyles,
        )}
        aria-label={`Timer: ${formatTime(remainingSeconds)} remaining`}
        aria-haspopup={isModerator}
        aria-expanded={showControls}
      >
        <Clock3 className="h-4 w-4" />
        <span className="font-mono">{formatTime(remainingSeconds)}</span>
        {isModerator ? <ChevronDown className="h-3.5 w-3.5" /> : null}
      </Button>

      {showControls && isModerator ? (
        <div
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200/80 bg-white/95 p-3 text-slate-900 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:text-white"
          role="menu"
        >
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={
                isRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )
              }
              onClick={handleToggleTimer}
            >
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth
            className="mt-2"
            icon={<Plus className="h-4 w-4" />}
            onClick={handleExtend}
          >
            Extend 5 min
          </Button>

          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Duration
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TIMER_DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => handleSelectDuration(preset.seconds)}
                  className={cn(
                    "rounded-full border px-2 py-1 text-xs font-semibold transition-colors",
                    preset.seconds === targetDurationSeconds
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
