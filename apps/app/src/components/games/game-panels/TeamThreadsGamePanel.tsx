import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { RoomGameSession } from "@/types";

interface TeamThreadsGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
}

const DIFFICULTY_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  2: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100",
  3: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  4: "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100",
};

export const TeamThreadsGamePanel = ({
  gameSession,
  onSubmitMove,
}: TeamThreadsGamePanelProps) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const isActive = gameSession.status === "active";
  const foundGroups = gameSession.teamThreadsFoundGroups ?? [];
  const lives = gameSession.teamThreadsLives ?? 4;
  const allWords = gameSession.teamThreadsWords ?? [];

  const remainingWords = useMemo(
    () => allWords.filter((w) => !foundGroups.some((g) => g.words.includes(w))),
    [allWords, foundGroups],
  );

  useEffect(() => {
    setSelectedWords([]);
  }, [gameSession.round]);

  const toggleWord = (word: string) => {
    setSelectedWords((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-200">
          Team Threads
        </p>
        {isActive ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`inline-block h-3 w-3 rounded-full ${
                  i < lives
                    ? "bg-brand-500 dark:bg-brand-400"
                    : "bg-slate-300 dark:bg-white/20"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
              {lives} {lives === 1 ? "life" : "lives"}
            </span>
          </div>
        ) : null}
      </div>

      {foundGroups.length > 0 ? (
        <div className="space-y-1">
          {foundGroups.map((group) => (
            <div
              key={group.category}
              className={`rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-wide ${DIFFICULTY_STYLES[group.difficulty] ?? DIFFICULTY_STYLES[1]}`}
            >
              {group.category}
              <span className="ml-2 text-xs font-normal opacity-75">
                found by {group.foundBy}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {isActive && remainingWords.length > 0 ? (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {remainingWords.map((word) => {
              const isSelected = selectedWords.includes(word);
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => toggleWord(word)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    isSelected
                      ? "border-brand-500 bg-brand-100 text-brand-800 dark:border-brand-300 dark:bg-brand-900/30 dark:text-brand-100"
                      : "border-slate-300 bg-white text-slate-800 hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-300"
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedWords.length}/4 selected
            </p>
            <Button
              type="button"
              size="sm"
              disabled={selectedWords.length !== 4}
              onClick={() => {
                onSubmitMove(selectedWords.join(","));
                setSelectedWords([]);
              }}
            >
              Submit group
            </Button>
          </div>
        </>
      ) : null}

      {!isActive && remainingWords.length > 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {lives === 0 ? "Out of lives!" : null} {remainingWords.length} group
          {remainingWords.length !== 1 ? "s" : ""} not found.
        </p>
      ) : null}
    </div>
  );
};
