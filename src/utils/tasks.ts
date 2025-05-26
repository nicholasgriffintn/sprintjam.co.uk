import type { RoomData } from '../types';

export function getUsersVoteTaskSize(roomData: RoomData, name: string) {
  const usersVote = roomData.votes[name];
  const metadata = roomData.settings.voteOptionsMetadata?.find(m => m.value === usersVote);
  const taskSize = metadata?.taskSize || null;

  switch (taskSize) {
    case 'xs':
      return 'Extra Small';
    case 'sm':
      return 'Small';
    case 'md':
      return 'Medium';
    case 'lg':
      return 'Large';
    case 'xl':
      return 'Extra Large';
    default:
      return 'Unknown';
  }
}