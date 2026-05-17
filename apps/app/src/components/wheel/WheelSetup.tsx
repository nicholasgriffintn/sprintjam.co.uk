import { useEffect, useState, useCallback, useRef } from "react";
import { secureRandomString } from "@sprintjam/utils";

import { WheelCanvas } from "@/components/wheel";
import { useWheelConfetti } from "@/hooks/useWheelConfetti";
import { WheelSidebar } from "@/components/wheel/WheelSidebar";
import { ShareWheelModal } from "@/components/wheel/ShareWheelModal";
import { WheelSettingsModal } from "@/components/wheel/WheelSettingsModal";
import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import {
  WheelProvider,
  useWheelState,
  useWheelStatus,
  useWheelActions,
} from "@/context/WheelContext";
import { useWheelHeader } from "@/context/WheelHeaderContext";
import { playWinnerSound, primeWheelAudio } from "@/lib/wheel-audio";
import {
  createWheel,
  getWheelAccessSettings,
  joinWheel,
  recoverWheelSession,
} from "@/lib/wheel-api-service";
import { HttpError } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { useWorkspaceWheelSession } from "@/components/wheel/useWorkspaceWheelSession";
import {
  USERNAME_STORAGE_KEY,
  getRecoveryPasskeyStorageKey,
} from "@/constants";
import { safeLocalStorage } from "@/utils/storage";

const getStoredUserName = () => {
  const stored = safeLocalStorage.get(USERNAME_STORAGE_KEY);
  if (stored) return stored;

  const generated = `User-${secureRandomString("abcdefghijklmnopqrstuvwxyz0123456789", 4)}`;
  safeLocalStorage.set(USERNAME_STORAGE_KEY, generated);
  return generated;
};

function storeRecoveryPasskey(
  wheelKey: string,
  userName: string,
  recoveryPasskey?: string,
) {
  if (!recoveryPasskey) {
    return;
  }

  safeLocalStorage.set(
    getRecoveryPasskeyStorageKey("wheel", wheelKey, userName),
    recoveryPasskey,
  );
}

