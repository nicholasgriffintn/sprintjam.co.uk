import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
    Clock,
    Hourglass,
    ChevronDown,
} from "lucide-react";

import { useRoom } from "@/context/RoomContext";
import { addEventListener, removeEventListener, startTimer, pauseTimer, resetTimer } from "@/lib/api-service";
import type { WebSocketMessage } from "@/types";
import { formatTime } from "@/utils/time";
import { calculateCurrentSeconds } from "@/utils/timer";
import { playChime } from "@/lib/audio";

export function TimerChip() {
    const { roomData, isModeratorView } = useRoom();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [localSeconds, setLocalSeconds] = useState(0);
    const [hasPlayed, setHasPlayed] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const controlsRef = useRef<HTMLDivElement | null>(null);

    const mode = "stopwatch";

    useEffect(() => {
        const currentSeconds = calculateCurrentSeconds(roomData?.timerState);
        setLocalSeconds(currentSeconds);
    }, [roomData?.timerState]);

    useEffect(() => {
        if (roomData?.timerState?.running) {
            timerRef.current = setInterval(() => {
                setLocalSeconds((prev) => {
                    return prev + 1;
                });
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [roomData?.timerState?.running, mode]);

    useEffect(() => {
        if (localSeconds > 0) {
            setHasPlayed(false);
        }
    }, [localSeconds, mode, roomData?.timerState?.running, hasPlayed]);

    useEffect(() => {
        const handleTimerUpdate = (message: WebSocketMessage) => {
            if (message.timerState) {
                const currentSeconds = calculateCurrentSeconds(message.timerState);
                setLocalSeconds(currentSeconds);
                setHasPlayed(false);
            }
        };

        addEventListener('timerStarted', handleTimerUpdate);
        addEventListener('timerPaused', handleTimerUpdate);
        addEventListener('timerReset', handleTimerUpdate);
        addEventListener('timerUpdated', handleTimerUpdate);

        return () => {
            removeEventListener('timerStarted', handleTimerUpdate);
            removeEventListener('timerPaused', handleTimerUpdate);
            removeEventListener('timerReset', handleTimerUpdate);
            removeEventListener('timerUpdated', handleTimerUpdate);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
                setShowControls(false);
            }
        };

        if (showControls) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showControls]);

    const timerRunning = roomData?.timerState?.running ?? false;

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

    const getChipColor = () => {
        if (!timerRunning) {
            return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
        }
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600';
    };

    const getTextColor = () => {
        if (!timerRunning) {
            return 'text-gray-700 dark:text-gray-300';
        }
        return 'text-blue-700 dark:text-blue-300';
    };

    const displayTime = formatTime(localSeconds);

    return (
        <div className="relative" ref={controlsRef} data-testid="room-timer">
            <motion.button
                type="button"
                onClick={() => isModeratorView && setShowControls(!showControls)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium transition-colors ${getChipColor()} ${getTextColor()} ${isModeratorView ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                aria-label={`Timer: ${displayTime}, ${timerRunning ? 'Running' : 'Paused'}`}
                aria-haspopup={isModeratorView}
                aria-expanded={showControls}
            >
                {mode === 'stopwatch' ? (
                    <Clock className="w-4 h-4" />
                ) : (
                    <Hourglass className="w-4 h-4" />
                )}
                <span className="font-mono font-semibold">{displayTime}</span>
                {isModeratorView && <ChevronDown className="w-3 h-3" />}
            </motion.button>

            <AnimatePresence>
                {showControls && isModeratorView && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50"
                        role="menu"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleToggleTimer}
                                    className="flex-1 px-3 py-2 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600"
                                    aria-label={timerRunning ? 'Pause timer' : 'Start timer'}
                                    role="menuitem"
                                >
                                    {timerRunning ? 'Pause' : 'Start'}
                                </button>
                            </div>

                            <button
                                onClick={handleResetTimer}
                                className="w-full px-3 py-2 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                aria-label="Reset timer"
                                role="menuitem"
                            >
                                Reset
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
