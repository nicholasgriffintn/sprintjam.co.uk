import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ROOM_GAMES, GAME_ICONS } from "@/components/games/game-catalog";
import { cn } from "@/lib/cn";
import type { RoomData } from "@/types";
import type { RoomGameType } from "@sprintjam/types";

interface RoomGamesModalProps {
  isOpen: boolean;
  roomData: RoomData;
  onClose: () => void;
  onStartGame: (gameType: RoomGameType) => void;
}

export const RoomGamesModal = ({
  isOpen,
  roomData,
  onClose,
  onStartGame,
}: RoomGamesModalProps) => {
  const activeGame = roomData.gameSession?.status === "active";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Party games" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-cyan-200/80 bg-cyan-50 px-4 py-3 text-sm text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-950/35 dark:text-cyan-50">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm dark:bg-cyan-500">
            <Sparkles className="h-4 w-4" />
          </span>
          <p>
            Launch a room game with the same collaborators. Each one is built
            for a few minutes of playful reset between votes.
          </p>
        </div>

        {activeGame ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
            A game is already running. End it from the game panel to start
            another.
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          {ROOM_GAMES.map((game) => {
            const Icon = GAME_ICONS[game.type];

            return (
              <article
                key={game.type}
                className={cn(
                  "group relative flex h-full min-h-[18rem] flex-col overflow-hidden border rounded-2xl p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  "bg-white/85 dark:bg-slate-900/55 border-slate-200 dark:border-white/10",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl transition group-hover:scale-125 motion-reduce:transition-none",
                  )}
                />
                <div className="relative mb-4 flex items-start gap-3">
                  <div
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm",
                      game.accent.icon,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="relative text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
                  {game.title}
                </p>
                <p className="relative mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {game.description}
                </p>
                <p className="relative mt-3 border-l-2 border-slate-300 bg-white/45 px-3 py-2 text-xs text-slate-600 dark:border-white/20 dark:bg-slate-950/25 dark:text-slate-300">
                  {game.objective}
                </p>
                <div className="relative mt-auto pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      onStartGame(game.type);
                      onClose();
                    }}
                    disabled={activeGame}
                    size="sm"
                    className="w-full"
                  >
                    Start round
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
