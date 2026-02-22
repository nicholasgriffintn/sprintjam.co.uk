import { describe, expect, it } from 'vitest';
import { getDefaultRoomSettings } from '@sprintjam/utils';

import { determineRoomPhase } from './room-phase';

const baseRoom = {
  key: 'ROOM',
  users: [],
  votes: {},
  structuredVotes: {},
  showVotes: false,
  moderator: '',
  connectedUsers: {},
  settings: getDefaultRoomSettings(),
};

describe('room-phase utils', () => {
  it('returns lobby when no votes have been cast', () => {
    expect(determineRoomPhase(baseRoom)).toBe('lobby');
  });

  it('returns voting when votes exist but are not revealed', () => {
    const room = {
      ...baseRoom,
      votes: { alice: 3 },
      showVotes: false,
    };
    expect(determineRoomPhase(room)).toBe('voting');
  });

  it('returns discussion when votes are revealed', () => {
    const room = { ...baseRoom, showVotes: true };
    expect(determineRoomPhase(room)).toBe('discussion');
  });
});
