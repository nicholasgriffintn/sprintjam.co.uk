import {
  User,
  Bot,
  Cat,
  Bird,
  Sword,
  Rocket,
  Zap,
  Skull,
  Wand2,
  Ghost,
  Flame,
  Crown,
} from 'lucide-react';

import type { AvatarId } from '../types';

interface AvatarInfo {
  id: AvatarId;
  label: string;
  Icon: React.ComponentType<{ size: number; className: string }>;
  color: string;
}

export const AVATAR_MAP: Record<AvatarId, AvatarInfo> = {
  user: { id: 'user', label: 'User', Icon: User, color: 'text-amber-600 dark:text-amber-400' },
  robot: { id: 'robot', label: 'Robot', Icon: Bot, color: 'text-gray-600 dark:text-gray-400' },
  bear: { id: 'bear', label: 'Bear', Icon: Cat, color: 'text-orange-700 dark:text-orange-500' },
  bird: { id: 'bird', label: 'Bird', Icon: Bird, color: 'text-blue-600 dark:text-blue-400' },
  knight: { id: 'knight', label: 'Knight', Icon: Sword, color: 'text-slate-700 dark:text-slate-400' },
  alien: { id: 'alien', label: 'Alien', Icon: Rocket, color: 'text-purple-600 dark:text-purple-400' },
  ninja: { id: 'ninja', label: 'Ninja', Icon: Zap, color: 'text-black dark:text-white' },
  pirate: { id: 'pirate', label: 'Pirate', Icon: Skull, color: 'text-red-700 dark:text-red-500' },
  wizard: { id: 'wizard', label: 'Wizard', Icon: Wand2, color: 'text-indigo-600 dark:text-indigo-400' },
  ghost: { id: 'ghost', label: 'Ghost', Icon: Ghost, color: 'text-cyan-600 dark:text-cyan-400' },
  dragon: { id: 'dragon', label: 'Dragon', Icon: Flame, color: 'text-red-600 dark:text-red-400' },
  crown: { id: 'crown', label: 'Crown', Icon: Crown, color: 'text-yellow-600 dark:text-yellow-400' },
};

export const getAvatarInfo = (avatarId: AvatarId): AvatarInfo | null => {
  return AVATAR_MAP[avatarId] || null;
};

export const isEmojiAvatar = (avatarId: AvatarId): boolean => {
  return !AVATAR_MAP[avatarId];
};
