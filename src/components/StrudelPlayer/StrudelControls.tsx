import { type FC } from "react";
import { Play, Pause, Volume2, VolumeX, Music, Loader2 } from "lucide-react";

import { Button } from "../ui/Button";

interface StrudelControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onToggleMute: () => void;
  onGenerate?: () => void;
  showGenerateButton?: boolean;
  disabled?: boolean;
}

export const StrudelControls: FC<StrudelControlsProps> = ({
  isPlaying,
  isMuted,
  isLoading,
  onPlayPause,
  onToggleMute,
  onGenerate,
  showGenerateButton = false,
  disabled = false,
}) => {
  return (
    <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:flex-nowrap sm:items-center">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPlayPause}
        className="flex-1 sm:flex-none"
        disabled={disabled || isLoading}
        icon={
          isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )
        }
        aria-label={
          isLoading ? "Loading music" : isPlaying ? "Pause music" : "Play music"
        }
      >
        {isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
      </Button>

      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200/60 bg-white/90 text-slate-600 transition-all duration-200 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9 sm:flex-none"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {showGenerateButton && onGenerate && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onGenerate}
          className="flex-1 sm:flex-none"
          disabled={disabled || isLoading}
          icon={
            isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Music className="h-4 w-4" />
            )
          }
          aria-label="Generate new music"
        >
          {isLoading ? "Generating..." : "New Music"}
        </Button>
      )}
    </div>
  );
};
