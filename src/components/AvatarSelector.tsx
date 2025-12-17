import type { FC } from "react";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Smile, User } from "lucide-react";

import type { AvatarId } from "@/types";
import { AVATAR_MAP } from "@/utils/avatars";
import { QUICK_EMOJIS } from "@/constants";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const AVATARS = Object.values(AVATAR_MAP);

interface AvatarSelectorProps {
  selectedAvatar: AvatarId | null;
  onSelectAvatar: (avatar: AvatarId) => void;
}

const AvatarSelector: FC<AvatarSelectorProps> = ({
  selectedAvatar,
  onSelectAvatar,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");
  const emojiPickerId = useId();

  const handleEmojiSelect = (emoji: string) => {
    onSelectAvatar(emoji);
    setCustomEmoji("");
  };

  const handleCustomEmojiSubmit = () => {
    if (customEmoji.trim()) {
      onSelectAvatar(customEmoji.trim());
      setCustomEmoji("");
    }
  };

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
              const selectedAvatarInfo = AVATARS.find(
                (a) => a.id === selectedAvatar,
              );
              if (selectedAvatarInfo) {
                const IconComponent = selectedAvatarInfo.Icon;
                return (
                  <IconComponent
                    size={48}
                    className={selectedAvatarInfo.color}
                  />
                );
              }
              return <span className="text-5xl">{selectedAvatar}</span>;
            })()}
          </motion.div>
        </div>
      )}

      {!showEmojiPicker && (
        <div className="grid grid-cols-6 gap-3 mb-4">
          {AVATARS.map((avatar) => (
            <Button
              key={avatar.id}
              data-testid={`avatar-option-${avatar.id}`}
              variant="ghost"
              type="button"
              onClick={() => onSelectAvatar(avatar.id)}
              aria-label={`Select ${avatar.label} avatar`}
              aria-pressed={selectedAvatar === avatar.id}
              className={`w-full aspect-square rounded-full flex items-center justify-center transition-all duration-200 border-2 hover:scale-105 active:scale-95 ${
                selectedAvatar === avatar.id
                  ? "border-blue-500 dark:border-indigo-400 bg-blue-50 dark:bg-blue-900 shadow-lg scale-110"
                  : "border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-indigo-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              title={avatar.label}
            >
              {(() => {
                const IconComponent = avatar.Icon;
                return <IconComponent size={32} className={avatar.color} />;
              })()}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <Button
          variant="secondary"
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 flex items-center justify-center gap-2"
          aria-expanded={showEmojiPicker}
          aria-controls={emojiPickerId}
          aria-pressed={showEmojiPicker}
          data-testid="avatar-emoji-toggle"
        >
          <div className="flex items-center justify-center gap-2">
            {showEmojiPicker ? (
              <User className="h-4 w-4" />
            ) : (
              <Smile className="h-4 w-4" />
            )}
            {showEmojiPicker ? "Show Icon Avatars" : "Use Custom Emoji"}
          </div>
        </Button>

        {showEmojiPicker && (
          <motion.div
            id={emojiPickerId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
            role="region"
            aria-live="polite"
            aria-label="Custom emoji picker"
            data-testid="avatar-emoji-panel"
          >
            <div className="grid grid-cols-8 gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  aria-label={`Select ${emoji} emoji avatar`}
                  aria-pressed={selectedAvatar === emoji}
                  className={`aspect-square rounded-lg flex items-center justify-center text-2xl transition-all duration-200 hover:scale-110 active:scale-95 border-2 ${
                    selectedAvatar === emoji
                      ? "border-blue-500 dark:border-indigo-400 bg-blue-50 dark:bg-blue-900 shadow-lg"
                      : "border-transparent hover:border-blue-400 dark:hover:border-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                id="custom-emoji-input"
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCustomEmojiSubmit();
                  }
                }}
                placeholder="Or type/paste any emoji..."
                aria-label="Custom emoji input"
                fullWidth
                maxLength={2}
              />
              <Button
                type="button"
                onClick={handleCustomEmojiSubmit}
                disabled={!customEmoji.trim()}
                className="px-6 py-2 rounded-2xl bg-blue-500 hover:bg-blue-600 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Select a quick emoji above or type your own. You can use your
              device's emoji keyboard too!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AvatarSelector;
