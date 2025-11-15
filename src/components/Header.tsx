import ConnectionStatus from './ConnectionStatus';
import DarkModeToggle from './DarkModeToggle';
import type { RoomData } from '../types';
import { Button } from './ui/Button';
import { Share2 } from 'lucide-react';

export interface HeaderProps {
  roomData: RoomData;
  isModeratorView: boolean;
  isConnected: boolean;
  onLeaveRoom: () => void;
  setIsShareModalOpen: (open: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
}

export default function Header({
  roomData,
  isModeratorView,
  isConnected,
  onLeaveRoom,
  setIsShareModalOpen,
  setIsSettingsModalOpen,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/50 bg-white/80 px-4 py-3 text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 dark:text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <a href="/" className="flex items-center gap-3 font-semibold">
            <img
              src="/logo-192.png"
              alt="SprintJam"
              className="h-9 w-9 rounded-2xl border border-white/60 bg-white/80 p-1 dark:border-white/10 dark:bg-white/5"
            />
            <span className="text-lg tracking-tight">SprintJam</span>
          </a>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-9 items-stretch overflow-hidden rounded-2xl border border-black/5 bg-black/5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
              <div className="flex items-center px-3 font-mono tracking-widest">
                {roomData.key}
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1 border-l border-black/5 px-3 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:border-white/10 dark:text-brand-200"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`flex items-center px-2 py-1 rounded-md ${
              isModeratorView
                ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                : 'bg-slate-200/70 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300'
            }`}
          >
            <span className="text-xs font-medium hidden sm:inline">
              {isModeratorView ? 'Moderator' : 'Team'}
            </span>
          </span>
          <ConnectionStatus isConnected={isConnected} />
          <DarkModeToggle />
          {isModeratorView && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsSettingsModalOpen(true)}
            >
              Settings
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onLeaveRoom}>
            Leave
          </Button>
        </div>
      </div>
    </header>
  );
}
