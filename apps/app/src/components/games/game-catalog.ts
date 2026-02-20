import type { RoomGameType } from '@/types';

export const ROOM_GAMES: Array<{
  type: RoomGameType;
  title: string;
  description: string;
  objective: string;
}> = [
  {
    type: 'guess-the-number',
    title: 'Guess the Number',
    description: 'Everyone guesses 1-20. Exact guess scores big; close guesses still earn points.',
    objective: 'Fast rounds, quick leaderboard shifts, lots of banter.',
  },
  {
    type: 'word-chain',
    title: 'Word Chain',
    description: 'Submit words where each new word starts with the last letter of the previous one.',
    objective: 'Keep the chain alive and outplay the room on streaks.',
  },
  {
    type: 'emoji-story',
    title: 'Emoji Story',
    description: 'Build a collaborative story one emoji burst at a time.',
    objective: 'Create chaos together and race for the top score.',
  },
];
