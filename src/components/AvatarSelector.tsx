import type { FC } from 'react';
import { motion } from 'framer-motion';
import type { AvatarId } from '../types';
import { AVATAR_MAP } from '../utils/avatars';

const AVATARS = Object.values(AVATAR_MAP);

interface AvatarSelectorProps {
  selectedAvatar: AvatarId | null;
  onSelectAvatar: (avatar: AvatarId) => void;
}

const AvatarSelector: FC<AvatarSelectorProps> = ({ selectedAvatar, onSelectAvatar }) => {
  return (
    <div className="w-full">
      {selectedAvatar && (
        <div className="flex justify-center mb-8">
          <motion.div
            key={selectedAvatar}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center border-4 border-blue-500 dark:border-indigo-400"
          >
            {(() => {
              const selectedAvatarInfo = AVATARS.find((a) => a.id === selectedAvatar);
              if (selectedAvatarInfo) {
                const IconComponent = selectedAvatarInfo.Icon;
                return <IconComponent size={48} className={selectedAvatarInfo.color} />;
              }
              return null;
            })()}
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-3 mb-6">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelectAvatar(avatar.id)}
            className={`w-full aspect-square rounded-full flex items-center justify-center transition-all duration-200 border-2 hover:scale-105 active:scale-95 ${
              selectedAvatar === avatar.id
                ? 'border-blue-500 dark:border-indigo-400 bg-blue-50 dark:bg-blue-900 shadow-lg scale-110'
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-indigo-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={avatar.label}
          >
            {(() => {
              const IconComponent = avatar.Icon;
              return <IconComponent size={32} className={avatar.color} />;
            })()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvatarSelector;
