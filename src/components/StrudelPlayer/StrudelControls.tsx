import { type FC } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Loader2 } from 'lucide-react';

import { Button } from '../ui/Button';

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
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPlayPause}
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
          isLoading
            ? 'Loading music'
            : isPlaying
            ? 'Pause music'
            : 'Play music'
        }
      >
        {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
      </Button>

      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-600 border border-slate-200/60 hover:bg-white hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-300 dark:border-white/10 dark:hover:bg-slate-900 dark:hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {showGenerateButton && onGenerate && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onGenerate}
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
          {isLoading ? 'Generating...' : 'New Music'}
        </Button>
      )}
    </div>
  );
};
