import type { ComponentType } from 'react';
import { Binary, Link2, Smile } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ROOM_GAMES } from '@/components/games/game-catalog';
import type { RoomData, RoomGameType } from '@/types';

interface RoomGamesModalProps {
  isOpen: boolean;
  roomData: RoomData;
  onClose: () => void;
  onStartGame: (gameType: RoomGameType) => void;
}

const GAME_ICONS: Record<
  RoomGameType,
  ComponentType<{ className?: string }>
> = {
  'guess-the-number': Binary,
  'word-chain': Link2,
  'emoji-story': Smile,
};

export const RoomGamesModal = ({
  isOpen,
  roomData,
  onClose,
  onStartGame,
}: RoomGamesModalProps) => {
  const activeGame = roomData.gameSession?.status === 'active';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Party games" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Launch a party game with the same room collaborators. Games are
          designed to last just a few minutes.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {ROOM_GAMES.map((game) => {
            const Icon = GAME_ICONS[game.type];

            return (
              <article
                key={game.type}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-400/20 dark:text-brand-200">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-200">
                  {game.title}
                </p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {game.description}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {game.objective}
                </p>
                <div className="mt-auto pt-4">
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
                    Start {game.title}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {activeGame ? (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-300">
            A game is already running. End it from the game panel to start
            another.
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
