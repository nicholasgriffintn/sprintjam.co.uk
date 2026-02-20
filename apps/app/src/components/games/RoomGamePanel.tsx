import { useMemo, useState } from 'react';
import { Minimize2, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROOM_GAMES } from '@/components/games/game-catalog';
import type { RoomData } from '@/types';

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
  const [moveValue, setMoveValue] = useState('');
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
  const latestMove = gameSession.moves[gameSession.moves.length - 1];
  const isWaitingForOtherPlayer =
    gameSession.status === 'active' &&
    isMultiplayerGame &&
    latestMove?.user === userName;

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

      {gameSession.status === 'active' ? (
        <div className="space-y-2">
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
                      : 'Drop 1-6 emojis'
              }
              maxLength={48}
            />
            <Button type="submit" disabled={isWaitingForOtherPlayer}>
              Play
            </Button>
          </form>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {gameMeta?.rules}
            {isWaitingForOtherPlayer
              ? ' Wait for another player to move before your next turn.'
              : isMultiplayerGame
              ? ' Multiplayer is turn-based: you cannot play twice in a row.'
              : ''}
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
          Game over
          {gameSession.winner ? ` · Winner: ${gameSession.winner}` : ''}. GG{' '}
          {userName}.
        </p>
      )}
    </SurfaceCard>
  );
};
