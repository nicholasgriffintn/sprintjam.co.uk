import { Share2, Settings, LogOut } from 'lucide-react';

import ConnectionStatus from './ConnectionStatus';
import DarkModeToggle from './DarkModeToggle';
import type { RoomData } from '../types';
import { Badge } from './ui/Badge';
import { cn } from '../lib/cn';

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-6">
          <a
            href="/"
            className="flex items-center gap-3 font-semibold flex-shrink-0"
          >
            <img
              src="/logo-192.png"
              alt="SprintJam"
              className="h-9 w-9 rounded-2xl border border-white/60 bg-white/80 p-1 dark:border-white/10 dark:bg-white/5"
            />
            <span className="text-lg tracking-tight hidden sm:inline">
              SprintJam
            </span>
          </a>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-9 items-stretch overflow-hidden rounded-2xl border border-black/5 bg-black/5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
              <div className="flex items-center px-2 sm:px-3 font-mono tracking-widest text-xs sm:text-sm">
                {roomData.key}
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1 border-l border-black/5 px-2 sm:px-3 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:border-white/10 dark:text-brand-200 hover:dark:text-brand-100 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Badge
            variant={isModeratorView ? 'primary' : 'default'}
            className="hidden sm:inline-flex"
          >
            {isModeratorView ? 'Mod' : 'Team'}
          </Badge>
          <ConnectionStatus isConnected={isConnected} />
          <DarkModeToggle />
          {isModeratorView && (
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              aria-label="Room settings"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-brand-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60 dark:hover:text-brand-100 cursor-pointer',
                'md:w-auto md:min-w-[3rem] md:gap-2 md:px-4'
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden text-sm font-semibold md:inline">
                Settings
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onLeaveRoom}
            aria-label="Leave room"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/40 text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-rose-500/40 dark:bg-rose-500/5 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-100 cursor-pointer',
              'md:w-auto md:min-w-[3rem] md:gap-2 md:px-4'
            )}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-sm font-semibold md:inline">
              Leave room
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
