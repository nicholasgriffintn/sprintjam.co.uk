import type { ComponentType } from 'react';
import { Binary, Link2, Smile } from 'lucide-react';

import type { RoomGameType } from '@/types';

export const ROOM_GAMES: Array<{
  type: RoomGameType;
  title: string;
  description: string;
  objective: string;
  rules: string;
}> = [
  {
    type: 'guess-the-number',
    title: 'Guess the Number',
    description:
      'Everyone guesses 1-20. Exact guess scores big; close guesses still earn points.',
    objective: 'Fast rounds, quick leaderboard shifts, good for a quick break.',
    rules: 'Whole numbers only (1-20). Exact +3, within 2 +1, otherwise 0.',
  },
  {
    type: 'word-chain',
    title: 'Word Chain',
    description:
      'Submit words where each new word starts with the last letter of the previous one.',
    objective: 'Keep the chain alive and outplay the room on streaks.',
    rules: 'Words need at least 2 letters and must follow the last-letter chain.',
  },
  {
    type: 'emoji-story',
    title: 'Emoji Story',
    description:
      'Build a collaborative story one emoji burst at a time. Builds up over 5 rounds.',
    objective: 'Create a story together using only emojis.',
    rules: 'Emoji only, 1-6 emojis per move.',
  },
];

export const GAME_ICONS: Record<
  RoomGameType,
  ComponentType<{ className?: string }>
> = {
  'guess-the-number': Binary,
  'word-chain': Link2,
  'emoji-story': Smile,
};
