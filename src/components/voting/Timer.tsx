import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Timer as TimerIcon,
  Pause as PauseIcon,
  RefreshCcw as ResetIcon,
} from "lucide-react";

import { formatTime } from "@/utils/time";
import { useRoom } from "@/context/RoomContext";
import { addEventListener, removeEventListener, startTimer, pauseTimer, resetTimer } from "@/lib/api-service";
import type { WebSocketMessage, TimerState } from "@/types";

function calculateCurrentSeconds(timerState: TimerState | undefined): number {
  if (!timerState) return 0;

  if (!timerState.running) {
    return timerState.seconds;
  }

  const now = Date.now();
  const elapsedMs = now - timerState.lastUpdateTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return timerState.seconds + elapsedSeconds;
}

export function Timer() {
  const { roomData } = useRoom();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localSeconds, setLocalSeconds] = useState(0);

  useEffect(() => {
    const currentSeconds = calculateCurrentSeconds(roomData?.timerState);
    setLocalSeconds(currentSeconds);
  }, [roomData?.timerState]);

  useEffect(() => {
    if (roomData?.timerState?.running) {
      timerRef.current = setInterval(() => {
        setLocalSeconds((prev) => prev + 1);
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
    const handleTimerUpdate = (message: WebSocketMessage) => {
      if (message.timerState) {
        const currentSeconds = calculateCurrentSeconds(message.timerState);
        setLocalSeconds(currentSeconds);
      }
    };

    addEventListener('timerStarted', handleTimerUpdate);
    addEventListener('timerPaused', handleTimerUpdate);
    addEventListener('timerReset', handleTimerUpdate);

    return () => {
      removeEventListener('timerStarted', handleTimerUpdate);
      removeEventListener('timerPaused', handleTimerUpdate);
      removeEventListener('timerReset', handleTimerUpdate);
    };
  }, []);

  const timerRunning = roomData?.timerState?.running ?? false;
  const timerActionLabel = timerRunning ? 'Pause timer' : 'Start timer';

  const handleToggleTimer = () => {
    try {
      if (timerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    } catch (error) {
      console.error('Failed to toggle timer:', error);
    }
  };

  const handleResetTimer = () => {
    try {
      resetTimer();
    } catch (error) {
      console.error('Failed to reset timer:', error);
    }
  };

  return (
    <div className="mb-4 flex items-center space-x-2" data-testid="room-timer">
      <span
        className="font-mono text-lg text-gray-500 dark:text-gray-400"
        role="timer"
        aria-live="off"
        aria-atomic="true"
        aria-label={`Elapsed time ${formatTime(localSeconds)}`}
      >
        {formatTime(localSeconds)}
      </span>
      <motion.button
        type="button"
        onClick={handleToggleTimer}
        className="p-1 rounded bg-blue-200 text-blue-900 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
        title={timerActionLabel}
        aria-label={timerActionLabel}
        aria-pressed={timerRunning}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {timerRunning ? (
          <PauseIcon className="w-6 h-6" />
        ) : (
          <TimerIcon className="w-6 h-6" />
        )}
      </motion.button>
      <motion.button
        type="button"
        onClick={handleResetTimer}
        className="p-1 rounded bg-blue-200 text-blue-900 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
        title="Reset Timer"
        aria-label="Reset timer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ResetIcon className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
