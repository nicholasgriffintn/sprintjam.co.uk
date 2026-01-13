import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Clock, Hourglass, ChevronDown } from "lucide-react";

import { useRoomState } from "@/context/RoomContext";
import { Button } from "@/components/ui/Button";
import {
  addEventListener,
  removeEventListener,
  startTimer,
  pauseTimer,
  resetTimer,
  configureTimer,
} from "@/lib/api-service";
import type { WebSocketMessage } from "@/types";
import { formatTime } from "@/utils/time";
import {
  calculateRemainingSeconds,
  getTargetDurationSeconds,
} from "@/utils/timer";
import { TIMER_DURATION_PRESETS } from "@/constants";
import { playChime, primeChimeAudio } from "@/lib/audio";

const MotionButton = motion(Button);

export function TimerChip() {
  const { roomData, isModeratorView } = useRoomState();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localSeconds, setLocalSeconds] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(true);
  const [hasCountdownCompleted, setHasCountdownCompleted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const mode = "stopwatch";

  const lastSyncRef = useRef<{ seconds: number; time: number } | null>(null);

  useEffect(() => {
    const timerState = roomData?.timerState;
    if (!timerState) {
      setLocalSeconds(0);
      lastSyncRef.current = null;
      return;
    }

    setLocalSeconds(timerState.seconds);
    lastSyncRef.current = { seconds: timerState.seconds, time: Date.now() };
  }, [roomData?.timerState?.seconds, roomData?.timerState?.running]);

  useEffect(() => {
    if (roomData?.timerState?.running) {
      timerRef.current = setInterval(() => {
        if (lastSyncRef.current) {
          const elapsedSinceSync = Math.floor(
            (Date.now() - lastSyncRef.current.time) / 1000,
          );
          setLocalSeconds(lastSyncRef.current.seconds + elapsedSinceSync);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [roomData?.timerState?.running]);

  useEffect(() => {
    if (localSeconds > 0) {
      setHasPlayed(false);
    }
  }, [localSeconds, mode, roomData?.timerState?.running, hasPlayed]);

  useEffect(() => {
    const handleTimerUpdate = (message: WebSocketMessage) => {
      if ("timerState" in message && message.timerState) {
        const timerState = message.timerState;
        setLocalSeconds(timerState.seconds);
        lastSyncRef.current = { seconds: timerState.seconds, time: Date.now() };
        setHasPlayed(false);
      }
    };

    addEventListener("timerStarted", handleTimerUpdate);
    addEventListener("timerPaused", handleTimerUpdate);
    addEventListener("timerReset", handleTimerUpdate);
    addEventListener("timerUpdated", handleTimerUpdate);

    return () => {
      removeEventListener("timerStarted", handleTimerUpdate);
      removeEventListener("timerPaused", handleTimerUpdate);
      removeEventListener("timerReset", handleTimerUpdate);
      removeEventListener("timerUpdated", handleTimerUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        setShowControls(false);
      }
    };

    if (showControls) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showControls]);

  const timerRunning = roomData?.timerState?.running ?? false;
  const targetDurationSeconds = getTargetDurationSeconds(roomData?.timerState);
  const remainingSeconds = calculateRemainingSeconds(
    roomData?.timerState,
    localSeconds,
  );
  const remainingRatio =
    targetDurationSeconds > 0 ? remainingSeconds / targetDurationSeconds : 1;
  const autoResetEnabled = roomData?.timerState?.autoResetOnVotesReset ?? false;

  useEffect(() => {
    if (!timerRunning) {
      setHasCountdownCompleted(false);
      return;
    }

    if (!hasCountdownCompleted && remainingSeconds <= 0) {
      playChime();
      setHasCountdownCompleted(true);
    } else if (
      hasCountdownCompleted &&
      remainingSeconds > targetDurationSeconds * 0.1
    ) {
      setHasCountdownCompleted(false);
    }
  }, [
    remainingSeconds,
    timerRunning,
    hasCountdownCompleted,
    targetDurationSeconds,
  ]);

  const handleChipClick = () => {
    if (!isModeratorView) {
      return;
    }
    setShowControls((prev) => !prev);
  };

  const handleToggleTimer = () => {
    primeChimeAudio();
    try {
      if (timerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    } catch (error) {
      console.error("Failed to toggle timer:", error);
    }
  };

  const handleResetTimer = () => {
    try {
      resetTimer();
      configureTimer({
        resetCountdown: true,
      });
    } catch (error) {
      console.error("Failed to reset timer:", error);
    }
  };

  const handleToggleAutoReset = () => {
    try {
      configureTimer({
        autoResetOnVotesReset: !autoResetEnabled,
      });
    } catch (error) {
      console.error("Failed to toggle timer auto reset:", error);
    }
  };

  const getChipStyles = () => {
    if (!timerRunning) {
      return {
        chip: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
        text: "text-gray-700 dark:text-gray-300",
        subtext: "text-gray-500 dark:text-gray-400",
      };
    }
    if (remainingRatio <= 0.1) {
      return {
        chip: "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600",
        text: "text-red-700 dark:text-red-300",
        subtext: "text-red-600 dark:text-red-200",
      };
    }
    if (remainingRatio <= 0.3) {
      return {
        chip: "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600",
        text: "text-amber-700 dark:text-amber-300",
        subtext: "text-amber-600 dark:text-amber-200",
      };
    }
    return {
      chip: "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600",
      text: "text-blue-700 dark:text-blue-300",
      subtext: "text-blue-600 dark:text-blue-200",
    };
  };

  const { chip: chipClass, text: textClass } = getChipStyles();

  const displayElapsed = formatTime(localSeconds);
  const displayRemaining = formatTime(remainingSeconds);

  const handleSelectDuration = (seconds: number) => {
    try {
      configureTimer({
        targetDurationSeconds: seconds,
        resetCountdown: true,
      });
    } catch (error) {
      console.error("Failed to update timer duration:", error);
    }
  };

  return (
    <div className="relative" ref={controlsRef} data-testid="room-timer">
      <MotionButton
        type="button"
        variant="unstyled"
        onClick={handleChipClick}
        className={`px-3 py-1.5 rounded-full border text-sm ${chipClass} ${textClass} ${
          isModeratorView ? "hover:opacity-80" : ""
        }`}
        aria-label={`Timer: elapsed ${displayElapsed}, ${displayRemaining} left, ${
          timerRunning ? "Running" : "Paused"
        }`}
        aria-haspopup={isModeratorView}
        aria-expanded={showControls}
        cursor={isModeratorView ? "pointer" : "default"}
      >
        {mode === "stopwatch" ? (
          <Clock className="w-4 h-4" />
        ) : (
          <Hourglass className="w-4 h-4" />
        )}
        <div className="flex flex-col leading-tight text-left">
          <span className="font-mono font-semibold">{displayElapsed}</span>
        </div>
        {isModeratorView && <ChevronDown className="w-3 h-3" />}
      </MotionButton>

      <AnimatePresence>
        {showControls && isModeratorView && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50"
            role="menu"
            data-testid="timer-controls"
          >
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  onClick={handleToggleTimer}
                  variant="unstyled"
                  className="flex-1 rounded bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                  aria-label={timerRunning ? "Pause timer" : "Start timer"}
                  aria-pressed={timerRunning}
                  role="menuitem"
                >
                  {timerRunning ? "Pause" : "Start"}
                </Button>
              </div>

              <Button
                onClick={handleResetTimer}
                variant="unstyled"
                className="w-full rounded bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                aria-label="Reset timer"
                role="menuitem"
              >
                Reset
              </Button>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">
                  Expected duration
                </p>
                <div className="flex flex-wrap gap-1">
                  {TIMER_DURATION_PRESETS.map((preset) => {
                    const isActive = preset.seconds === targetDurationSeconds;
                    return (
                      <Button
                        key={preset.seconds}
                        onClick={() => handleSelectDuration(preset.seconds)}
                        variant="unstyled"
                        className={`rounded-full border px-2 py-1 text-xs ${
                          isActive
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-400"
                        }`}
                        type="button"
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Reset restarts the countdown for{" "}
                  {formatTime(targetDurationSeconds)}.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={autoResetEnabled}
                  onChange={handleToggleAutoReset}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Auto reset countdown on vote reset
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
