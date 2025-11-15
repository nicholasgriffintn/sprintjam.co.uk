/** biome-ignore-all lint/nursery/useUniqueElementIds: <explanation> */
import type { FC, ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Key,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

import AvatarSelector from '../components/AvatarSelector';
import type { AvatarId } from '../types';
import { PageBackground } from '../components/layout/PageBackground';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/Logo';

interface JoinRoomScreenProps {
  name: string;
  roomKey: string;
  passcode: string;
  selectedAvatar: AvatarId | null;
  onNameChange: (name: string) => void;
  onRoomKeyChange: (key: string) => void;
  onPasscodeChange: (passcode: string) => void;
  onAvatarChange: (avatar: AvatarId) => void;
  onJoinRoom: () => void;
  onBack: () => void;
  error: string;
  onClearError: () => void;
}

const JoinRoomScreen: FC<JoinRoomScreenProps> = ({
  name,
  roomKey,
  passcode,
  selectedAvatar,
  onNameChange,
  onRoomKeyChange,
  onPasscodeChange,
  onAvatarChange,
  onJoinRoom,
  onBack,
  error,
  onClearError,
}) => {
  const [currentStep, setCurrentStep] = useState<'details' | 'avatar'>(
    'details'
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep === 'details' && name.trim() && roomKey.trim()) {
      setCurrentStep('avatar');
    } else if (currentStep === 'avatar' && selectedAvatar) {
      onClearError();
      onJoinRoom();
    }
  };

  const handleBack = () => {
    if (currentStep === 'avatar') {
      setCurrentStep('details');
    } else {
      onBack();
    }
  };

  const getFormValid = () => {
    if (currentStep === 'details') return name.trim() && roomKey.trim();
    if (currentStep === 'avatar') return selectedAvatar;
    return false;
  };

  const getButtonText = () => {
    if (currentStep === 'details') return 'Continue';
    return 'Join';
  };

  const getStepTitle = () => {
    if (currentStep === 'details') return 'Join Room';
    return 'Select Your Avatar';
  };

  const getStepDescription = () => {
    if (currentStep === 'details')
      return 'Enter the room details to join your team';
    return 'Choose an avatar to represent you in the room';
  };

  const inputClasses =
    'w-full rounded-2xl border border-white/50 bg-white/80 px-4 py-3 pl-12 text-base text-slate-900 shadow-inner shadow-white/40 transition placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500';

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
              Step {currentStep === 'details' ? 1 : 2}/2
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
              <div className="flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-50/70 p-4 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {currentStep === 'details' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="join-name"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <User className="h-4 w-4" />
                    Your name
                  </label>
                  <div className="relative">
                    <input
                      id="join-name"
                      type="text"
                      value={name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onNameChange(e.target.value)
                      }
                      className={inputClasses}
                      placeholder="Team member name"
                      required
                    />
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    {name.trim() && (
                      <CheckCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="join-room-key"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <Key className="h-4 w-4" />
                    Room key
                  </label>
                  <div className="relative">
                    <input
                      id="join-room-key"
                      type="text"
                      value={roomKey}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onRoomKeyChange(e.target.value.toUpperCase())
                      }
                      className={`${inputClasses} font-mono tracking-[0.35em] text-center`}
                      placeholder="0MTINL"
                      maxLength={6}
                      required
                    />
                    <Key className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    {roomKey.trim() && (
                      <CheckCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Six characters shared by your moderator.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="join-passcode"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <Lock className="h-4 w-4" />
                    Passcode
                    <span className="text-xs font-normal text-slate-400">
                      optional
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="join-passcode"
                      type="password"
                      value={passcode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onPasscodeChange(e.target.value)
                      }
                      className={inputClasses}
                      placeholder="Enter passcode if needed"
                    />
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'avatar' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Choose your avatar
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
                icon={
                  currentStep === 'details' ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )
                }
                fullWidth
              >
                {getButtonText()}
              </Button>
            </div>
          </motion.form>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Need help? Ask your moderator for the key or passcode again.
        </p>
      </motion.div>
    </PageBackground>
  );
};

export default JoinRoomScreen; 
