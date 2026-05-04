import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { RoomGameSession } from "@/types";

interface TextInputGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
  rules?: string;
}

export const TextInputGamePanel = ({
  gameSession,
  userName,
  onSubmitMove,
  rules,
}: TextInputGamePanelProps) => {
  const [moveValue, setMoveValue] = useState("");

  const isActive = gameSession.status === "active";
  const isMultiplayer = gameSession.participants.length > 1;
  const isTurnBased =
    gameSession.type === "guess-the-number" ||
    gameSession.type === "word-chain" ||
    gameSession.type === "emoji-story";
  const latestMove = gameSession.moves[gameSession.moves.length - 1];
  const isWaiting =
    isActive && isTurnBased && isMultiplayer && latestMove?.user === userName;

  if (!isActive) return null;

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (isWaiting || !moveValue.trim()) return;
          onSubmitMove(moveValue);
          setMoveValue("");
        }}
      >
        <input
          value={moveValue}
          onChange={(event) => setMoveValue(event.target.value)}
          disabled={isWaiting}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
          placeholder={
            isWaiting
              ? "Waiting for another player..."
              : gameSession.type === "guess-the-number"
                ? "Enter a number from 1 to 20"
                : gameSession.type === "word-chain"
                  ? "Type a word"
                  : gameSession.type === "emoji-story"
                    ? "Drop 1-6 emojis"
                    : "Submit an answer"
          }
          maxLength={48}
        />
        <Button type="submit" disabled={isWaiting}>
          Play
        </Button>
      </form>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {rules}
        {isWaiting
          ? " Wait for another player to move before your next turn."
          : isMultiplayer && isTurnBased
            ? " Multiplayer is turn-based: you cannot play twice in a row."
            : ""}
      </p>
    </div>
  );
};
