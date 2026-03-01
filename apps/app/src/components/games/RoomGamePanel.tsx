import { useMemo } from 'react';
import { Minimize2, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ROOM_GAMES } from '@/components/games/game-catalog';
import { CategoryBlitzGamePanel } from '@/components/games/game-panels/CategoryBlitzGamePanel';
import { ClueboardGamePanel } from '@/components/games/game-panels/ClueboardGamePanel';
import { OneWordPitchGamePanel } from '@/components/games/game-panels/OneWordPitchGamePanel';
import { SprintRiskGamePanel } from '@/components/games/game-panels/SprintRiskGamePanel';
import { SprintWordGamePanel } from '@/components/games/game-panels/SprintWordGamePanel';
import { TeamThreadsGamePanel } from '@/components/games/game-panels/TeamThreadsGamePanel';
import { TextInputGamePanel } from '@/components/games/game-panels/TextInputGamePanel';
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
  const gameSession = roomData.gameSession;

  const gameMeta = useMemo(
    () => ROOM_GAMES.find((game) => game.type === gameSession?.type),
    [gameSession?.type],
  );

  if (!gameSession) return null;

  const sortedScores = Object.entries(gameSession.leaderboard).sort(
    (a, b) => b[1] - a[1],
  );

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
            <ScrollArea
              className="max-h-36"
              contentClassName="space-y-2 pr-3"
              aria-label="Game leaderboard"
            >
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
            </ScrollArea>
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
            <ScrollArea
              className="max-h-36 text-sm text-slate-700 dark:text-slate-200"
              contentClassName="space-y-2 pr-3"
              aria-label="Recent game activity"
            >
              {gameSession.events.slice(-5).map((event) => (
                <p key={event.id}>{event.message}</p>
              ))}
            </ScrollArea>
          )}
        </div>
      </div>

      {gameSession.type === 'one-word-pitch' ? (
        <OneWordPitchGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === 'category-blitz' ? (
        <CategoryBlitzGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === 'clueboard' ? (
        <ClueboardGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === 'sprint-word' ? (
        <SprintWordGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === 'team-threads' ? (
        <TeamThreadsGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === 'sprint-risk' ? (
        <SprintRiskGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : (
        <TextInputGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
          rules={gameMeta?.rules}
        />
      )}

      {gameSession.status === 'completed' ? (
        <div className="relative overflow-hidden rounded-2xl border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-black-50/60 px-4 py-3 shadow-sm dark:border-brand-300/30 dark:from-brand-900/30 dark:via-slate-900/70 dark:to-black-900/20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-300/30 blur-2xl dark:bg-brand-300/20" />
            <div className="absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-black-300/40 blur-xl dark:bg-black-300/20" />
          </div>
          <div className="relative flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-200/80 bg-white/85 text-brand-700 shadow-sm dark:border-brand-300/30 dark:bg-brand-900/50 dark:text-brand-100">
              <Trophy className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700/80 dark:text-brand-200/80">
                Final score
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {gameSession.winner
                  ? `${gameSession.winner} wins this round.`
                  : 'Game complete.'}{' '}
                Thanks for playing {userName}!
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </SurfaceCard>
  );
};
