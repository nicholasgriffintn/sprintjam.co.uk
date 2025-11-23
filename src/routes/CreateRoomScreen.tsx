import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Lock,
  User,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react';

import type { RoomSettings } from '@/types';
import { useSession } from '@/context/SessionContext';
import { useRoom } from '@/context/RoomContext';
import AvatarSelector from '@/components/AvatarSelector';
import { PageBackground } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Logo } from '@/components/Logo';
import { Footer } from '@/components/layout/Footer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';
import { BetaBadge } from '@/components/BetaBadge';

const CreateRoomScreen = () => {
  usePageMeta(META_CONFIGS.create);
  const {
    name,
    passcode,
    selectedAvatar,
    setName,
    setPasscode,
    setSelectedAvatar,
    goHome,
    error,
    clearError,
  } = useSession();
  const { handleCreateRoom, serverDefaults } = useRoom();
  const buildSettingsFromDefaults = (
    roomDefaults?: RoomSettings | null
  ): Partial<RoomSettings> => ({
    enableStructuredVoting: roomDefaults?.enableStructuredVoting ?? false,
    enableJudge: roomDefaults?.enableJudge ?? true,
    externalService: roomDefaults?.externalService ?? 'none',
    showTimer: roomDefaults?.showTimer ?? false,
    enableTicketQueue: roomDefaults?.enableTicketQueue ?? false,
    allowOthersToShowEstimates:
      roomDefaults?.allowOthersToShowEstimates ?? false,
    allowOthersToDeleteEstimates:
      roomDefaults?.allowOthersToDeleteEstimates ?? false,
    allowOthersToManageQueue: roomDefaults?.allowOthersToManageQueue ?? false,
    hideParticipantNames: roomDefaults?.hideParticipantNames ?? false,
    anonymousVotes: roomDefaults?.anonymousVotes ?? true,
  });
  const [currentStep, setCurrentStep] = useState<'name' | 'avatar' | 'details'>(
    'name'
  );
  const [showSettings, setShowSettings] = useState(true);
  const [settings, setSettings] = useState<Partial<RoomSettings>>(() =>
    buildSettingsFromDefaults(serverDefaults?.roomSettings)
  );

  useEffect(() => {
    if (!serverDefaults?.roomSettings) return;

    setSettings((prev) => ({
      ...buildSettingsFromDefaults(serverDefaults.roomSettings),
      ...prev,
    }));
  }, [serverDefaults]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep === 'name' && name.trim()) {
      setCurrentStep('avatar');
    } else if (currentStep === 'avatar' && selectedAvatar) {
      setCurrentStep('details');
    } else if (currentStep === 'details' && name && selectedAvatar) {
      clearError();
      handleCreateRoom(settings);
    }
  };

  const handleBack = () => {
    if (currentStep === 'avatar') {
      setCurrentStep('name');
    } else if (currentStep === 'details') {
      setCurrentStep('avatar');
    } else {
      goHome();
    }
  };

  const handleSettingChange = (
    key: keyof RoomSettings,
    value: boolean | string | number
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getFormValid = () => {
    if (currentStep === 'name') return name.trim();
    if (currentStep === 'avatar') return selectedAvatar;
    if (currentStep === 'details') return name.trim() && selectedAvatar;
    return false;
  };

  const getButtonText = () => {
    if (currentStep === 'name') return 'Continue';
    if (currentStep === 'avatar') return 'Continue';
    return 'Create';
  };

  const getStepTitle = () => {
    if (currentStep === 'name') return 'Create Room';
    if (currentStep === 'avatar') return 'Select Your Avatar';
    return 'Room Settings';
  };

  const getStepDescription = () => {
    if (currentStep === 'name')
      return 'Set up a new planning poker session for your team';
    if (currentStep === 'avatar')
      return 'Choose an avatar to represent you in the room';
    return 'Configure your room preferences (optional)';
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
              Step{' '}
              {currentStep === 'name' ? 1 : currentStep === 'avatar' ? 2 : 3}
              /3
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              {getStepTitle()}
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              {getStepDescription()}
            </p>
          </div>
        </div>

        <SurfaceCard>
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error && (
              <Alert variant="error" onDismiss={clearError}>
                {error}
              </Alert>
            )}

            {currentStep === 'name' && (
              <Input
                id="create-name"
                label={
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Your name
                  </span>
                }
                type="text"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="Moderator name"
                required
                fullWidth
                icon={<User className="h-4 w-4" />}
                showValidation
                isValid={!!name.trim()}
                helperText="You'll start as moderator—manage settings any time."
              />
            )}

            {currentStep === 'details' && (
              <div className="space-y-6">
                <Input
                  id="create-passcode"
                  label={
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Room passcode
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
                  placeholder="Add a passcode"
                  fullWidth
                  icon={<Lock className="h-4 w-4" />}
                  helperText="Boost security with a passcode or leave empty for open rooms."
                />

                <div className="space-y-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Ticket queue <BetaBadge />
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Keep track of your estimations in a queue.
                      </p>
                    </div>
                    <label
                      htmlFor="enable-ticket-queue-toggle"
                      className="flex items-center gap-2"
                    >
                      <input
                        id="enable-ticket-queue-toggle"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                        checked={settings.enableTicketQueue ?? false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleSettingChange('enableTicketQueue', checked);
                          if (!checked) {
                            handleSettingChange('externalService', 'none');
                          }
                        }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        {settings.enableTicketQueue ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {settings.enableTicketQueue && (
                    <div className="space-y-2">
                      <label
                        htmlFor="ticket-queue-provider"
                        className="text-sm font-semibold text-slate-800 dark:text-slate-100"
                      >
                        Choose a provider
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Choose Jira or Linear to sync ticket estimations
                        automatically.
                      </p>
                      <select
                        id="ticket-queue-provider"
                        value={settings.externalService || 'none'}
                        onChange={(e) =>
                          handleSettingChange('externalService', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-brand-300 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                      >
                        <option value="none">SprintJam queue</option>
                        <option value="jira">Jira</option>
                        <option value="linear">Linear</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    aria-expanded={showSettings}
                    aria-controls="room-preferences-panel"
                    className="flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Room preferences
                      <span className="text-xs font-normal text-slate-400">
                        optional
                      </span>
                    </span>
                    {showSettings ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {showSettings && (
                    <motion.div
                      id="room-preferences-panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-slate-900/60 max-h-[220px] overflow-y-auto"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label
                          htmlFor="enable-structured-voting"
                          className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2 transition hover:border-brand-200 dark:border-white/10 dark:bg-slate-900/60"
                        >
                          <input
                            id="enable-structured-voting"
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                            checked={settings.enableStructuredVoting ?? false}
                            onChange={(e) =>
                              handleSettingChange(
                                'enableStructuredVoting',
                                e.target.checked
                              )
                            }
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              Enable structured voting
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Vote on multiple criteria with calculated story
                              points.
                            </p>
                          </div>
                        </label>

                        <label
                          htmlFor="anonymous-votes"
                          className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2 transition hover:border-brand-200 dark:border-white/10 dark:bg-slate-900/60"
                        >
                          <input
                            id="anonymous-votes"
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                            checked={settings.anonymousVotes ?? false}
                            onChange={(e) =>
                              handleSettingChange(
                                'anonymousVotes',
                                e.target.checked
                              )
                            }
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              Use anonymous voting
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Keep votes private.
                            </p>
                          </div>
                        </label>

                        <label
                          htmlFor="hide-participant-names"
                          className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2 transition hover:border-brand-200 dark:border-white/10 dark:bg-slate-900/60"
                        >
                          <input
                            id="hide-participant-names"
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                            checked={settings.hideParticipantNames ?? false}
                            onChange={(e) =>
                              handleSettingChange(
                                'hideParticipantNames',
                                e.target.checked
                              )
                            }
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              Hide participant names
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Keep estimates impartial by hiding who is voting
                              during rounds.
                            </p>
                          </div>
                        </label>

                        <label
                          htmlFor="allow-others-to-show-estimates"
                          className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2 transition hover:border-brand-200 dark:border-white/10 dark:bg-slate-900/60"
                        >
                          <input
                            id="allow-others-to-show-estimates"
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                            checked={
                              settings.allowOthersToShowEstimates ?? false
                            }
                            onChange={(e) =>
                              handleSettingChange(
                                'allowOthersToShowEstimates',
                                e.target.checked
                              )
                            }
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              Let anyone reveal votes
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Give teammates permission to show estimates when
                              you are ready.
                            </p>
                          </div>
                        </label>

                        <label
                          htmlFor="allow-others-to-delete-estimates"
                          className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2 transition hover:border-brand-200 dark:border-white/10 dark:bg-slate-900/60"
                        >
                          <input
                            id="allow-others-to-delete-estimates"
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                            checked={
                              settings.allowOthersToDeleteEstimates ?? false
                            }
                            onChange={(e) =>
                              handleSettingChange(
                                'allowOthersToDeleteEstimates',
                                e.target.checked
                              )
                            }
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              Let anyone reset a round
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Allow the team to clear votes without waiting on
                              the moderator.
                            </p>
                          </div>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'avatar' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Pick an avatar
                </p>
                <AvatarSelector
                  selectedAvatar={selectedAvatar}
                  onSelectAvatar={setSelectedAvatar}
                />
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                data-testid="create-room-back"
                onClick={handleBack}
                className="sm:w-auto sm:flex-shrink-0"
                fullWidth
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button
                type="submit"
                data-testid="create-room-submit"
                disabled={!getFormValid()}
                className="sm:flex-1"
                icon={<ChevronRight className="h-4 w-4" />}
                fullWidth
              >
                {getButtonText()}
              </Button>
            </div>
          </motion.form>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          After creation you’ll get a shareable key to invite the team.
        </p>
      </motion.div>
      <Footer displayRepoLink={false} />
    </PageBackground>
  );
};

export default CreateRoomScreen;
