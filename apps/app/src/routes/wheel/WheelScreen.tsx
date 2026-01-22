import { useEffect, useState, useCallback, useRef } from "react";

import { WheelCanvas } from "@/components/wheel";
import { useWheelConfetti } from "@/hooks/useWheelConfetti";
import { WheelSidebar } from "@/components/wheel/WheelSidebar";
import { ShareWheelModal } from "@/components/wheel/ShareWheelModal";
import { WheelSettingsModal } from "@/components/wheel/WheelSettingsModal";
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { navigateTo } from "@/config/routes";
import {
  WheelProvider,
  useWheelState,
  useWheelStatus,
  useWheelActions,
} from "@/context/WheelContext";
import { useWheelHeader } from "@/context/WheelHeaderContext";
import { playWinnerSound, primeWheelAudio } from "@/lib/wheel-audio";
import { createWheel, joinWheel } from '@/lib/wheel-api-service';
import { USERNAME_STORAGE_KEY } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";

const getWheelKeyFromPath = () => {
  const match = window.location.pathname.match(/^\/wheel\/([A-Z0-9]+)$/i);
  return match?.[1]?.toUpperCase() ?? "";
};

const getStoredUserName = () => {
  const stored = safeLocalStorage.get(USERNAME_STORAGE_KEY);
  if (stored) return stored;
  const generated = `User-${Math.random().toString(36).slice(2, 6)}`;
  safeLocalStorage.set(USERNAME_STORAGE_KEY, generated);
  return generated;
};

function WheelRoomContent({
  wheelKey,
  userName,
}: {
  wheelKey: string;
  userName: string;
}) {
  const { wheelData, isModeratorView } = useWheelState();
  const { isSocketConnected, wheelError, isLoading } = useWheelStatus();
  const {
    connectWheel,
    disconnectWheel,
    handleBulkAddEntries,
    handleClearEntries,
    handleSpin,
    handleResetWheel,
    handleUpdateSettings,
  } = useWheelActions();

  const {
    setWheelKey,
    isShareModalOpen,
    setIsShareModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
  } = useWheelHeader();

  const [showConfetti, setShowConfetti] = useState(false);
  const [lastResultId, setLastResultId] = useState<string | null>(null);

  useEffect(() => {
    primeWheelAudio();
  }, []);

  useEffect(() => {
    setWheelKey(wheelKey);
    return () => setWheelKey(null);
  }, [wheelKey, setWheelKey]);

  useEffect(() => {
    if (wheelKey && userName) {
      connectWheel(wheelKey, userName);
    }

    return () => {
      disconnectWheel();
    };
  }, [wheelKey, userName, connectWheel, disconnectWheel]);

  useEffect(() => {
    if (wheelData?.results && wheelData.results.length > 0) {
      const latestResult = wheelData.results[wheelData.results.length - 1];
      if (latestResult.id !== lastResultId) {
        setLastResultId(latestResult.id);

        if (wheelData.settings.showConfetti) {
          setShowConfetti(true);
        }
        if (wheelData.settings.playSounds) {
          playWinnerSound();
        }
      }
    }
  }, [wheelData?.results, wheelData?.settings, lastResultId]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  useWheelConfetti({
    trigger: showConfetti,
    onComplete: handleConfettiComplete,
  });

  const handleSpinClick = useCallback(() => {
    const enabledCount =
      wheelData?.entries.filter((e) => e.enabled).length ?? 0;
    if (enabledCount >= 2 && !wheelData?.spinState?.isSpinning) {
      handleSpin();
    }
  }, [handleSpin, wheelData?.entries, wheelData?.spinState?.isSpinning]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEnter = e.key === "Enter" || e.code === "NumpadEnter";
      if ((e.ctrlKey || e.metaKey) && isEnter && isModeratorView) {
        e.preventDefault();
        handleSpinClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModeratorView, handleSpinClick]);

  if (wheelError && !wheelData) {
    return (
      <PageSection maxWidth="md">
        <SurfaceCard className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Connection issue
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {wheelError}
          </p>
          <Button onClick={() => navigateTo("wheel")}>Go back</Button>
        </SurfaceCard>
      </PageSection>
    );
  }

  if (isLoading || !wheelData) {
    return (
      <PageSection maxWidth="md">
        <SurfaceCard className="flex flex-col items-center gap-4 py-12 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {wheelError || "Connecting to wheel..."}
          </p>
        </SurfaceCard>
      </PageSection>
    );
  }

  const latestWinner =
    wheelData.results.length > 0
      ? wheelData.results[wheelData.results.length - 1].winner
      : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <ShareWheelModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        wheelKey={wheelKey}
        isModeratorView={isModeratorView}
      />

      <WheelSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={wheelData.settings}
        onSave={handleUpdateSettings}
        onReset={handleResetWheel}
        disabled={!isSocketConnected || !!wheelData.spinState?.isSpinning}
      />

      <div className="flex flex-1 min-h-0 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 relative py-4 sm:py-6 lg:py-10">
          {latestWinner && !wheelData.spinState?.isSpinning && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
              <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-3xl px-10 py-5 shadow-2xl border-4 border-white/30 animate-pulse">
                <div className="absolute -top-3 -left-3 text-4xl">🎉</div>
                <div className="absolute -top-3 -right-3 text-4xl">🎊</div>
                <p className="text-white text-base font-bold mb-1 uppercase tracking-widest text-center drop-shadow-md">Winner!</p>
                <p className="text-5xl font-black text-white drop-shadow-2xl text-center">{latestWinner}</p>
              </div>
            </div>
          )}
          <div className="w-full max-w-[min(82vw,520px)] sm:max-w-[min(80vh,760px)] lg:max-w-[min(82vh,900px)] aspect-square">
            <WheelCanvas
              entries={wheelData.entries}
              spinState={wheelData.spinState}
              onSpin={isModeratorView ? handleSpinClick : undefined}
              disabled={!isModeratorView || !isSocketConnected}
              playSounds={wheelData.settings.playSounds}
            />
          </div>
        </div>

        <WheelSidebar
          entries={wheelData.entries}
          results={wheelData.results}
          isModeratorView={isModeratorView}
          onBulkAddEntries={handleBulkAddEntries}
          onClearEntries={handleClearEntries}
          disabled={!!wheelData.spinState?.isSpinning || !isSocketConnected}
        />
      </div>
    </div>
  );
}

