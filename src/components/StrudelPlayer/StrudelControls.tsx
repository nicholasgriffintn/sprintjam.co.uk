import { type FC } from "react";
import { Play, Pause, Volume2, VolumeX, Music, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

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
  const containerClasses =
    'inline-flex w-full flex-nowrap items-stretch sm:w-auto sm:items-center overflow-hidden rounded-full border border-slate-200/70 bg-white/80 text-slate-900 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-white/15 dark:bg-white/5 dark:text-white/90';
  const buttonHeightClasses = 'h-10 sm:h-10';
  const joinedButtonClasses =
    '!rounded-none border-0 bg-transparent text-inherit hover:bg-slate-50/70 dark:hover:bg-white/10 focus:z-10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0 first:rounded-l-full last:rounded-r-full px-4';
  const buttonTextClasses = 'text-sm font-semibold tracking-tight';

  if (isLoading) {
    return (
      <div className={containerClasses}>
        <Button
          variant="secondary"
          size="sm"
          className={`${buttonHeightClasses} flex-1 sm:flex-none ${joinedButtonClasses} ${buttonTextClasses} cursor-wait`}
          disabled
          icon={<Loader2 className="h-4 w-4 animate-spin" />}
          aria-label="Loading music"
        >
          Loading...
        </Button>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <Button
        variant="secondary"
        size="sm"
        onClick={onPlayPause}
        className={`${buttonHeightClasses} flex-1 sm:flex-none ${joinedButtonClasses} ${buttonTextClasses} border-r border-white/5 dark:border-white/5`}
        disabled={disabled}
        icon={
          isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )
        }
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={onToggleMute}
        className={`${buttonHeightClasses} flex-1 sm:w-12 sm:flex-none ${joinedButtonClasses} !rounded-none border-x border-white/5 dark:border-white/5 !px-3 !py-0`}
        disabled={disabled}
        icon={
          isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )
        }
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        iconOnly
      />

      {showGenerateButton && onGenerate && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onGenerate}
          className={`${buttonHeightClasses} flex-1 sm:flex-none ${joinedButtonClasses} ${buttonTextClasses} border-l border-white/5 dark:border-white/5`}
          disabled={disabled}
          icon={<Music className="h-4 w-4" />}
          aria-label="Generate new music"
        >
          New Music
        </Button>
      )}
    </div>
  );
};
