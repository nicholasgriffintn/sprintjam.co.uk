import { useEffect, useMemo, useState } from "react";
import { Minimize2, Trophy } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ROOM_GAMES } from "@/components/games/game-catalog";
import type { RoomData } from "@/types";

interface RoomGamePanelProps {
  roomData: RoomData;
  userName: string;
  onSubmitMove: (value: string) => void;
  onEndGame: () => void;
  onMinimise?: () => void;
}

export const RoomGamePanel = ({
  roomData,
  userName,
  onSubmitMove,
  onEndGame,
  onMinimise,
}: RoomGamePanelProps) => {
  const [moveValue, setMoveValue] = useState("");
  const [codenamesClue, setCodenamesClue] = useState("");
  const [codenamesTargetCount, setCodenamesTargetCount] = useState("2");
  const [codenamesSelectedTargets, setCodenamesSelectedTargets] = useState<
    number[]
  >([]);
  const gameSession = roomData.gameSession;

  const gameMeta = useMemo(
    () => ROOM_GAMES.find((game) => game.type === gameSession?.type),
    [gameSession?.type],
  );

  if (!gameSession) {
    return null;
  }

  const sortedScores = Object.entries(gameSession.leaderboard).sort(
    (a, b) => b[1] - a[1],
  );
  const isMultiplayerGame = gameSession.participants.length > 1;
  const isTurnBasedGame =
    gameSession.type === 'guess-the-number' ||
    gameSession.type === 'word-chain' ||
    gameSession.type === 'emoji-story';
  const latestMove = gameSession.moves[gameSession.moves.length - 1];
  const isWaitingForOtherPlayer =
    gameSession.status === "active" &&
    isTurnBasedGame &&
    isMultiplayerGame &&
    latestMove?.user === userName;
  const codenamesRevealedIndices = useMemo(
    () => new Set(gameSession.codenamesRevealedIndices ?? []),
    [gameSession.codenamesRevealedIndices],
  );
  const isCurrentCodenamesClueGiver =
    gameSession.type === "clueboard" &&
    gameSession.codenamesClueGiver === userName;
  const isCodenamesCluePhase = gameSession.codenamesRoundPhase === "clue";
  const canSubmitCodenamesClue =
    gameSession.status === "active" &&
    gameSession.type === "clueboard" &&
    isCodenamesCluePhase &&
    isCurrentCodenamesClueGiver;
  const canSubmitCodenamesGuess =
    gameSession.status === "active" &&
    gameSession.type === "clueboard" &&
    !isCodenamesCluePhase &&
    !isCurrentCodenamesClueGiver;
  const knownBlockerIndex =
    gameSession.type === "clueboard"
      ? gameSession.codenamesKnownBlockerIndex
      : undefined;
  const clueGiverKnowsBlocker =
    isCurrentCodenamesClueGiver && knownBlockerIndex !== undefined;
  const isOneWordVotePhase =
    gameSession.type === 'one-word-pitch' &&
    gameSession.oneWordPitchPhase === 'vote' &&
    gameSession.status === 'active';
  const oneWordCurrentSubmissions =
    gameSession.type === 'one-word-pitch'
      ? (gameSession.oneWordPitchRoundSubmissions ?? {})
      : {};
  const oneWordCurrentVotes =
    gameSession.type === 'one-word-pitch'
      ? (gameSession.oneWordPitchRoundVotes ?? {})
      : {};
  const oneWordUserHasVoted = Boolean(oneWordCurrentVotes[userName]);

  useEffect(() => {
    setCodenamesClue("");
    setCodenamesTargetCount("2");
    setCodenamesSelectedTargets([]);
  }, [gameSession.type, gameSession.round]);

  return (
    <SurfaceCard
      padding="md"
      className="space-y-4 border-brand-200/70 dark:border-brand-400/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-200">
            Party game live
          </p>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            {gameMeta?.title ?? 'Room game'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Started by {gameSession.startedBy} · Round {gameSession.round}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onMinimise ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Minimize2 className="h-4 w-4" />}
              onClick={onMinimise}
            >
              Minimise
            </Button>
          ) : null}

          {gameSession.status === 'active' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onEndGame}
            >
              End game
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Leaderboard
          </p>
          {sortedScores.length === 0 ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              No moves played yet.
            </p>
          ) : (
            <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
              {sortedScores.map(([name, score], index) => (
                <div
                  key={name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    {index === 0 ? (
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    ) : null}
                    {name}
                  </span>
                  <span className="font-semibold">{score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent activity
          </p>
          {gameSession.events.length === 0 ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              No recent activity.
            </p>
          ) : (
            <div className="max-h-36 space-y-2 overflow-y-auto pr-1 text-sm text-slate-700 dark:text-slate-200">
              {gameSession.events.slice(-5).map((event) => (
                <p key={event.id}>{event.message}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {gameSession.status === 'active' &&
      gameSession.type === 'one-word-pitch' &&
      gameSession.oneWordPitchPrompt ? (
        <div className="rounded-xl border border-brand-200/80 bg-brand-50/70 p-3 text-sm text-brand-900 dark:border-brand-300/30 dark:bg-brand-900/20 dark:text-brand-100">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Prompt
          </p>
          <p className="mt-1 font-medium">{gameSession.oneWordPitchPrompt}</p>
          {isOneWordVotePhase ? (
            <p className="mt-1 text-xs">
              Submission phase is closed. Vote for the best word to award bonus
              points.
            </p>
          ) : null}
        </div>
      ) : null}

      {isOneWordVotePhase ? (
        <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            One-Word Votes
          </p>
          <div className="space-y-2">
            {Object.entries(oneWordCurrentSubmissions).map(([player, word]) => {
              const votes = Object.values(oneWordCurrentVotes).filter(
                (target) => target === player,
              ).length;
              const cannotVoteForSelf = player === userName;
              const voteDisabled = oneWordUserHasVoted || cannotVoteForSelf;

              return (
                <div
                  key={player}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 px-3 py-2 text-sm dark:border-white/10"
                >
                  <span className="text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">{player}</span>: {word}
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      ({votes} votes)
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={voteDisabled}
                    onClick={() => onSubmitMove(`vote:${player}`)}
                  >
                    {cannotVoteForSelf ? 'Own word' : 'Vote'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {gameSession.status === 'active' &&
      gameSession.type === 'category-blitz' ? (
        <div className="rounded-xl border border-brand-200/80 bg-brand-50/70 p-3 text-sm text-brand-900 dark:border-brand-300/30 dark:bg-brand-900/20 dark:text-brand-100">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Category Blitz
          </p>
          <p className="mt-1 font-medium">
            {gameSession.categoryBlitzCategory ?? 'Category'} · Letter{' '}
            {(gameSession.categoryBlitzLetter ?? '?').toUpperCase()}
          </p>
        </div>
      ) : null}

      {gameSession.status === 'active' && gameSession.type === 'clueboard' ? (
        <div className="space-y-3 rounded-xl border border-brand-200/70 p-3 dark:border-brand-300/30">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
              Clueboard
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Clue giver: {gameSession.codenamesClueGiver ?? 'TBD'} · Phase:{' '}
              {isCodenamesCluePhase ? 'Clue' : 'Guess'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {isCodenamesCluePhase
                ? 'Clue giver picks target words on the board, then submits clue + number.'
                : 'Guessers pick words from the board that match the clue.'}
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

          {isCodenamesCluePhase && canSubmitCodenamesClue ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!codenamesClue.trim()) return;
                const safeTargetCount = Number(codenamesTargetCount);
                const clampedCount =
                  Number.isFinite(safeTargetCount) && safeTargetCount >= 1
                    ? Math.min(4, Math.max(1, Math.round(safeTargetCount)))
                    : 1;
                if (codenamesSelectedTargets.length !== clampedCount) return;
                onSubmitMove(
                  `clue:${codenamesClue.trim().toLowerCase()}|${clampedCount}|${codenamesSelectedTargets.join(',')}`,
                );
                setCodenamesClue('');
                setCodenamesSelectedTargets([]);
              }}
            >
              <input
                value={codenamesClue}
                onChange={(event) => setCodenamesClue(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                placeholder="Enter one-word clue"
                maxLength={24}
              />
              <select
                value={codenamesTargetCount}
                onChange={(event) =>
                  setCodenamesTargetCount(event.target.value)
                }
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
                disabled={
                  codenamesSelectedTargets.length !==
                  Number(codenamesTargetCount)
                }
              >
                Set clue
              </Button>
            </form>
          ) : null}

          <div className="space-y-2">
            {!isCodenamesCluePhase ? (
              canSubmitCodenamesGuess ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onSubmitMove('pass')}
                  >
                    Pass
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {isCurrentCodenamesClueGiver
                    ? 'Guessers are resolving your clue.'
                    : 'Waiting for another guesser to play.'}
                </p>
              )
            ) : canSubmitCodenamesClue ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Selected {codenamesSelectedTargets.length}/
                {Number(codenamesTargetCount)} target words.
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Waiting for {gameSession.codenamesClueGiver ?? 'the clue giver'}{' '}
                to submit a clue.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(gameSession.codenamesBoard ?? []).map((word, index) => {
                const isRevealed = codenamesRevealedIndices.has(index);
                const isSelectedTarget =
                  codenamesSelectedTargets.includes(index);
                const isKnownBlocker =
                  clueGiverKnowsBlocker && knownBlockerIndex === index;
                const canSelectAsTarget =
                  isCodenamesCluePhase && canSubmitCodenamesClue;
                const isDisabled =
                  isRevealed ||
                  (!canSelectAsTarget && !canSubmitCodenamesGuess) ||
                  (canSelectAsTarget && isKnownBlocker);

                return (
                  <button
                    key={`${word}-${index}`}
                    type="button"
                    onClick={() => {
                      if (canSelectAsTarget) {
                        if (isKnownBlocker) {
                          return;
                        }
                        const limit = Number(codenamesTargetCount);
                        setCodenamesSelectedTargets((previous) => {
                          if (previous.includes(index)) {
                            return previous.filter((value) => value !== index);
                          }
                          if (previous.length >= limit) {
                            return previous;
                          }
                          return [...previous, index];
                        });
                        return;
                      }
                      if (canSubmitCodenamesGuess) {
                        onSubmitMove(`guess:${index}`);
                      }
                    }}
                    disabled={isDisabled}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      isRevealed
                        ? 'border-slate-300 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400'
                        : isKnownBlocker
                          ? 'border-rose-500 bg-rose-100 text-rose-800 dark:border-rose-300 dark:bg-rose-900/30 dark:text-rose-100'
                          : isSelectedTarget
                            ? 'border-brand-500 bg-brand-100 text-brand-800 dark:border-brand-300 dark:bg-brand-900/30 dark:text-brand-100'
                            : 'border-slate-300 bg-white text-slate-800 hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-300 dark:hover:text-brand-200'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {gameSession.status === 'active' ? (
        <div className="space-y-2">
          {gameSession.type !== 'clueboard' && !isOneWordVotePhase ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (isWaitingForOtherPlayer) return;
                if (!moveValue.trim()) return;
                onSubmitMove(moveValue);
                setMoveValue('');
              }}
            >
              <input
                value={moveValue}
                onChange={(event) => setMoveValue(event.target.value)}
                disabled={isWaitingForOtherPlayer}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
                placeholder={
                  isWaitingForOtherPlayer
                    ? 'Waiting for another player...'
                    : gameSession.type === 'guess-the-number'
                      ? 'Enter a number from 1 to 20'
                      : gameSession.type === 'word-chain'
                        ? 'Type a word'
                        : gameSession.type === 'emoji-story'
                          ? 'Drop 1-6 emojis'
                          : gameSession.type === 'one-word-pitch'
                            ? 'Submit one word'
                            : 'Submit an answer that matches the category'
                }
                maxLength={48}
              />
              <Button type="submit" disabled={isWaitingForOtherPlayer}>
                Play
              </Button>
            </form>
          ) : null}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {gameMeta?.rules}
            {isWaitingForOtherPlayer
              ? ' Wait for another player to move before your next turn.'
              : isMultiplayerGame && isTurnBasedGame
                ? ' Multiplayer is turn-based: you cannot play twice in a row.'
                : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
            Game over
            {gameSession.winner ? ` · Winner: ${gameSession.winner}` : ''}. GG{' '}
            {userName}.
          </p>

          {gameSession.type === 'one-word-pitch' &&
          (gameSession.oneWordPitchRoundHistory?.length ?? 0) > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Round Summary
              </p>
              <div className="space-y-2 text-sm max-h-60 overflow-y-auto pr-1">
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
                        {player}: {word}
                      </p>
                    ))}
                    {round.voteWinners?.length ? (
                      <p className="text-xs text-brand-700 dark:text-brand-200">
                        Vote bonus: {round.voteWinners.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {gameSession.type === 'category-blitz' &&
          (gameSession.categoryBlitzRoundHistory?.length ?? 0) > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Round Summary
              </p>
              <div className="space-y-2 text-sm max-h-60 overflow-y-auto pr-1">
                {gameSession.categoryBlitzRoundHistory?.map((round) => (
                  <div
                    key={round.round}
                    className="rounded-lg border border-slate-200/70 p-2 dark:border-white/10"
                  >
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      Round {round.round}: {round.category} ({round.letter})
                    </p>
                    {Object.entries(round.submissions).map(
                      ([player, answer]) => (
                        <p
                          key={player}
                          className="text-slate-700 dark:text-slate-200"
                        >
                          {player}: {answer}
                        </p>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SurfaceCard>
  );
};
