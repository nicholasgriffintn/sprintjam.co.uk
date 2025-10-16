/** biome-ignore-all lint/nursery/useUniqueElementIds: <explanation> */
import type { FC, ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Key, Lock, User, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';

import AvatarSelector from '../components/AvatarSelector';
import type { AvatarId } from '../types';

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
  const [currentStep, setCurrentStep] = useState<'details' | 'avatar'>('details');

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
    return 'Join Room';
  };

  const getStepTitle = () => {
    if (currentStep === 'details') return 'Join Room';
    return 'Select Your Avatar';
  };

  const getStepDescription = () => {
    if (currentStep === 'details') return 'Enter the room details to join your team';
    return 'Choose an avatar to represent you in the room';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <Users className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {getStepTitle()}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {getStepDescription()}
            </p>
          </div>

          <motion.form 
            onSubmit={handleSubmit} 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            {error && (
              <motion.div 
                className="flex items-center gap-3 p-4 mb-6 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
            
            {currentStep === 'details' && (
              <>
                <div className="mb-6">
                  <label htmlFor="join-name" className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <User className="w-4 h-4" />
                    Your Name
                  </label>
                  <div className="relative">
                    <input
                      id="join-name"
                      type="text"
                      value={name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="Enter your name"
                      required
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {name.trim() && (
                      <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="join-room-key" className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <Key className="w-4 h-4" />
                    Room Key
                  </label>
                  <div className="relative">
                    <input
                      id="join-room-key"
                      type="text"
                      value={roomKey}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => onRoomKeyChange(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white font-mono text-center tracking-wider"
                      placeholder="0MTINL"
                      maxLength={6}
                      style={{ letterSpacing: '0.2em' }}
                      required
                    />
                    <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {roomKey.trim() && (
                      <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Enter the 6-character room key (e.g., 0MTINL)
                  </p>
                </div>

                <div className="mb-8">
                  <label htmlFor="join-passcode" className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <Lock className="w-4 h-4" />
                    Room Passcode
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="join-passcode"
                      type="password"
                      value={passcode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => onPasscodeChange(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="Enter passcode if required"
                    />
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Leave empty if the room doesn't require a passcode
                  </p>
                </div>
              </>
            )}

            {currentStep === 'avatar' && (
              <div className="mb-8">
                <AvatarSelector
                  selectedAvatar={selectedAvatar}
                  onSelectAvatar={onAvatarChange}
                />
              </div>
            )}

            <div className="flex gap-4">
              <motion.button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all duration-200 font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>

              <motion.button
                type="submit"
                disabled={!getFormValid()}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-200 ${
                  getFormValid()
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                whileHover={getFormValid() ? { scale: 1.02 } : {}}
                whileTap={getFormValid() ? { scale: 0.98 } : {}}
              >
                {currentStep === 'details' || currentStep === 'avatar' ? <ChevronRight className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {getButtonText()}
              </motion.button>
            </div>
          </motion.form>

          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.2 }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have a room key? Ask your team moderator to share it with you.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinRoomScreen; 