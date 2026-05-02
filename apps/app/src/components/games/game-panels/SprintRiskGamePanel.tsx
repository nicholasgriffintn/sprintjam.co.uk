import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/Button";
import type { RoomGameSession } from "@/types";

interface SprintRiskGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
}

function scoreDice(dice: number[]): number {
  if (dice.length === 0) return 0;
  const counts: Record<number, number> = {};
  for (const d of dice) counts[d] = (counts[d] ?? 0) + 1;
  const faces = Object.keys(counts).map(Number);
  if (dice.length === 6 && faces.length === 6) return 1500;
  if (dice.length === 6 && Object.values(counts).every((c) => c === 2))
    return 750;
  let score = 0;
  for (const face of faces) {
    const count = counts[face] ?? 0;
    if (count >= 3) {
      score += (face === 1 ? 1000 : face * 100) * Math.pow(2, count - 3);
    } else {
      if (face === 1) score += count * 100;
      if (face === 5) score += count * 50;
    }
  }
  return score;
}

function isValidFarkleKeep(dice: number[]): boolean {
  if (dice.length === 0) return false;
  const counts: Record<number, number> = {};
  for (const d of dice) counts[d] = (counts[d] ?? 0) + 1;
  if (dice.length === 6) {
    if (Object.keys(counts).length === 6) return true;
    if (Object.values(counts).every((c) => c === 2)) return true;
  }
  for (const [faceStr, count] of Object.entries(counts)) {
    const face = Number(faceStr);
    if (count < 3 && face !== 1 && face !== 5) return false;
  }
  return true;
}

export const SprintRiskGamePanel = ({
  gameSession,
  userName,
  onSubmitMove,
}: SprintRiskGamePanelProps) => {
  const [keptLocal, setKeptLocal] = useState<number[]>([]);
  const [rollAnimKey, setRollAnimKey] = useState(0);
  const prevDiceRef = useRef<string>("");

  const isActive = gameSession.status === "active";
  const turnOrder = gameSession.sprintRiskTurnOrder ?? [];
  const turnIndex = gameSession.sprintRiskTurnIndex ?? 0;
  const currentPlayer = turnOrder[turnIndex % (turnOrder.length || 1)] ?? null;
  const isMyTurn = isActive && currentPlayer === userName;
  const dice = gameSession.sprintRiskDice ?? [];
  const phase = gameSession.sprintRiskPhase;
  const turnScore = gameSession.sprintRiskTurnScore ?? 0;
  const turnCount = gameSession.sprintRiskTurnCount ?? {};

  const keptServer = useMemo(
    () => new Set(gameSession.sprintRiskKeptIndices ?? []),
    [gameSession.sprintRiskKeptIndices],
  );

  useEffect(() => {
    setKeptLocal([]);
  }, [gameSession.sprintRiskTurnIndex]);

  useEffect(() => {
    const diceKey = JSON.stringify(dice);
    if (phase === "rolled" && diceKey !== prevDiceRef.current) {
      setRollAnimKey((k) => k + 1);
    }
    prevDiceRef.current = diceKey;
  }, [dice, phase]);

  const selectedValues = keptLocal
    .map((i) => dice[i])
    .filter((v): v is number => v != null);
  const selectionScore = scoreDice(selectedValues);
  const selectionIsValid =
    keptLocal.length > 0 &&
    selectionScore > 0 &&
    isValidFarkleKeep(selectedValues);

  return (
    <div className="space-y-3 rounded-xl border border-brand-200/70 p-3 dark:border-brand-300/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
          Sprint Risk
        </p>
        {isActive ? (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {isMyTurn ? (
              <span className="font-semibold text-brand-600 dark:text-brand-300">
                Your turn
              </span>
            ) : (
              <span>{currentPlayer ?? "…"}&apos;s turn</span>
            )}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {dice.map((face, index) => {
          const isServerKept = keptServer.has(index);
          const isLocalKept = keptLocal.includes(index);
          const isKept = isServerKept || isLocalKept;
          const canClick =
            isMyTurn && phase === "rolled" && !isServerKept && face !== null;

          const animKey = isServerKept
            ? `die-${index}-kept`
            : `die-${index}-r-${rollAnimKey}`;

          const initial = isServerKept
            ? { scale: 1.25 }
            : rollAnimKey > 0 && face !== null
              ? { rotate: -18, scale: 0.8, opacity: 0.6 }
              : false;

          return (
            <motion.button
              key={animKey}
              type="button"
              onClick={() => {
                if (!canClick) return;
                setKeptLocal((prev) =>
                  prev.includes(index)
                    ? prev.filter((i) => i !== index)
                    : [...prev, index],
                );
              }}
              disabled={!canClick}
              initial={initial}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              whileHover={canClick ? { scale: 1.1 } : {}}
              whileTap={canClick ? { scale: 0.9 } : {}}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-bold transition-colors ${
                face === null
                  ? "border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600"
                  : isKept
                    ? "border-brand-500 bg-brand-100 text-brand-800 dark:border-brand-300 dark:bg-brand-900/30 dark:text-brand-100"
                    : canClick
                      ? "border-slate-300 bg-white text-slate-800 hover:border-brand-400 dark:border-white/20 dark:bg-slate-900 dark:text-white"
                      : "border-slate-300 bg-white text-slate-800 opacity-70 dark:border-white/20 dark:bg-slate-900 dark:text-white"
              }`}
            >
              {face ?? "·"}
            </motion.button>
          );
        })}
      </div>

      {turnScore > 0 ? (
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Turn score: <span className="font-semibold">{turnScore} pts</span>
        </p>
      ) : null}

      {isMyTurn ? (
        <div className="flex flex-wrap gap-2">
          {phase === "waiting" || phase === "kept" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onSubmitMove("roll")}
            >
              Roll
            </Button>
          ) : null}
          {phase === "rolled" && keptLocal.length > 0 ? (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!selectionIsValid}
                onClick={() => {
                  if (!selectionIsValid) return;
                  onSubmitMove(`keep:${keptLocal.join(",")}`);
                  setKeptLocal([]);
                }}
              >
                Keep selected
                {selectionIsValid ? ` (+${selectionScore} pts)` : ""}
              </Button>
              {!selectionIsValid ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Doesn&apos;t score — pick 1s, 5s, or three of a kind.
                </p>
              ) : null}
            </div>
          ) : null}
          {phase === "kept" && turnScore > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onSubmitMove("bank")}
            >
              Bank {turnScore} pts
            </Button>
          ) : null}
        </div>
      ) : isActive && phase === "waiting" ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Waiting for {currentPlayer ?? "the current player"} to roll…
        </p>
      ) : null}

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Turns
        </p>
        {turnOrder.map((player) => (
          <div
            key={player}
            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
          >
            <span
              className={
                isActive && player === currentPlayer
                  ? "font-semibold text-brand-600 dark:text-brand-300"
                  : ""
              }
            >
              {player}
            </span>
            <span>{turnCount[player] ?? 0}/3 turns</span>
          </div>
        ))}
      </div>
    </div>
  );
};