function WheelRoomContent({
  wheelKey,
  userName,
}: {
  wheelKey: string;
  userName: string;
}) {
  const navigateTo = useAppNavigation();
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
    if (!wheelData?.results.length) {
      return;
    }

    const latestResult = wheelData.results[wheelData.results.length - 1];
    if (!latestResult || latestResult.id === lastResultId) {
      return;
    }

    setLastResultId(latestResult.id);

    if (wheelData.settings.showConfetti) {
      setShowConfetti(true);
    }
    if (wheelData.settings.playSounds) {
      playWinnerSound();
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
      wheelData?.entries.filter((entry) => entry.enabled).length ?? 0;
    if (enabledCount >= 2 && !wheelData?.spinState?.isSpinning) {
      if (wheelData?.settings.playSounds) {
        primeWheelAudio();
      }
      handleSpin();
    }
  }, [
    handleSpin,
    wheelData?.entries,
    wheelData?.settings.playSounds,
    wheelData?.spinState?.isSpinning,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEnter = event.key === "Enter" || event.code === "NumpadEnter";
      if ((event.ctrlKey || event.metaKey) && isEnter && isModeratorView) {
        event.preventDefault();
        handleSpinClick();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
      ? (wheelData.results[wheelData.results.length - 1]?.winner ?? null)
      : null;

  return (
    <div
      data-testid="wheel-room"
      className="flex min-h-[calc(100vh-4.5rem)] overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.26)_1px,transparent_0)] [background-size:28px_28px] px-4 py-5 sm:px-6 xl:h-[calc(100vh-4.5rem)] xl:min-h-0 xl:overflow-hidden xl:py-6"
    >
      <ShareWheelModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        wheelKey={wheelKey}
        userName={userName}
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

      <div className="mx-auto flex w-full max-w-[108rem] flex-1 flex-col gap-5 xl:min-h-0">
        <div className="flex flex-col gap-5 xl:min-h-0 xl:flex-1 xl:flex-row xl:items-stretch xl:gap-8">
          <div className="relative flex min-w-0 flex-col items-center justify-center py-2 sm:py-4 xl:flex-1 xl:py-10">
            {latestWinner && !wheelData.spinState?.isSpinning && (
              <div className="absolute top-8 left-1/2 z-10 -translate-x-1/2">
                <div className="relative rounded-3xl border-4 border-white/30 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 px-10 py-5 shadow-2xl animate-pulse">
                  <div className="absolute -top-3 -left-3 text-4xl">🎉</div>
                  <div className="absolute -top-3 -right-3 text-4xl">🎊</div>
                  <p className="mb-1 text-center text-base font-bold uppercase tracking-widest text-white drop-shadow-md">
                    Winner!
                  </p>
                  <p className="text-center text-5xl font-black text-white drop-shadow-2xl">
                    {latestWinner}
                  </p>
                </div>
              </div>
            )}
            <div className="aspect-square w-full max-w-[min(82vw,520px)] sm:max-w-[min(58vh,640px)] xl:max-w-[min(82vh,900px)]">
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
            settings={wheelData.settings}
            isModeratorView={isModeratorView}
            onBulkAddEntries={handleBulkAddEntries}
            onClearEntries={handleClearEntries}
            disabled={!!wheelData.spinState?.isSpinning || !isSocketConnected}
          />
        </div>

        <Footer layout="wide" fullWidth displayFidgetToyLink />
      </div>
    </div>
  );
}

interface WheelSetupProps {
  initialWheelKey?: string;
}

export function WheelSetup({ initialWheelKey = "" }: WheelSetupProps) {
  const pathKey = initialWheelKey.toUpperCase();
  const navigateTo = useAppNavigation();
  const { teams, selectedTeamId } = useWorkspaceData();
  const [wheelKey, setWheelKey] = useState("");
  const [userName] = useState(() => getStoredUserName());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPasscodeRequired, setIsPasscodeRequired] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isSubmittingPasscode, setIsSubmittingPasscode] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [conflictWheelKey, setConflictWheelKey] = useState("");
  const [recoveryPasskeyInput, setRecoveryPasskeyInput] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const joiningLock = useRef(false);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const teamForCreate = selectedTeam?.canAccess ? selectedTeam : undefined;
  const ensureWorkspaceWheelSession = useWorkspaceWheelSession(teamForCreate);

  useEffect(() => {
    if (!wheelKey) {
      return;
    }

    ensureWorkspaceWheelSession(wheelKey).catch(() => {
      toast.error(
        "The wheel is live, but it was not linked into workspace history.",
      );
    });
  }, [ensureWorkspaceWheelSession, wheelKey]);

  useEffect(() => {
    if (pathKey && !wheelKey) {
      if (joiningLock.current) return;
      joiningLock.current = true;

      setIsLoading(true);
      setError(null);

      const attemptJoin = async () => {
        try {
          const settings = await getWheelAccessSettings(pathKey, userName);
          if (settings.hasPasscode) {
            setIsPasscodeRequired(true);
            setPasscodeInput("");
            setPasscodeError(null);
            return;
          }
        } catch (settingsError) {
          if (
            settingsError instanceof HttpError &&
            settingsError.status === 404
          ) {
            setError("Wheel not found");
            return;
          }

          console.error("Failed to load wheel settings:", settingsError);
          setError(
            settingsError instanceof Error
              ? settingsError.message
              : "Failed to join wheel",
          );
          return;
        }

        try {
          const response = await joinWheel(userName, pathKey);
          storeRecoveryPasskey(pathKey, userName, response.recoveryPasskey);
          try {
            await ensureWorkspaceWheelSession(pathKey);
          } catch {
            toast.error(
              "The wheel is live, but it was not linked into workspace history.",
            );
          }
          setWheelKey(pathKey);
        } catch (err) {
          if (err instanceof Error && err.message === "PASSCODE_REQUIRED") {
            setIsPasscodeRequired(true);
            setPasscodeInput("");
            setPasscodeError(null);
            return;
          }
          if (err instanceof HttpError && err.status === 409) {
            setConflictWheelKey(pathKey);
            setIsConflict(true);
            return;
          }
          throw err;
        }
      };

      attemptJoin()
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : "Failed to join wheel";
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

      createWheel(userName, undefined, undefined, undefined)
        .then(async (response) => {
          const newKey = response.wheel.key;
          storeRecoveryPasskey(newKey, userName, response.recoveryPasskey);
          try {
            await ensureWorkspaceWheelSession(newKey);
          } catch {
            toast.error(
              "The wheel is live, but it was not linked into workspace history.",
            );
          }
          navigateTo("wheel", { wheelKey: newKey }, { replace: true });
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to create wheel",
          );
        })
        .finally(() => {
          setIsLoading(false);
          joiningLock.current = false;
        });
    }
  }, [
    ensureWorkspaceWheelSession,
    pathKey,
    retryNonce,
    wheelKey,
    userName,
    navigateTo,
  ]);

  const handleSubmitPasscode = async () => {
    const normalizedPasscode = passcodeInput.trim();
    if (!normalizedPasscode) {
      setPasscodeError("Enter the wheel passcode to continue.");
      return;
    }

    setIsSubmittingPasscode(true);
    setPasscodeError(null);
    setError(null);

    try {
      const response = await joinWheel(userName, pathKey, normalizedPasscode);
      storeRecoveryPasskey(pathKey, userName, response.recoveryPasskey);
      try {
        await ensureWorkspaceWheelSession(pathKey);
      } catch {
        toast.error(
          "The wheel is live, but it was not linked into workspace history.",
        );
      }
      setWheelKey(pathKey);
      setIsPasscodeRequired(false);
      setPasscodeInput("");
    } catch (err) {
      if (err instanceof Error && err.message === "PASSCODE_REQUIRED") {
        setPasscodeError("Incorrect passcode. Please try again.");
        return;
      }
      if (err instanceof HttpError && err.status === 409) {
        setConflictWheelKey(pathKey);
        setIsConflict(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to join wheel");
    } finally {
      setIsSubmittingPasscode(false);
    }
  };

  if (isPasscodeRequired) {
    return (
      <PageSection align="start" maxWidth="sm">
        <SurfaceCard className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Wheel requires a passcode
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This wheel is protected. Enter the passcode provided by the
              moderator to continue.
            </p>
          </div>
          <Input
            autoFocus
            id="wheel-passcode"
            label="Passcode"
            type="text"
            value={passcodeInput}
            onChange={(event) =>
              setPasscodeInput(event.target.value.toUpperCase())
            }
            placeholder="Enter wheel passcode"
            fullWidth
            error={passcodeError ?? undefined}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={handleSubmitPasscode}
              disabled={isSubmittingPasscode}
              isLoading={isSubmittingPasscode}
              fullWidth
            >
              Join wheel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsPasscodeRequired(false);
                setPasscodeInput("");
                setError(null);
                navigateTo("wheel", undefined, { replace: true });
              }}
              fullWidth
            >
              Back
            </Button>
          </div>
        </SurfaceCard>
      </PageSection>
    );
  }

  if (isConflict) {
    const handleRecover = async () => {
      if (!recoveryPasskeyInput.trim()) return;

      setIsRecovering(true);
      setRecoveryError(null);

      try {
        await recoverWheelSession(
          userName,
          conflictWheelKey,
          recoveryPasskeyInput.trim().toUpperCase(),
        );
        setIsConflict(false);

        const response = await joinWheel(userName, conflictWheelKey);
        storeRecoveryPasskey(
          conflictWheelKey,
          userName,
          response.recoveryPasskey,
        );
        setWheelKey(conflictWheelKey);
      } catch (err) {
        setRecoveryError(
          err instanceof HttpError && err.status === 401
            ? "Invalid recovery passkey. Check it and try again."
            : "Recovery failed. Please try again.",
        );
      } finally {
        setIsRecovering(false);
      }
    };

    return (
      <PageSection maxWidth="sm">
        <SurfaceCard className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Name already connected
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your name is already active in this wheel. Enter your recovery
            passkey to reclaim the session.
          </p>
          <Input
            id="wheel-recovery-passkey"
            label="Recovery passkey"
            type="text"
            value={recoveryPasskeyInput}
            onChange={(event) =>
              setRecoveryPasskeyInput(event.target.value.toUpperCase())
            }
            placeholder="XXXX-XXXX"
            fullWidth
            className="font-mono tracking-[0.25em]"
            error={recoveryError ?? undefined}
          />
          <Button
            onClick={handleRecover}
            disabled={!recoveryPasskeyInput.trim() || isRecovering}
            isLoading={isRecovering}
            fullWidth
          >
            Recover session
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setIsConflict(false);
              navigateTo("wheel");
            }}
            fullWidth
          >
            Go back
          </Button>
        </SurfaceCard>
      </PageSection>
    );
  }

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
                setWheelKey("");
                navigateTo("wheel", undefined, { replace: true });
              }}
            >
              Create new wheel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                setRetryNonce((current) => current + 1);
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
            {pathKey ? "Joining wheel..." : "Creating your wheel..."}
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
