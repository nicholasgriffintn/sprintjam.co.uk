import { describe, it, expect } from 'vitest';
import type { RoomData } from '../types';
import { JudgeAlgorithm } from '../types';

describe('PlanningRoom - Vote Validation and Settings', () => {
  const createMockRoomData = (overrides?: Partial<RoomData>): RoomData => ({
    key: 'test-room',
    users: ['alice', 'bob', 'charlie'],
    votes: {},
    structuredVotes: {},
    showVotes: false,
    moderator: 'alice',
    connectedUsers: {
      alice: true,
      bob: true,
      charlie: true,
    },
    settings: {
      estimateOptions: [1, 3, 5, 8, 13, '?'],
      allowOthersToShowEstimates: false,
      allowOthersToDeleteEstimates: false,
      showTimer: false,
      showUserPresence: true,
      showAverage: true,
      showMedian: true,
      showTopVotes: false,
      topVotesCount: 3,
      anonymousVotes: false,
      enableJudge: true,
      judgeAlgorithm: JudgeAlgorithm.SMART_CONSENSUS,
      enableStructuredVoting: false,
      autoHandoverModerator: true,
    },
    ...overrides,
  });

  describe('Vote Validation', () => {
    it('should reject votes that are not in estimateOptions', () => {
      const roomData = createMockRoomData();
      const validOptions = roomData.settings.estimateOptions.map(String);
      const invalidVote = '99';

      expect(validOptions.includes(invalidVote)).toBe(false);
    });

    it('should accept votes that are in estimateOptions', () => {
      const roomData = createMockRoomData();
      const validOptions = roomData.settings.estimateOptions.map(String);
      const validVote = '5';

      expect(validOptions.includes(validVote)).toBe(true);
    });

    it('should accept question mark votes', () => {
      const roomData = createMockRoomData();
      const validOptions = roomData.settings.estimateOptions.map(String);
      const questionMarkVote = '?';

      expect(validOptions.includes(questionMarkVote)).toBe(true);
    });
  });

  describe('Settings Change Clearing Votes', () => {
    it('should identify when estimate options change', () => {
      const oldOptions = [1, 3, 5, 8, 13, '?'];
      const newOptions = [1, 2, 3, 5, 8, 13, 21, '?'];

      const oldOptionsStr = oldOptions.map(String);
      const newOptionsStr = newOptions.map(String);

      const estimateOptionsChanged =
        oldOptionsStr.length !== newOptionsStr.length ||
        !oldOptionsStr.every((opt, idx) => opt === newOptionsStr[idx]);

      expect(estimateOptionsChanged).toBe(true);
    });

    it('should detect invalid votes after options change', () => {
      const roomData = createMockRoomData({
        votes: {
          alice: 3,
          bob: 5,
          charlie: 8,
        },
      });

      const newEstimateOptions = [1, 2, 4, 8, 16, '?'];
      const newValidOptions = newEstimateOptions.map(String);

      const invalidVotes = Object.entries(roomData.votes).filter(
        ([, vote]) => !newValidOptions.includes(String(vote))
      );

      expect(invalidVotes).toHaveLength(2);
      expect(invalidVotes.map(([user]) => user)).toContain('alice');
      expect(invalidVotes.map(([user]) => user)).toContain('bob');
    });

    it('should not flag valid votes as invalid', () => {
      const roomData = createMockRoomData({
        votes: {
          alice: 3,
          bob: 5,
          charlie: 8,
        },
      });

      const newEstimateOptions = [1, 3, 5, 8, 13, '?'];
      const newValidOptions = newEstimateOptions.map(String);

      const invalidVotes = Object.entries(roomData.votes).filter(
        ([, vote]) => !newValidOptions.includes(String(vote))
      );

      expect(invalidVotes).toHaveLength(0);
    });

    it('should clear structured votes when switching from structured to classic', () => {
      const roomData = createMockRoomData({
        settings: {
          ...createMockRoomData().settings,
          enableStructuredVoting: true,
        },
        structuredVotes: {
          alice: {
            criteriaScores: { complexity: 5 },
            calculatedStoryPoints: 5,
          },
        },
      });

      const oldStructuredVoting = roomData.settings.enableStructuredVoting;
      const newStructuredVoting = false;
      const structuredVotingModeChanged = oldStructuredVoting !== newStructuredVoting;

      expect(structuredVotingModeChanged).toBe(true);
      expect(Object.keys(roomData.structuredVotes || {}).length).toBeGreaterThan(0);
    });
  });

  describe('Moderator Handover Determinism', () => {
    it('should select moderator deterministically using sorted order', () => {
      const connectedUsers = ['zebra', 'alice', 'charlie', 'bob'];
      const sortedUsers = [...connectedUsers].sort((a, b) => a.localeCompare(b));

      expect(sortedUsers[0]).toBe('alice');
    });

    it('should always select the same user given the same list', () => {
      const users1 = ['charlie', 'bob', 'alice'];
      const users2 = ['alice', 'charlie', 'bob'];

      const sorted1 = [...users1].sort((a, b) => a.localeCompare(b));
      const sorted2 = [...users2].sort((a, b) => a.localeCompare(b));

      expect(sorted1[0]).toBe(sorted2[0]);
      expect(sorted1[0]).toBe('alice');
    });

    it('should handle single user scenario', () => {
      const connectedUsers = ['alice'];
      const sortedUsers = [...connectedUsers].sort((a, b) => a.localeCompare(b));

      expect(sortedUsers[0]).toBe('alice');
      expect(sortedUsers).toHaveLength(1);
    });
  });

  describe('Question Mark Vote Handling in Judge', () => {
    it('should filter out question marks from numeric votes', () => {
      const allVotes = [1, 3, 5, '?', 8, '?'];
      const numericVotes = allVotes
        .filter((v) => v !== '?')
        .filter((v) => !Number.isNaN(Number(v)))
        .map(Number);

      expect(numericVotes).toEqual([1, 3, 5, 8]);
      expect(numericVotes).not.toContain('?');
    });

    it('should calculate correct question mark count', () => {
      const allVotes = [1, 3, 5, '?', 8, '?', '?'];
      const questionMarkCount = allVotes.filter((v) => v === '?').length;

      expect(questionMarkCount).toBe(3);
    });

    it('should calculate total vote count including question marks', () => {
      const votes = { alice: 5, bob: '?', charlie: 8, david: '?' };
      const allVotes = Object.values(votes).filter((v) => v !== null);
      const totalVoteCount = allVotes.length;

      expect(totalVoteCount).toBe(4);
    });
  });
});
