import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Timer as TimerIcon, Pause as PauseIcon, RefreshCcw as ResetIcon } from 'lucide-react';

import { formatTime } from '../utils/time';

export function Timer() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning]);

  return (
    <div className="mb-4 flex items-center space-x-2">
      <span className="font-mono text-lg text-gray-500 dark:text-gray-400">
        {formatTime(timerSeconds)}
      </span>
      <motion.button
        type="button"
        onClick={() => setTimerRunning(!timerRunning)}
        className="p-1 rounded bg-blue-200 hover:bg-blue-300"
        title={timerRunning ? "Pause Timer" : "Start Timer"}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {timerRunning ? <PauseIcon className="w-6 h-6" /> : <TimerIcon className="w-6 h-6" />}
      </motion.button>
      <motion.button
        type="button"
        onClick={() => {
          setTimerRunning(false);
          setTimerSeconds(0);
        }}
        className="p-1 rounded bg-blue-200 hover:bg-blue-300"
        title="Reset Timer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ResetIcon className="w-6 h-6" />
      </motion.button>
    </div>
  );
}