import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui";
import type { RoomGameSession } from "@/types";

interface OneWordPitchGamePanelProps {
  gameSession: RoomGameSession;
  userName: string;
  onSubmitMove: (value: string) => void;
}

export const OneWordPitchGamePanel = ({
  gameSession,
  userName,
  onSubmitMove,
}: OneWordPitchGamePanelProps) => {
  const [moveValue, setMoveValue] = useState("");

  const isActive = gameSession.status === "active";
  const isVotePhase = isActive && gameSession.oneWordPitchPhase === "vote";
  const submissions = gameSession.oneWordPitchRoundSubmissions ?? {};
  const votes = gameSession.oneWordPitchRoundVotes ?? {};
  const hasVoted = Boolean(votes[userName]);

  return (
    <>
      {isActive && gameSession.oneWordPitchPrompt ? (
        <div className="rounded-xl border border-brand-200/80 bg-brand-50/70 p-3 text-sm text-brand-900 dark:border-brand-300/30 dark:bg-brand-900/20 dark:text-brand-100">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Prompt
          </p>
          <p className="mt-1 font-medium">{gameSession.oneWordPitchPrompt}</p>
          {isVotePhase ? (
            <p className="mt-1 text-xs">
              Submission phase is closed. Vote for the best word to award bonus
              points.
            </p>
          ) : null}
        </div>
      ) : null}

      {isVotePhase ? (
        <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            One-Word Votes
          </p>
          <div className="space-y-2">
            {Object.entries(submissions).map(([player, word]) => {
              const voteCount = Object.values(votes).filter(
                (t) => t === player,
              ).length;
              const isOwnWord = player === userName;
              return (
                <div
                  key={player}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 px-3 py-2 text-sm dark:border-white/10"
                >
                  <span className="text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">{player}</span>:{" "}
                    {String(word)}
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      ({voteCount} votes)
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={hasVoted || isOwnWord}
                    onClick={() => onSubmitMove(`vote:${player}`)}
                  >
                    {isOwnWord ? "Own word" : "Vote"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isActive && !isVotePhase ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!moveValue.trim()) return;
            onSubmitMove(moveValue);
            setMoveValue("");
          }}
        >
          <input
            value={moveValue}
            onChange={(event) => setMoveValue(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
            placeholder="Submit one word"
            maxLength={48}
          />
          <Button type="submit">Play</Button>
        </form>
      ) : null}

      {!isActive && (gameSession.oneWordPitchRoundHistory?.length ?? 0) > 0 ? (
        <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Round Summary
          </p>
          <ScrollArea
            className="max-h-60 text-sm"
            contentClassName="space-y-2 pr-3"
            aria-label="One-word pitch round history"
          >
            {gameSession.oneWordPitchRoundHistory?.map((round) => (
              <div
                key={round.round}
                className="rounded-lg border border-slate-200/70 p-2 dark:border-white/10"
              >
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Round {round.round}: {round.prompt}
                </p>
                {Object.entries(round.submissions).map(([player, word]) => (
                  <p
                    key={player}
                    className="text-slate-700 dark:text-slate-200"
                  >
                    {player}: {String(word)}
                  </p>
                ))}
                {round.voteWinners?.length ? (
                  <p className="text-xs text-brand-700 dark:text-brand-200">
                    Vote bonus: {round.voteWinners.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </ScrollArea>
        </div>
      ) : null}
    </>
  );
};
