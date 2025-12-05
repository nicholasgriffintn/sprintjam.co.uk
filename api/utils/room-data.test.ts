import { describe, it, expect, beforeEach } from 'vitest';

import {
  assignUserAvatar,
  markUserConnection,
  ensureConnectedUsers,
} from './room-data';
import type { RoomData, RoomSettings } from '../types';
import { JudgeAlgorithm } from '../types';

const baseSettings: RoomSettings = {
  estimateOptions: [1, 2, 3],
  allowOthersToShowEstimates: false,
  allowOthersToDeleteEstimates: false,
  showTimer: false,
  showUserPresence: true,
  showAverage: false,
  showMedian: false,
  showTopVotes: false,
  topVotesCount: 0,
  anonymousVotes: false,
  enableJudge: false,
  judgeAlgorithm: JudgeAlgorithm.SIMPLE_AVERAGE,
};

const createRoom = (overrides: Partial<RoomData> = {}): RoomData => ({
  key: 'ROOM',
  users: [],
  votes: {},
  connectedUsers: {},
  showVotes: false,
  moderator: 'mod',
  settings: baseSettings,
  ...overrides,
});

describe('room-data helpers', () => {
  describe('markUserConnection', () => {
    let room: RoomData;

    beforeEach(() => {
      room = createRoom({
        users: ['Alice'],
        connectedUsers: { Alice: false },
      });
    });

    it('reuses canonical casing and does not duplicate users', () => {
      markUserConnection(room, 'alice  ', true);

      expect(room.users).toEqual(['Alice']);
      expect(room.connectedUsers['Alice']).toBe(true);
    });

    it('adds trimmed user when not present', () => {
      markUserConnection(room, '  Bob ', true);

      expect(room.users).toEqual(['Alice', 'Bob']);
      expect(room.connectedUsers['Bob']).toBe(true);
    });

    it('initializes connectedUsers when missing', () => {
      const freshRoom = createRoom({ users: ['Casey'], connectedUsers: {} });

      markUserConnection(freshRoom, 'casey', true);

      expect(ensureConnectedUsers(freshRoom)['Casey']).toBe(true);
    });
  });

  describe('assignUserAvatar', () => {
    let room: RoomData;

    beforeEach(() => {
      room = createRoom({
        users: ['Alice'],
        connectedUsers: { Alice: true },
        userAvatars: {},
      });
    });

    it('reuses canonical casing when setting avatar', () => {
      assignUserAvatar(room, 'alice', 'cat');

      expect(room.userAvatars?.Alice).toBe('cat');
      expect(Object.keys(room.userAvatars ?? {})).toEqual(['Alice']);
    });

    it('removes avatar when value is empty', () => {
      room.userAvatars = { Alice: 'cat' };

      assignUserAvatar(room, 'ALICE');

      expect(room.userAvatars?.Alice).toBeUndefined();
    });
  });
});
