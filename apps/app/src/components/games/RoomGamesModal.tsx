import { Sparkles } from 'lucide-react';

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
          Launch an easter-egg game with the same room collaborators. Everyone gets a live notification when you hit start.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {ROOM_GAMES.map((game) => (
            <article
              key={game.type}
              className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-200">
                {game.title}
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {game.description}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {game.objective}
              </p>
              <Button
                type="button"
                onClick={() => {
                  onStartGame(game.type);
                  onClose();
                }}
                disabled={activeGame}
                className="mt-4 w-full"
              >
                <Sparkles className="h-4 w-4" />
                Start {game.title}
              </Button>
            </article>
          ))}
        </div>

        {activeGame ? (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-300">
            A game is already running. End it from the game panel to start another.
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
