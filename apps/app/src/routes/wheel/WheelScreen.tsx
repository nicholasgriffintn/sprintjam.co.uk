import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Key, Plus, Sparkles, Users, Zap } from 'lucide-react';

import {
  WheelCanvas,
  WheelEntryList,
  WheelResultsPanel,
  WheelConfetti,
} from '@/components/wheel';
import { Footer } from '@/components/layout/Footer';
import { PageSection } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { useSessionActions } from '@/context/SessionContext';
import { navigateTo } from '@/config/routes';
import {
  WheelProvider,
  useWheelState,
  useWheelStatus,
  useWheelActions,
} from '@/context/WheelContext';
import { playWinnerSound, primeWheelAudio } from '@/lib/wheel-audio';
import { Spinner } from '@/components/ui/Spinner';
import { USERNAME_STORAGE_KEY } from '@/constants';
import { safeLocalStorage } from '@/utils/storage';

const features = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Live spins',
    description: 'Everyone sees results instantly and stays in sync',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Team-friendly',
    description: 'Add names together, or let a moderator manage the list',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Ready fast',
    description: 'No sign-up needed, just create and share the link',
  },
  {
    icon: <Key className="w-5 h-5" />,
    title: 'Private rooms',
    description: 'Configure who can join your wheel session',
  },
];

const getWheelKeyFromPath = () => {
  const match = window.location.pathname.match(/^\/wheel\/([A-Z0-9]+)$/i);
  return match?.[1]?.toUpperCase() ?? '';
};

const getStoredUserName = () =>
  safeLocalStorage.get(USERNAME_STORAGE_KEY) ?? '';