export default function WheelScreen() {
  const [wheelKey, setWheelKey] = useState("");
  const [userName] = useState(() => getStoredUserName());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joiningLock = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      setWheelKey(getWheelKeyFromPath());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const pathKey = getWheelKeyFromPath();

    if (pathKey && !wheelKey) {
      if (joiningLock.current) return;
      joiningLock.current = true;

      setIsLoading(true);
      setError(null);

      const attemptJoin = async () => {
        try {
          await joinWheel(userName, pathKey);
          setWheelKey(pathKey);
        } catch (err) {
          if (err instanceof Error && err.message === 'PASSCODE_REQUIRED') {
            const passcode = window.prompt(
              'Enter the passcode to join this wheel',
            );
            if (!passcode) {
              throw new Error('Passcode is required to join this wheel.');
            }
            try {
              await joinWheel(userName, pathKey, passcode.trim());
              setWheelKey(pathKey);
              return;
            } catch (retryErr) {
              if (
                retryErr instanceof Error &&
                retryErr.message === 'PASSCODE_REQUIRED'
              ) {
                throw new Error('Invalid passcode. Please try again.');
              }
              throw retryErr;
            }
          }
          throw err;
        }
      };

      attemptJoin()
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to join wheel';
          setError(message);
        })
        .finally(() => {
          setIsLoading(false);
          joiningLock.current = false;
        });
      return;
    }

    if (!pathKey && !wheelKey) {
      if (joiningLock.current) return;
      joiningLock.current = true;

      setIsLoading(true);
      setError(null);

      createWheel(userName, undefined, undefined, undefined) // Passcode must be set during creation
        .then((response) => {
          const newKey = response.wheel.key;
          window.history.replaceState(null, '', `/wheel/${newKey}`);
          setWheelKey(newKey);
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : 'Failed to create wheel',
          );
        })
        .finally(() => {
          setIsLoading(false);
          joiningLock.current = false;
        });
    }
  }, [wheelKey, userName]);

  if (error) {
    return (
      <PageSection maxWidth="md">
        <SurfaceCard className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Connection issue
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => {
                setError(null);
                setWheelKey('');
                window.history.replaceState(null, '', '/wheel');
              }}
            >
              Create new wheel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                window.location.reload();
              }}
            >
              Try again
            </Button>
          </div>
        </SurfaceCard>
      </PageSection>
    );
  }

  if (!wheelKey || isLoading) {
    return (
      <PageSection maxWidth="md">
        <SurfaceCard className="flex flex-col items-center gap-4 py-12 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {getWheelKeyFromPath()
              ? 'Joining wheel...'
              : 'Creating your wheel...'}
          </p>
        </SurfaceCard>
      </PageSection>
    );
  }

  return (
    <WheelProvider userName={userName}>
      <WheelRoomContent wheelKey={wheelKey} userName={userName} />
    </WheelProvider>
  );
}
