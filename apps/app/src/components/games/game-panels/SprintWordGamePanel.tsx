import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { RoomGameSession } from "@/types";

interface SprintWordGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
}

export const SprintWordGamePanel = ({
  gameSession,
  userName,
  onSubmitMove,
}: SprintWordGamePanelProps) => {
  const [guess, setGuess] = useState("");

  const isActive = gameSession.status === "active";
  const guesses = gameSession.sprintWordPlayerGuesses?.[userName] ?? [];
  const isDone = Boolean(gameSession.sprintWordPlayerDone?.[userName]);
  const doneCount = Object.values(
    gameSession.sprintWordPlayerDone ?? {},
  ).filter(Boolean).length;

  useEffect(() => {
    setGuess("");
  }, [gameSession.round]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-200">
          Sprint Word
        </p>
        {isActive ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {doneCount}/{gameSession.participants.length} done
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          const row = guesses[rowIndex];
          return (
            <div key={rowIndex} className="flex gap-1">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = row?.word[colIndex] ?? "";
                const result = row?.result[colIndex];
                return (
                  <div
                    key={colIndex}
                    className={`flex h-9 w-9 items-center justify-center rounded border text-sm font-bold uppercase ${
                      result === "correct"
                        ? "border-green-500 bg-green-500 text-white"
                        : result === "present"
                          ? "border-yellow-400 bg-yellow-400 text-white"
                          : result === "absent"
                            ? "border-slate-400 bg-slate-400 text-white dark:border-slate-600 dark:bg-slate-600"
                            : "border-slate-300 bg-white text-slate-900 dark:border-white/20 dark:bg-slate-900 dark:text-white"
                    }`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {isActive ? (
        isDone ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Waiting for others to finish…
          </p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (guess.length !== 5) return;
              onSubmitMove(guess.toUpperCase());
              setGuess("");
            }}
          >
            <input
              value={guess}
              onChange={(event) =>
                setGuess(
                  event.target.value.replace(/[^A-Za-z]/g, "").slice(0, 5),
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
              placeholder="Enter 5-letter word"
              maxLength={5}
            />
            <Button type="submit" disabled={guess.length !== 5}>
              Guess
            </Button>
          </form>
        )
      ) : null}
    </div>
  );
};
