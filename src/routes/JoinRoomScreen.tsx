import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Key, Lock, User, ChevronRight } from 'lucide-react';

import { useSession } from '../context/SessionContext';
import { useRoom } from '../context/RoomContext';
import AvatarSelector from '../components/AvatarSelector';
import { PageBackground } from '../components/layout/PageBackground';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Logo } from '../components/Logo';
import { Footer } from '../components/layout/Footer';
import { usePageMeta } from '../hooks/usePageMeta';
import { META_CONFIGS } from '../config/meta';

const JoinRoomScreen = () => {
  usePageMeta(META_CONFIGS.join);
  const {
    name,
    roomKey,
    passcode,
    selectedAvatar,
    setName,
    setRoomKey,
    setPasscode,
    setSelectedAvatar,
    goHome,
    error,
    errorKind,
    clearError,
  } = useSession();
  const { handleJoinRoom } = useRoom();
  const [currentStep, setCurrentStep] = useState<'details' | 'avatar'>(
    'details'
  );
  const isPasscodeError = errorKind === 'passcode';
  const isPermissionError = errorKind === 'permission';
  const isAuthError = errorKind === 'auth';
  const shouldShowAlert = !!error && !isPasscodeError;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep === 'details' && name.trim() && roomKey.trim()) {
      setCurrentStep('avatar');
    } else if (currentStep === 'avatar' && selectedAvatar) {
      clearError();
      handleJoinRoom();
    }
  };

  const handleBack = () => {
    if (currentStep === 'avatar') {
      setCurrentStep('details');
    } else {
      goHome();
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
            {shouldShowAlert && (
              <Alert
                variant={isPermissionError || isAuthError ? 'warning' : 'error'}
                onDismiss={clearError}
              >
                {isPermissionError
                  ? "You don't have permission to join this room."
                  : isAuthError
                    ? 'Session expired. Rejoin with a fresh link.'
                    : error}
              </Alert>
            )}

            {currentStep === 'details' && (
              <div className="space-y-6">
                <Input
                  id="join-name"
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
                  placeholder="Team member name"
                  required
                  fullWidth
                  icon={<User className="h-4 w-4" />}
                  showValidation
                  isValid={!!name.trim()}
                />

                <Input
                  id="join-room-key"
                  label={
                    <span className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Room key
                    </span>
                  }
                  type="text"
                  value={roomKey}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setRoomKey(e.target.value.toUpperCase())
                  }
                  placeholder="0MTINL"
                  maxLength={6}
                  required
                  fullWidth
                  icon={<Key className="h-4 w-4" />}
                  showValidation
                  isValid={!!roomKey.trim()}
                  helperText="Six characters shared by your moderator."
                  className="font-mono tracking-[0.35em] text-center"
                />

                <Input
                  id="join-passcode"
                  label={
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
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
                  placeholder="Enter passcode if needed"
                  fullWidth
                  error={
                    isPasscodeError
                      ? 'Passcode incorrect. Ask the moderator to confirm it.'
                      : undefined
                  }
                  icon={<Lock className="h-4 w-4" />}
                />
              </div>
            )}

            {currentStep === 'avatar' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Choose your avatar
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
                data-testid="join-room-back"
                onClick={handleBack}
                className="sm:w-auto sm:flex-shrink-0"
                fullWidth
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button
                type="submit"
                data-testid="join-room-submit"
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
      <Footer displayRepoLink={false} />
    </PageBackground>
  );
};

export default JoinRoomScreen;
