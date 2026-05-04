import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { RoomGameSession } from "@/types";

interface ClueboardGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
}

export const ClueboardGamePanel = ({
  gameSession,
  userName,
  onSubmitMove,
}: ClueboardGamePanelProps) => {
  const [clue, setClue] = useState("");
  const [targetCount, setTargetCount] = useState("2");
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);

  const isActive = gameSession.status === "active";
  const isCluePhase = gameSession.codenamesRoundPhase === "clue";
  const isClueGiver = gameSession.codenamesClueGiver === userName;
  const canSubmitClue = isActive && isCluePhase && isClueGiver;
  const canGuess = isActive && !isCluePhase && !isClueGiver;
  const knownBlockerIndex = isClueGiver
    ? gameSession.codenamesKnownBlockerIndex
    : undefined;
  const clueGiverKnowsBlocker = isClueGiver && knownBlockerIndex !== undefined;
  const revealedIndices = useMemo(
    () => new Set(gameSession.codenamesRevealedIndices ?? []),
    [gameSession.codenamesRevealedIndices],
  );

  useEffect(() => {
    setClue("");
    setTargetCount("2");
    setSelectedTargets([]);
  }, [gameSession.round]);

  if (!isActive) return null;

  return (
    <div className="space-y-3 rounded-xl border border-brand-200/70 p-3 dark:border-brand-300/30">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
          Clueboard
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Clue giver: {gameSession.codenamesClueGiver ?? "TBD"} · Phase:{" "}
          {isCluePhase ? "Clue" : "Guess"}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {isCluePhase
            ? "Clue giver picks target words on the board, then submits clue + number."
            : "Guessers pick words from the board that match the clue."}
        </p>
        {clueGiverKnowsBlocker ? (
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Blocker word is highlighted in red for you only.
          </p>
        ) : null}
        {gameSession.codenamesCurrentClue ? (
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Current clue: {gameSession.codenamesCurrentClue} (
            {gameSession.codenamesCurrentClueTarget ?? 1})
          </p>
        ) : null}
      </div>

      {isCluePhase && canSubmitClue ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!clue.trim()) return;
            const safeCount = Number(targetCount);
            const clampedCount =
              Number.isFinite(safeCount) && safeCount >= 1
                ? Math.min(4, Math.max(1, Math.round(safeCount)))
                : 1;
            if (selectedTargets.length !== clampedCount) return;
            onSubmitMove(
              `clue:${clue.trim().toLowerCase()}|${clampedCount}|${selectedTargets.join(",")}`,
            );
            setClue("");
            setSelectedTargets([]);
          }}
        >
          <input
            value={clue}
            onChange={(event) => setClue(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
            placeholder="Enter one-word clue"
            maxLength={24}
          />
          <select
            value={targetCount}
            onChange={(event) => setTargetCount(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
          >
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            disabled={selectedTargets.length !== Number(targetCount)}
          >
            Set clue
          </Button>
        </form>
      ) : null}

      <div className="space-y-2">
        {!isCluePhase ? (
          canGuess ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onSubmitMove("pass")}
              >
                Pass
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {isClueGiver
                ? "Guessers are resolving your clue."
                : "Waiting for another guesser to play."}
            </p>
          )
        ) : canSubmitClue ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Selected {selectedTargets.length}/{Number(targetCount)} target
            words.
          </p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Waiting for {gameSession.codenamesClueGiver ?? "the clue giver"} to
            submit a clue.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(gameSession.codenamesBoard ?? []).map((word, index) => {
            const isRevealed = revealedIndices.has(index);
            const isSelectedTarget = selectedTargets.includes(index);
            const isKnownBlocker =
              clueGiverKnowsBlocker && knownBlockerIndex === index;
            const canSelectAsTarget = isCluePhase && canSubmitClue;
            const isDisabled =
              isRevealed ||
              (!canSelectAsTarget && !canGuess) ||
              (canSelectAsTarget && isKnownBlocker);

            return (
              <button
                key={`${word}-${index}`}
                type="button"
                onClick={() => {
                  if (canSelectAsTarget) {
                    if (isKnownBlocker) return;
                    const limit = Number(targetCount);
                    setSelectedTargets((previous) => {
                      if (previous.includes(index)) {
                        return previous.filter((v) => v !== index);
                      }
                      if (previous.length >= limit) return previous;
                      return [...previous, index];
                    });
                    return;
                  }
                  if (canGuess) {
                    onSubmitMove(`guess:${index}`);
                  }
                }}
                disabled={isDisabled}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  isRevealed
                    ? "border-slate-300 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                    : isKnownBlocker
                      ? "border-rose-500 bg-rose-100 text-rose-800 dark:border-rose-300 dark:bg-rose-900/30 dark:text-rose-100"
                      : isSelectedTarget
                        ? "border-brand-500 bg-brand-100 text-brand-800 dark:border-brand-300 dark:bg-brand-900/30 dark:text-brand-100"
                        : "border-slate-300 bg-white text-slate-800 hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-300 dark:hover:text-brand-200"
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
