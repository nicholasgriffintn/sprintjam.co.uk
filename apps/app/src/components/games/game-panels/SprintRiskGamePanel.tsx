import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { RoomGameSession } from "@/types";

interface SprintRiskGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
}

export const SprintRiskGamePanel = ({
  gameSession,
  userName,
  onSubmitMove,
}: SprintRiskGamePanelProps) => {
  const [keptLocal, setKeptLocal] = useState<number[]>([]);

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

  // Reset local selection when turn changes
  useEffect(() => {
    setKeptLocal([]);
  }, [gameSession.sprintRiskTurnIndex]);

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
          return (
            <button
              key={index}
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
              className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-bold transition ${
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
            </button>
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                onSubmitMove(`keep:${keptLocal.join(",")}`);
                setKeptLocal([]);
              }}
            >
              Keep selected
            </Button>
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
