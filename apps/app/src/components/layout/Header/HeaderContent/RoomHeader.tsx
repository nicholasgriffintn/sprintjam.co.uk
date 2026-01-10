import type { FC } from 'react';
import { motion } from 'framer-motion';
import { Share2, Settings, LogOut, Building2 } from 'lucide-react';

import { useRoomState } from '@/context/RoomContext';
import { useRoomHeaderOptional } from '@/context/RoomHeaderContext';
import { isWorkspacesEnabled } from '@/utils/feature-flags';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { HeaderLogo } from '../HeaderLogo';
import DarkModeToggle from '../DarkModeToggle';
import { HEADER_TRANSITION } from '@/constants';
import { RoomHeaderProps } from '../types';

export const RoomHeader: FC<RoomHeaderProps> = ({ onNavigateHome }) => {
  const { roomData, isModeratorView } = useRoomState();
  const roomHeader = useRoomHeaderOptional();

  if (!roomData || !roomHeader) {
    return null;
  }

  const {
    setIsShareModalOpen,
    openSettings,
    setIsSaveToWorkspaceOpen,
    onLeaveRoom,
  } = roomHeader;

  const showSaveToWorkspace = isWorkspacesEnabled();

  return (
    <>
      <motion.div
        className="flex items-center gap-2 sm:gap-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={HEADER_TRANSITION}
      >
        <HeaderLogo
          size="sm"
          showText
          onClick={onNavigateHome}
          layoutId="header-logo"
          className="flex-shrink-0 [&_span]:hidden [&_span]:sm:inline"
        />
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-9 items-stretch overflow-hidden rounded-2xl border border-black/5 bg-black/5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
            <div
              className="flex items-center px-2 font-mono text-xs tracking-widest sm:px-3 sm:text-sm"
              data-testid="room-key-value"
            >
              {roomData.key}
            </div>
            <Button
              type="button"
              variant="unstyled"
              onClick={() => setIsShareModalOpen(true)}
              aria-label="Share room"
              className="border-l border-black/5 px-2 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:border-white/10 dark:text-brand-200 hover:dark:text-brand-100 sm:px-3"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={HEADER_TRANSITION}
      >
        <DarkModeToggle />
        {showSaveToWorkspace && (
          <Button
            type="button"
            variant="unstyled"
            onClick={() => setIsSaveToWorkspaceOpen(true)}
            aria-label="Save to workspace"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60 dark:hover:text-brand-100',
              'md:w-auto md:min-w-[3rem] md:gap-2 md:px-4'
            )}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden text-sm font-semibold md:inline">Save</span>
          </Button>
        )}
        {isModeratorView && (
          <Button
            type="button"
            variant="unstyled"
            onClick={() => openSettings()}
            aria-label="Room settings"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-brand-700 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:ring-brand-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60 dark:hover:text-brand-100',
              'md:w-auto md:min-w-[3rem] md:gap-2 md:px-4'
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden text-sm font-semibold md:inline">
              Settings
            </span>
          </Button>
        )}
        <Button
          type="button"
          variant="unstyled"
          onClick={onLeaveRoom ?? undefined}
          disabled={!onLeaveRoom}
          aria-label="Leave room"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/40 text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:ring-rose-200 dark:border-rose-500/40 dark:bg-rose-500/5 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-100',
            'md:w-auto md:min-w-[3rem] md:gap-2 md:px-4'
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden text-sm font-semibold md:inline">
            Leave room
          </span>
        </Button>
      </motion.div>
    </>
  );
};
