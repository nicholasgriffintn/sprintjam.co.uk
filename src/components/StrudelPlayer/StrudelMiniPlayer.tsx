import { type FC, useCallback, useEffect, useState } from 'react';
import { Music, X } from 'lucide-react';

import { SurfaceCard } from '../ui/SurfaceCard';
import { StrudelControls } from './StrudelControls';
import { useStrudelPlayer } from '../../hooks/useStrudelPlayer';
import {
  requestStrudelGeneration,
  toggleStrudelPlayback,
} from '../../lib/api-service';
import type { RoomData } from '../../types';

interface StrudelMiniPlayerProps {
  roomData: RoomData;
  isModeratorView: boolean;
}

export const StrudelMiniPlayer: FC<StrudelMiniPlayerProps> = ({
  roomData,
  isModeratorView,
}) => {
  const [isAwaitingGeneration, setIsAwaitingGeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const showTemporaryError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const { isMuted, isLoading, isInitialized, pause, toggleMute, playCode } =
    useStrudelPlayer({
      onError: (err) => {
        showTemporaryError(err.message);
      },
    });

  const isPlaying = roomData.strudelIsPlaying ?? false;

  useEffect(() => {
    if (!isInitialized || !roomData.currentStrudelCode) return;

    if (isPlaying && !isMuted) {
      playCode(roomData.currentStrudelCode);
    } else if (!isPlaying) {
      pause();
    }
  }, [isPlaying, roomData.currentStrudelCode, isInitialized, isMuted]);

  useEffect(() => {
    if (
      isAwaitingGeneration &&
      (roomData.currentStrudelCode || roomData.currentStrudelGenerationId)
    ) {
      setIsAwaitingGeneration(false);
    }
  }, [
    isAwaitingGeneration,
    roomData.currentStrudelCode,
    roomData.currentStrudelGenerationId,
  ]);

  const triggerGeneration = useCallback(() => {
    if (!isModeratorView) {
      showTemporaryError('Waiting for the moderator to generate music');
      return;
    }

    if (isAwaitingGeneration) {
      return;
    }

    setError(null);
    setIsAwaitingGeneration(true);

    try {
      requestStrudelGeneration();
    } catch (err) {
      setIsAwaitingGeneration(false);
      showTemporaryError(
        err instanceof Error ? err.message : 'Failed to generate music'
      );
    }
  }, [isModeratorView, isAwaitingGeneration, showTemporaryError]);

  const handlePlayPause = async () => {
    if (!isModeratorView) {
      showTemporaryError('Only the moderator can control playback');
      return;
    }

    if (!roomData.currentStrudelCode) {
      triggerGeneration();
      return;
    }

    try {
      toggleStrudelPlayback();
    } catch (err) {
      showTemporaryError(
        err instanceof Error ? err.message : 'Failed to toggle playback'
      );
    }
  };

  const handleGenerate = () => {
    triggerGeneration();
  };

  const hasCode = Boolean(roomData.currentStrudelCode);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <SurfaceCard
        variant="subtle"
        padding={isExpanded ? 'sm' : 'none'}
        className={`relative origin-bottom-right overflow-hidden transition-all duration-300 ${
          isExpanded
            ? 'w-[min(640px,calc(100vw-2rem))]'
            : 'flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-transparent bg-brand-500 text-white shadow-xl'
        }`}
        aria-expanded={isExpanded}
        role={!isExpanded ? 'button' : undefined}
        aria-label={!isExpanded ? 'Expand Strudel player' : undefined}
        tabIndex={!isExpanded ? 0 : undefined}
        onClick={
          !isExpanded
            ? () => {
                setIsExpanded(true);
              }
            : undefined
        }
        onKeyDown={
          !isExpanded
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsExpanded(true);
                }
              }
            : undefined
        }
      >
        {isExpanded ? (
          <>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
              aria-label="Collapse Strudel player"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <Music className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      AI Background Music
                    </span>
                    <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      Beta
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {hasCode
                      ? `${isPlaying ? 'Playing' : 'Paused'} • ${
                          roomData.strudelPhase || 'Unknown'
                        } phase`
                      : 'No music generated yet'}
                  </span>
                </div>
              </div>

              <StrudelControls
                isPlaying={isPlaying}
                isMuted={isMuted}
                isLoading={isLoading || isAwaitingGeneration}
                onPlayPause={handlePlayPause}
                onToggleMute={toggleMute}
                onGenerate={isModeratorView ? handleGenerate : undefined}
                showGenerateButton={isModeratorView}
                disabled={!hasCode && !isModeratorView}
              />
            </div>

            {error && (
              <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </>
        ) : (
          <Music className="h-5 w-5 text-brand-500" />
        )}
      </SurfaceCard>
    </div>
  );
};
