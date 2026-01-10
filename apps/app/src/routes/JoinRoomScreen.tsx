import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Key, Lock, User, ChevronRight } from "lucide-react";

import {
  useSessionActions,
  useSessionErrors,
  useSessionState,
} from "@/context/SessionContext";
import { useRoomActions, useRoomStatus } from "@/context/RoomContext";
import AvatarSelector from "@/components/AvatarSelector";
import { PageSection } from '@/components/layout/PageBackground';
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from '@/components/ui/Alert';
import { Footer } from "@/components/layout/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import {
  formatRoomKey,
  validateName,
  validateRoomKey,
} from "@/utils/validators";

const JoinRoomScreen = () => {
  usePageMeta(META_CONFIGS.join);
  const { name, roomKey, passcode, selectedAvatar, joinFlowMode } =
    useSessionState();
  const {
    setName,
    setRoomKey,
    setPasscode,
    setSelectedAvatar,
    setScreen,
    setJoinFlowMode,
    goHome,
  } = useSessionActions();
  const { error, errorKind, clearError } = useSessionErrors();
  const { handleJoinRoom, handleCreateRoom } = useRoomActions();
  const { isLoading } = useRoomStatus();
  const [currentStep, setCurrentStep] = useState<'details' | 'avatar'>(
    joinFlowMode === 'create' ? 'avatar' : 'details'
  );
  const isCreateFlow = joinFlowMode === 'create';
  const isNameValid = validateName(name).ok;
  const isRoomKeyValid = validateRoomKey(roomKey).ok;

  useEffect(() => {
    if (currentStep === 'avatar' && !selectedAvatar) {
      setSelectedAvatar('user');
    }
  }, [currentStep, selectedAvatar, setSelectedAvatar]);
  const isPasscodeError = errorKind === 'passcode';
  const isPermissionError = errorKind === 'permission';
  const isAuthError = errorKind === 'auth';
  const shouldShowAlert = !!error;

  useEffect(() => {
    setCurrentStep(joinFlowMode === 'create' ? 'avatar' : 'details');
  }, [joinFlowMode]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      currentStep === 'details' &&
      isNameValid &&
      (isCreateFlow || isRoomKeyValid)
    ) {
      setCurrentStep('avatar');
    } else if (currentStep === 'avatar' && selectedAvatar) {
      clearError();
      if (isCreateFlow) {
        void handleCreateRoom();
        setJoinFlowMode('join');
      } else {
        void handleJoinRoom();
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'avatar') {
      setCurrentStep('details');
    } else if (isCreateFlow) {
      setScreen('create');
    } else {
      goHome();
    }
  };

  const getFormValid = () => {
    if (currentStep === 'details') {
      if (isCreateFlow) {
        return isNameValid;
      }
      return isNameValid && isRoomKeyValid;
    }
    if (currentStep === 'avatar') {
      return selectedAvatar;
    }
    return false;
  };

  const getButtonText = () => {
    if (currentStep === 'details') return 'Continue';
    return isCreateFlow ? 'Create & join' : 'Join';
  };

  const getStepTitle = () => {
    if (currentStep === 'details')
      return isCreateFlow ? 'Details confirmed' : 'Join Room';
    return isCreateFlow ? 'Pick your avatar' : 'Select Your Avatar';
  };

  const getStepDescription = () => {
    if (currentStep === 'details') {
      return isCreateFlow
        ? 'We prefilled the basics from your create flow. Adjust your name or passcode if needed.'
        : 'Enter the room details to join your team';
    }
    return isCreateFlow
      ? 'Choose an avatar to join your new room as moderator'
      : 'Choose an avatar to represent you in the room';
  };

  return (
    <PageSection align="start" maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="space-y-3 text-left">
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
                  isValid={isNameValid}
                />

                {!isCreateFlow && (
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
                      setRoomKey(formatRoomKey(e.target.value))
                    }
                    placeholder="0MTINL"
                    maxLength={6}
                    required
                    fullWidth
                    icon={<Key className="h-4 w-4" />}
                    showValidation
                    isValid={isRoomKeyValid}
                    helperText="Six characters shared by your moderator."
                    className="font-mono tracking-[0.35em]"
                  />
                )}

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
                disabled={!getFormValid() || isLoading}
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
    </PageSection>
  );
};

export default JoinRoomScreen;
