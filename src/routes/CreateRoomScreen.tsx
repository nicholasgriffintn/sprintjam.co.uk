import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Sparkles } from 'lucide-react';

import type { RoomSettings } from '@/types';
import { useSession } from '@/context/SessionContext';
import { useRoom } from '@/context/RoomContext';
import { PageBackground } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/Logo';
import { Footer } from '@/components/layout/Footer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';
import { RoomSettingsTabs } from '@/components/RoomSettingsTabs';

const CreateRoomScreen = () => {
  usePageMeta(META_CONFIGS.create);
  const {
    name,
    passcode,
    setName,
    setPasscode,
    setSelectedAvatar,
    setRoomKey,
    setScreen,
    setJoinFlowMode,
    goHome,
    clearError,
  } = useSession();
  const { serverDefaults, setPendingCreateSettings } = useRoom();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const defaults = serverDefaults?.roomSettings;
  const structuredOptions = serverDefaults?.structuredVotingOptions ?? [];
  const votingPresets = serverDefaults?.votingSequences;
  const extraVoteOptions = serverDefaults?.extraVoteOptions;
  const [advancedSettings, setAdvancedSettings] = useState<RoomSettings | null>(
    defaults ?? null
  );
  const advancedSettingsRef = useRef<RoomSettings | null>(defaults ?? null);
  const [settingsResetKey, setSettingsResetKey] = useState(0);

  useEffect(() => {
    if (defaults) {
      setAdvancedSettings(defaults);
      advancedSettingsRef.current = defaults;
      setSettingsResetKey((key) => key + 1);
    }
  }, [defaults]);

  const canStart = name.trim().length > 0;
  const advancedReady = Boolean(advancedSettings && defaults);

  const handleStartFlow = (settings?: Partial<RoomSettings> | null) => {
    if (!canStart) return;

    clearError();
    setPendingCreateSettings(settings ?? null);
    setJoinFlowMode('create');
    setSelectedAvatar(null);
    setRoomKey('');
    setScreen('join');
  };

  const instantDescription = useMemo(
    () =>
      serverDefaults?.roomSettings?.enableStructuredVoting
        ? 'Instant room uses server defaults with structured voting enabled.'
        : 'Instant room uses server defaults so you can start pointing fast.',
    [serverDefaults]
  );

  return (
    <PageBackground align="start" maxWidth="sm" variant="compact">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="flex justify-center">
          <Logo size="md" />
        </div>
        <div className="space-y-3 text-left">
          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">
              Step 1/2
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Create Room
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Use the instant defaults or tune settings before creating your
              room.
            </p>
          </div>
        </div>

        <SurfaceCard>
          <div className="space-y-6">
            <Input
              id="create-name"
              label="Your name"
              type="text"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="Moderator name"
              required
              fullWidth
              showValidation
              isValid={!!name.trim()}
            />

            <Input
              id="create-passcode"
              label={
                <span className="flex items-center gap-2">
                  Passcode
                  <span className="text-xs font-normal text-slate-400">
                    optional
                  </span>
                </span>
              }
              type="password"
              value={passcode}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPasscode(e.target.value)
              }
              placeholder="Add a passcode for extra security"
              fullWidth
            />

            {!showAdvanced ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAdvanced(true)}
                    className="sm:w-auto sm:flex-shrink-0"
                    icon={<Settings className="h-4 w-4" />}
                    data-testid="create-room-advanced"
                    fullWidth
                  >
                    Advanced setup
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStartFlow(null)}
                    disabled={!canStart}
                    className="sm:flex-1"
                    icon={<Sparkles className="h-4 w-4" />}
                    data-testid="create-room-submit"
                    fullWidth
                  >
                    Create instant room
                  </Button>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {instantDescription}
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Advanced room settings
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Configure cards, voting mode, integrations, and more.
                  </p>
                </div>

                {advancedReady ? (
                  <RoomSettingsTabs
                    initialSettings={advancedSettings as RoomSettings}
                    defaultSettings={defaults as RoomSettings}
                    structuredVotingOptions={structuredOptions}
                    votingPresets={votingPresets}
                    extraVoteOptions={extraVoteOptions}
                    defaultSequenceId={defaults?.votingSequenceId}
                    onSettingsChange={(updated) => {
                      advancedSettingsRef.current = updated;
                    }}
                    resetKey={settingsResetKey}
                  />
                ) : (
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
                    Loading default settings…
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAdvanced(false)}
                    className="sm:w-auto sm:flex-shrink-0"
                    data-testid="create-advanced-back"
                    fullWidth
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStartFlow(advancedSettingsRef.current)}
                    disabled={!canStart || !advancedReady}
                    className="sm:flex-1"
                    data-testid="create-advanced-continue"
                    fullWidth
                  >
                    Continue with settings
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          After creation you’ll step straight to choosing your avatar and join
          as moderator.
        </p>
      </motion.div>
      <Footer displayRepoLink={false} />
    </PageBackground>
  );
};

export default CreateRoomScreen;
