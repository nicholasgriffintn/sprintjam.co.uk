import { type FC, useCallback, useEffect, useState, useRef } from "react";
import { Music, X, Volume2 } from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { StrudelControls } from "./StrudelControls";
import { useStrudelPlayer } from "@/hooks/useStrudelPlayer";
import {
  requestStrudelGeneration,
  toggleStrudelPlayback,
} from "@/lib/api-service";
import type { RoomData } from "@/types";
import { BetaBadge } from "../BetaBadge";

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

  const {
    isMuted,
    isLoading,
    pause,
    play,
    toggleMute,
    playCode,
    setVolume,
    volume,
  } = useStrudelPlayer({
    onError: (err) => {
      showTemporaryError(err.message);
    },
  });

  const lastCodeRef = useRef<string | undefined>(undefined);
  const lastServerPlayingRef = useRef<boolean>(false);
  const lastMutedRef = useRef<boolean>(isMuted);
  const isServerPlaying = roomData.strudelIsPlaying ?? false;
  const currentCode = roomData.currentStrudelCode;

  useEffect(() => {
    const codeChanged = currentCode !== lastCodeRef.current;
    const playingChanged = isServerPlaying !== lastServerPlayingRef.current;
    const mutedChanged = isMuted !== lastMutedRef.current;

    lastCodeRef.current = currentCode;
    lastServerPlayingRef.current = isServerPlaying;
    lastMutedRef.current = isMuted;

    if (!currentCode) return;

    if (playingChanged && !isServerPlaying) {
      pause();
      return;
    }

    if (isServerPlaying && (playingChanged || codeChanged)) {
      playCode(currentCode);
      return;
    }

    if (mutedChanged && !isMuted && isServerPlaying) {
      play();
    }
  }, [isServerPlaying, currentCode, isMuted, playCode, pause, play]);

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
      showTemporaryError("Waiting for the moderator to generate music");
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
        err instanceof Error ? err.message : "Failed to generate music",
      );
    }
  }, [isModeratorView, isAwaitingGeneration, showTemporaryError]);

  const handlePlayPause = async () => {
    if (!isModeratorView) {
      showTemporaryError("Only the moderator can control playback");
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
        err instanceof Error ? err.message : "Failed to toggle playback",
      );
    }
  };

  const handleGenerate = () => {
    triggerGeneration();
  };

  const hasCode = Boolean(roomData.currentStrudelCode);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-end sm:left-auto sm:right-4 sm:w-auto">
      <SurfaceCard
        variant="subtle"
        padding={isExpanded ? "sm" : "none"}
        className={`relative origin-bottom-right overflow-hidden transition-all duration-300 ${
          isExpanded
            ? "w-full max-w-[640px] sm:w-[min(640px,calc(100vw-2rem))]"
            : "flex h-14 w-14  items-center justify-center rounded-full border-transparent bg-brand-500 text-white shadow-xl"
        }`}
        aria-expanded={isExpanded}
        role={!isExpanded ? "button" : undefined}
        aria-label={!isExpanded ? "Expand Strudel player" : undefined}
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
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsExpanded(true);
                }
              }
            : undefined
        }
      >
        {isExpanded ? (
          <>
            <Button
              type="button"
              variant="unstyled"
              onClick={() => setIsExpanded(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
              aria-label="Collapse Strudel player"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex flex-col gap-4 pr-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pr-6">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <Music className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      AI Background Music
                    </span>
                    <BetaBadge />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {hasCode
                      ? `${isServerPlaying ? "Playing" : "Paused"} • ${
                          roomData.strudelPhase || "Unknown"
                        } phase`
                      : "No music generated yet"}
                  </span>
                </div>
              </div>

              <StrudelControls
                isPlaying={isServerPlaying}
                isMuted={isMuted}
                isLoading={isLoading || isAwaitingGeneration}
                onPlayPause={handlePlayPause}
                onToggleMute={toggleMute}
                onGenerate={isModeratorView ? handleGenerate : undefined}
                showGenerateButton={isModeratorView}
                disabled={!hasCode && !isModeratorView}
              />
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-slate-200/50 pt-3 dark:border-slate-700/50">
              <Volume2 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="h-1.5 flex-1 accent-brand-500"
                aria-label="Strudel volume"
              />
              <span className="min-w-[2.5rem] shrink-0 text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
                {Math.round(volume * 100)}%
              </span>
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
