import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Sparkles } from 'lucide-react';

import type { RoomSettings, VotingSequenceId } from '@/types';
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
  const [votingMode, setVotingMode] = useState<'standard' | 'structured'>(
    'standard'
  );
  const [selectedSequenceId, setSelectedSequenceId] =
    useState<VotingSequenceId>('fibonacci-short');

  useEffect(() => {
    if (defaults) {
      setAdvancedSettings(defaults);
      advancedSettingsRef.current = defaults;
      setSettingsResetKey((key) => key + 1);
      setVotingMode(
        defaults.enableStructuredVoting ? 'structured' : 'standard'
      );
      setSelectedSequenceId(defaults.votingSequenceId ?? 'fibonacci-short');
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

  const buildQuickSettings = (): Partial<RoomSettings> | null => {
    if (!defaults) return null;

    const preset = votingPresets?.find((p) => p.id === selectedSequenceId);
    const estimateOptions = preset?.options ?? defaults.estimateOptions;

    return {
      enableStructuredVoting: votingMode === 'structured',
      votingSequenceId: selectedSequenceId,
      estimateOptions,
    };
  };

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

            <div className="space-y-4 rounded-2xl border border-white/60 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-900/40">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="voting-mode"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Enable Structured Voting
                    </label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Multi-criteria voting with automatic story points
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={votingMode === 'structured'}
                    id="voting-mode"
                    onClick={() =>
                      setVotingMode(
                        votingMode === 'structured' ? 'standard' : 'structured'
                      )
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                      votingMode === 'structured'
                        ? 'bg-brand-600 dark:bg-brand-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                    data-testid="create-voting-mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        votingMode === 'structured'
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="estimate-sequence"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Estimate options
                </label>
                <select
                  id="estimate-sequence"
                  value={selectedSequenceId}
                  onChange={(e) =>
                    setSelectedSequenceId(e.target.value as VotingSequenceId)
                  }
                  disabled={votingMode === 'structured'}
                  className="mt-1.5 w-full rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-800 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                  data-testid="create-estimate-sequence"
                >
                  {votingPresets?.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {votingMode === 'structured'
                    ? 'Uses 1, 2, 3, 5, 8 for structured voting'
                    : (() => {
                        const preset = votingPresets?.find(
                          (p) => p.id === selectedSequenceId
                        );
                        return preset?.options
                          ? `Cards: ${preset.options.join(', ')}`
                          : 'Choose your estimation scale';
                      })()}
                </p>
              </div>
            </div>

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
                    onClick={() => handleStartFlow(buildQuickSettings())}
                    disabled={!canStart}
                    className="sm:flex-1"
                    icon={<Sparkles className="h-4 w-4" />}
                    data-testid="create-room-submit"
                    fullWidth
                  >
                    Create room
                  </Button>
                </div>
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
                    hideVotingModeAndEstimates={true}
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