const WheelScreenContent = ({
  wheelKey,
  userName,
  onLeave,
}: {
  wheelKey: string;
  userName: string;
  onLeave: () => void;
}) => {
  const { wheelData, isModeratorView } = useWheelState();
  const { isSocketConnected, wheelError, isLoading } = useWheelStatus();
  const {
    connectWheel,
    disconnectWheel,
    handleAddEntry,
    handleRemoveEntry,
    handleToggleEntry,
    handleBulkAddEntries,
    handleClearEntries,
    handleSpin,
    handleResetWheel,
    handleUpdateSettings,
  } = useWheelActions();

  const [showConfetti, setShowConfetti] = useState(false);
  const [lastResultId, setLastResultId] = useState<string | null>(null);

  useEffect(() => {
    primeWheelAudio();
  }, []);

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

  const handleSpinClick = useCallback(() => {
    handleSpin();
  }, [handleSpin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && isModeratorView) {
        e.preventDefault();
        handleSpinClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
          <Button onClick={onLeave}>Go back</Button>
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
            {wheelError || 'Connecting to wheel...'}
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
    <PageSection align="start" maxWidth="xl">
      <WheelConfetti
        trigger={showConfetti}
        onComplete={handleConfettiComplete}
      />

      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">
              Wheel room
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
              Wheel Spinner
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Room: {wheelKey}
              {!isSocketConnected && (
                <span className="ml-2 text-amber-500">Reconnecting...</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {wheelData.users.length} participant
              {wheelData.users.length !== 1 ? 's' : ''}
            </span>
            <Button variant="secondary" onClick={onLeave}>
              Leave room
            </Button>
          </div>
        </div>

        {latestWinner && !wheelData.spinState?.isSpinning && (
          <SurfaceCard className="bg-gradient-to-r from-brand-600 to-indigo-500 border-none">
            <div className="text-center py-4">
              <p className="text-white/80 text-sm mb-1">Winner</p>
              <p className="text-3xl font-bold text-white">{latestWinner}</p>
            </div>
          </SurfaceCard>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <SurfaceCard className="flex flex-col items-center gap-6">
              <WheelCanvas
                entries={wheelData.entries}
                spinState={wheelData.spinState}
                onSpin={isModeratorView ? handleSpinClick : undefined}
                disabled={!isModeratorView || !isSocketConnected}
                playSounds={wheelData.settings.playSounds}
              />

              {isModeratorView && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSpinClick}
                    disabled={
                      wheelData.spinState?.isSpinning ||
                      wheelData.entries.filter((e) => e.enabled).length < 2 ||
                      !isSocketConnected
                    }
                  >
                    {wheelData.spinState?.isSpinning ? 'Spinning...' : 'Spin'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleResetWheel}
                    disabled={
                      wheelData.spinState?.isSpinning || !isSocketConnected
                    }
                  >
                    Reset
                  </Button>
                </div>
              )}
            </SurfaceCard>

            <WheelResultsPanel results={wheelData.results} />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <WheelEntryList
              entries={wheelData.entries}
              isModeratorView={isModeratorView}
              onAddEntry={handleAddEntry}
              onRemoveEntry={handleRemoveEntry}
              onToggleEntry={handleToggleEntry}
              onBulkAddEntries={handleBulkAddEntries}
              onClearEntries={handleClearEntries}
              disabled={wheelData.spinState?.isSpinning || !isSocketConnected}
            />

            {isModeratorView && (
              <SurfaceCard>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Settings
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={wheelData.settings.removeWinnerAfterSpin}
                      onChange={(e) =>
                        handleUpdateSettings({
                          removeWinnerAfterSpin: e.target.checked,
                        })
                      }
                      disabled={!isSocketConnected}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Remove winner after spin
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={wheelData.settings.showConfetti}
                      onChange={(e) =>
                        handleUpdateSettings({ showConfetti: e.target.checked })
                      }
                      disabled={!isSocketConnected}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Show confetti
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={wheelData.settings.playSounds}
                      onChange={(e) =>
                        handleUpdateSettings({ playSounds: e.target.checked })
                      }
                      disabled={!isSocketConnected}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Play sounds
                    </span>
                  </label>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
                      Spin duration: {wheelData.settings.spinDurationMs / 1000}s
                    </label>
                    <input
                      type="range"
                      min={2000}
                      max={10000}
                      step={500}
                      value={wheelData.settings.spinDurationMs}
                      onChange={(e) =>
                        handleUpdateSettings({
                          spinDurationMs: parseInt(e.target.value, 10),
                        })
                      }
                      disabled={!isSocketConnected}
                      className="w-full"
                    />
                  </div>
                </div>
              </SurfaceCard>
            )}
          </div>
        </div>
      </div>
    </PageSection>
  );
};

export default function WheelScreen() {
  const { setScreen } = useSessionActions();
  const [wheelKey, setWheelKey] = useState(() => getWheelKeyFromPath());
  const [userName] = useState(() => getStoredUserName());

  const handleCreate = useCallback(() => {
    setScreen('createWheel');
    navigateTo('createWheel');
  }, [setScreen, setWheelKey]);

  const handleOverview = useCallback(() => {
    setWheelKey('');
    setScreen('wheel');
    navigateTo('wheel');
  }, [setScreen]);

  const handleJoin = useCallback(() => {
    setScreen('joinWheel');
    navigateTo('joinWheel');
  }, [setScreen]);

  useEffect(() => {
    const handlePopState = () => {
      setWheelKey(getWheelKeyFromPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (wheelKey && !userName) {
      handleJoin();
    }
  }, [wheelKey, userName, handleJoin]);

  if (!wheelKey) {
    return (
      <PageSection maxWidth="xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-10 sm:space-y-14"
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Spin that wheel!
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 sm:text-lg">
                Randomise speakers, demo order, or raffle winners. Create a
                wheel in seconds and invite your team with one code.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Button
              data-testid="create-room-button"
              onClick={handleCreate}
              icon={<Plus className="h-4 w-4" />}
              size="lg"
              className="w-full sm:w-auto"
            >
              Create a room
            </Button>
            <Button
              variant="secondary"
              data-testid="join-room-button"
              onClick={handleJoin}
              icon={<Users className="h-4 w-4" />}
              size="lg"
              className="w-full sm:w-auto"
            >
              Join a session
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              >
                <SurfaceCard className="h-full text-left">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-indigo-500/20 text-brand-600">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </SurfaceCard>
              </motion.div>
            ))}
          </div>

          <Footer priorityLinksOnly={false} />
        </motion.div>
      </PageSection>
    );
  }

  return (
    <WheelProvider userName={userName}>
      <WheelScreenContent
        wheelKey={wheelKey}
        userName={userName}
        onLeave={handleOverview}
      />
    </WheelProvider>
  );
}
