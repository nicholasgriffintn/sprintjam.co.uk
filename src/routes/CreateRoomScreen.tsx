/** biome-ignore-all lint/nursery/useUniqueElementIds: form elements have unique IDs within component scope */
import type { FC, ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Lock, User, AlertCircle, CheckCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { RoomSettings } from '../types';

interface CreateRoomScreenProps {
  name: string;
  passcode: string;
  onNameChange: (name: string) => void;
  onPasscodeChange: (passcode: string) => void;
  onCreateRoom: (settings?: Partial<RoomSettings>) => void;
  onBack: () => void;
  error: string;
  onClearError: () => void;
  defaultSettings?: RoomSettings;
}

const CreateRoomScreen: FC<CreateRoomScreenProps> = ({
  name,
  passcode,
  onNameChange,
  onPasscodeChange,
  onCreateRoom,
  onBack,
  error,
  onClearError,
  defaultSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Partial<RoomSettings>>(() => {
    // Initialize with some sensible defaults if no defaultSettings provided
    if (!defaultSettings) return {};
    
    return {
      enableStructuredVoting: defaultSettings.enableStructuredVoting ?? false,
      enableJudge: defaultSettings.enableJudge ?? true,
      enableJiraIntegration: defaultSettings.enableJiraIntegration ?? false,
      showTimer: defaultSettings.showTimer ?? false,
      allowOthersToShowEstimates: defaultSettings.allowOthersToShowEstimates ?? false,
    };
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (name) {
      onClearError();
      onCreateRoom(settings);
    }
  };

  const handleSettingChange = (key: keyof RoomSettings, value: boolean | string | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const isFormValid = name.trim();

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
              <Plus className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create Room
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Set up a new planning poker session for your team
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
            
            <div className="mb-6">
              <label htmlFor="create-name" className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <User className="w-4 h-4" />
                Your Name
              </label>
              <div className="relative">
                <input
                  id="create-name"
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
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                You'll be the moderator of this room
              </p>
            </div>

            <div className="mb-8">
              <label htmlFor="create-passcode" className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Lock className="w-4 h-4" />
                Room Passcode
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input
                  id="create-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onPasscodeChange(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter passcode (optional)"
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Set a passcode to restrict room access
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Leave empty for a public room that anyone can join
                </p>
              </div>
            </div>

            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-between w-full p-4 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-all duration-200 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Room Settings
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    (optional)
                  </span>
                </div>
                {showSettings ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600"
                >
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableStructuredVoting"
                        checked={settings.enableStructuredVoting ?? false}
                        onChange={(e) => handleSettingChange('enableStructuredVoting', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="enableStructuredVoting" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Enable Structured Voting
                      </label>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Structured voting allows users to vote on multiple criteria with scores from 0-4. Story points are automatically calculated.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex gap-4">
              <motion.button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all duration-200 font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>
              
              <motion.button
                type="submit"
                disabled={!isFormValid}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-200 ${
                  isFormValid
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                whileHover={isFormValid ? { scale: 1.02 } : {}}
                whileTap={isFormValid ? { scale: 0.98 } : {}}
              >
                <Plus className="w-4 h-4" />
                Create Room
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
              Once created, you can share the room key with your team members.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateRoomScreen; 