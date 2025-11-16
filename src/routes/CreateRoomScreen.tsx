import { useState } from 'react';
import type { FC, ChangeEvent, FormEvent } from 'react';
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

import type { RoomSettings, AvatarId } from '../types';
import AvatarSelector from '../components/AvatarSelector';
import { PageBackground } from '../components/layout/PageBackground';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Logo } from '../components/Logo';

interface CreateRoomScreenProps {
  name: string;
  passcode: string;
  selectedAvatar: AvatarId | null;
  onNameChange: (name: string) => void;
  onPasscodeChange: (passcode: string) => void;
  onAvatarChange: (avatar: AvatarId) => void;
  onCreateRoom: (settings?: Partial<RoomSettings>) => void;
  onBack: () => void;
  error: string;
  onClearError: () => void;
  defaultSettings?: RoomSettings;
}

const CreateRoomScreen: FC<CreateRoomScreenProps> = ({
  name,
  passcode,
  selectedAvatar,
  onNameChange,
  onPasscodeChange,
  onAvatarChange,
  onCreateRoom,
  onBack,
  error,
  onClearError,
  defaultSettings,
}) => {
  const [currentStep, setCurrentStep] = useState<'name' | 'avatar' | 'details'>(
    'name'
  );
  const [showSettings, setShowSettings] = useState(true);
  const [settings, setSettings] = useState<Partial<RoomSettings>>(() => {
    if (!defaultSettings) {
      return {};
    }

    return {
      enableStructuredVoting: defaultSettings.enableStructuredVoting ?? false,
      enableJudge: defaultSettings.enableJudge ?? true,
      enableJiraIntegration: defaultSettings.enableJiraIntegration ?? false,
      showTimer: defaultSettings.showTimer ?? false,
      allowOthersToShowEstimates:
        defaultSettings.allowOthersToShowEstimates ?? false,
      hideParticipantNames: defaultSettings.hideParticipantNames ?? false,
    };
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep === 'name' && name.trim()) {
      setCurrentStep('avatar');
    } else if (currentStep === 'avatar' && selectedAvatar) {
      setCurrentStep('details');
    } else if (currentStep === 'details' && name && selectedAvatar) {
      onClearError();
      onCreateRoom(settings);
    }
  };

  const handleBack = () => {
    if (currentStep === 'avatar') {
      setCurrentStep('name');
    } else if (currentStep === 'details') {
      setCurrentStep('avatar');
    } else {
      onBack();
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
    <PageBackground align="start" maxWidth="sm">
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
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">
              Step{' '}
              {currentStep === 'name' ? 1 : currentStep === 'avatar' ? 3 : 2}
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
              <Alert variant="error" onDismiss={onClearError}>
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
                  onNameChange(e.target.value)
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
                    onPasscodeChange(e.target.value)
                  }
                  placeholder="Add a passcode"
                  fullWidth
                  icon={<Lock className="h-4 w-4" />}
                  helperText="Boost security with a passcode or leave empty for open rooms."
                />

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
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
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-slate-900/60"
                    >
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                          checked={settings.enableStructuredVoting ?? false}
                          onChange={(e) =>
                            handleSettingChange(
                              'enableStructuredVoting',
                              e.target.checked
                            )
                          }
                        />
                        Enable structured voting
                      </label>
                      <p className="rounded-2xl bg-brand-50/70 p-3 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                        Vote on multiple criteria with calculated story points.
                      </p>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                          checked={settings.hideParticipantNames ?? false}
                          onChange={(e) =>
                            handleSettingChange(
                              'hideParticipantNames',
                              e.target.checked
                            )
                          }
                        />
                        Hide participant names
                      </label>
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
                  onSelectAvatar={onAvatarChange}
                />
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                className="sm:w-auto sm:flex-shrink-0"
                fullWidth
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button
                type="submit"
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
    </PageBackground>
  );
};

export default CreateRoomScreen;
