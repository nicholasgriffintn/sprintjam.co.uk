import { useMemo, useState } from "react";
import {
  Activity,
  ChartNoAxesColumn,
  CircleDot,
  HelpCircle,
  Minimize2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { GAME_ICONS, ROOM_GAMES } from "@/components/games/game-catalog";
import { CategoryBlitzGamePanel } from "@/components/games/game-panels/CategoryBlitzGamePanel";
import { ClueboardGamePanel } from "@/components/games/game-panels/ClueboardGamePanel";
import { OneWordPitchGamePanel } from "@/components/games/game-panels/OneWordPitchGamePanel";
import { SprintRiskGamePanel } from "@/components/games/game-panels/SprintRiskGamePanel";
import { SprintWordGamePanel } from "@/components/games/game-panels/SprintWordGamePanel";
import { TeamThreadsGamePanel } from "@/components/games/game-panels/TeamThreadsGamePanel";
import { TextInputGamePanel } from "@/components/games/game-panels/TextInputGamePanel";
import { cn } from "@/lib/cn";
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
  const gameSession = roomData.gameSession;
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const gameMeta = useMemo(
    () => ROOM_GAMES.find((game) => game.type === gameSession?.type),
    [gameSession?.type],
  );

  if (!gameSession) return null;

  const GameIcon = gameMeta ? GAME_ICONS[gameMeta.type] : Sparkles;
  const sortedScores = Object.entries(gameSession.leaderboard).sort(
    (a, b) => b[1] - a[1],
  );
  const latestEvents = gameSession.events.slice(-5).reverse();

  return (
    <SurfaceCard
      padding="md"
      className="relative overflow-visible space-y-4 border-white/50 bg-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-900/45"
    >
      <div className="relative space-y-3">
        <div className="flex min-w-0 items-start gap-3 pr-36 sm:pr-40">
          <span
            className={cn(
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
              gameMeta?.accent.icon ??
                "bg-brand-500/10 text-brand-600 dark:bg-brand-400/20 dark:text-brand-200",
            )}
          >
            <GameIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-200">
              Party game live
            </p>
            <h3 className="truncate text-xl font-semibold text-slate-900 dark:text-white">
              {gameMeta?.title ?? "Room game"}
            </h3>
          </div>
        </div>

        <div className="absolute right-0 top-0 z-10 flex items-center gap-2">
          {gameMeta ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsHelpOpen((current) => !current)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="How to play"
                aria-expanded={isHelpOpen}
                aria-controls="room-game-help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              {isHelpOpen ? (
                <div
                  id="room-game-help"
                  className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-200"
                >
                  <p className="mb-2 font-semibold text-slate-900 dark:text-white">
                    How to play: {gameMeta.title}
                  </p>
                  <p className="mb-1 text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      Objective:{" "}
                    </span>
                    {gameMeta.objective}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      Rules:{" "}
                    </span>
                    {gameMeta.rules}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {onMinimise ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Minimize2 className="h-4 w-4" />}
              iconOnly
              onClick={onMinimise}
              aria-label="Minimise game panel"
            >
              Minimise game panel
            </Button>
          ) : null}
          {gameSession.status === "active" ? (
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
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/10">
            <CircleDot className="h-3.5 w-3.5" />
            Round {gameSession.round}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/10">
            <Users className="h-3.5 w-3.5" />
            {gameSession.participants.length || 1} playing
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/10">
            Started by {gameSession.startedBy}
          </span>
        </div>
      </div>

      <div className="relative grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ChartNoAxesColumn className="h-3.5 w-3.5 text-cyan-500" />
            Leaderboard
          </p>
          {sortedScores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/80 px-3 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Scores land here as soon as the first move hits.
            </div>
          ) : (
            <ScrollArea
              className="max-h-36"
              contentClassName="space-y-2 pr-3"
              aria-label="Game leaderboard"
            >
              {sortedScores.map(([name, score], index) => (
                <div
                  key={name}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                    index === 0
                      ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-300/20"
                      : "bg-slate-50/80 text-slate-700 dark:bg-white/5 dark:text-slate-200",
                  )}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {index === 0 ? (
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                        {index + 1}
                      </span>
                    )}
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="font-semibold">{score}</span>
                </div>
              ))}
            </ScrollArea>
          )}
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Activity className="h-3.5 w-3.5 text-cyan-500" />
            Recent activity
          </p>
          {gameSession.events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/80 px-3 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Moves and reveals will stack up here.
            </div>
          ) : (
            <ScrollArea
              className="max-h-36 text-sm text-slate-700 dark:text-slate-200"
              contentClassName="space-y-2 pr-3"
              aria-label="Recent game activity"
            >
              {latestEvents.map((event) => (
                <p key={event.id} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  <span>{event.message}</span>
                </p>
              ))}
            </ScrollArea>
          )}
        </div>
      </div>

      {gameSession.type === "one-word-pitch" ? (
        <OneWordPitchGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === "category-blitz" ? (
        <CategoryBlitzGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === "clueboard" ? (
        <ClueboardGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === "sprint-word" ? (
        <SprintWordGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === "team-threads" ? (
        <TeamThreadsGamePanel
          gameSession={gameSession}
          userName={userName}
          onSubmitMove={onSubmitMove}
        />
      ) : gameSession.type === "sprint-risk" ? (
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

      {gameSession.status === "completed" ? (
        <div className="w-full rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-300/30 dark:bg-amber-400/10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200/80 bg-white text-amber-700 shadow-sm dark:border-amber-300/30 dark:bg-amber-900/50 dark:text-amber-100">
              <Trophy className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700/80 dark:text-amber-200/80">
                Final score
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {gameSession.winner
                  ? `${gameSession.winner} wins this round.`
                  : "Game complete."}{" "}
                Thanks for playing {userName}!
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </SurfaceCard>
  );
};
