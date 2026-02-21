import { describe, it, expect, beforeEach } from "vitest";
import type { RoomData, RoomSettings } from '@sprintjam/types';
import { JudgeAlgorithm } from '@sprintjam/types';

import {
  assignUserAvatar,
  markUserConnection,
  ensureConnectedUsers,
  findCanonicalUserName,
  calculateVotingCompletion,
  sanitizeRoomData,
} from './room-data';

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
  key: "ROOM",
  users: [],
  votes: {},
  connectedUsers: {},
  showVotes: false,
  moderator: "mod",
  settings: baseSettings,
  ...overrides,
});

describe("room-data helpers", () => {
  describe("markUserConnection", () => {
    let room: RoomData;

    beforeEach(() => {
      room = createRoom({
        users: ["Alice"],
        connectedUsers: { Alice: false },
      });
    });

    it("reuses canonical casing and does not duplicate users", () => {
      markUserConnection(room, "alice  ", true);

      expect(room.users).toEqual(["Alice"]);
      expect(room.connectedUsers["Alice"]).toBe(true);
    });

    it("adds trimmed user when not present", () => {
      markUserConnection(room, "  Bob ", true);

      expect(room.users).toEqual(["Alice", "Bob"]);
      expect(room.connectedUsers["Bob"]).toBe(true);
    });

    it("initializes connectedUsers when missing", () => {
      const freshRoom = createRoom({ users: ["Casey"], connectedUsers: {} });

      markUserConnection(freshRoom, "casey", true);

      expect(ensureConnectedUsers(freshRoom)["Casey"]).toBe(true);
    });
  });

  describe("assignUserAvatar", () => {
    let room: RoomData;

    beforeEach(() => {
      room = createRoom({
        users: ["Alice"],
        connectedUsers: { Alice: true },
        userAvatars: {},
      });
    });

    it("reuses canonical casing when setting avatar", () => {
      assignUserAvatar(room, "alice", "cat");

      expect(room.userAvatars?.Alice).toBe("cat");
      expect(Object.keys(room.userAvatars ?? {})).toEqual(["Alice"]);
    });

    it("removes avatar when value is empty", () => {
      room.userAvatars = { Alice: "cat" };

      assignUserAvatar(room, "ALICE");

      expect(room.userAvatars?.Alice).toBeUndefined();
    });
  });

  describe("spectator mode", () => {
    describe("markUserConnection", () => {
      it("does not add spectator to users array on reconnect", () => {
        const room = createRoom({
          users: ["Alice"],
          spectators: ["Bob"],
          connectedUsers: { Alice: false, Bob: false },
        });

        markUserConnection(room, "bob", true);

        expect(room.users).toEqual(["Alice"]);
        expect(room.spectators).toEqual(["Bob"]);
        expect(room.connectedUsers["Bob"]).toBe(true);
      });

      it("adds new user to users array if not in spectators", () => {
        const room = createRoom({
          users: ["Alice"],
          spectators: ["Bob"],
          connectedUsers: {},
        });

        markUserConnection(room, "Charlie", true);

        expect(room.users).toEqual(["Alice", "Charlie"]);
        expect(room.spectators).toEqual(["Bob"]);
        expect(room.connectedUsers["Charlie"]).toBe(true);
      });

      it("does not duplicate user already in users array", () => {
        const room = createRoom({
          users: ["Alice"],
          spectators: ["Bob"],
          connectedUsers: { Alice: false },
        });

        markUserConnection(room, "alice", true);

        expect(room.users).toEqual(["Alice"]);
        expect(room.spectators).toEqual(["Bob"]);
        expect(room.connectedUsers["Alice"]).toBe(true);
      });
    });

    describe("findCanonicalUserName", () => {
      it("finds user in users array", () => {
        const room = createRoom({
          users: ["Alice", "Bob"],
          spectators: ["Charlie"],
        });

        const result = findCanonicalUserName(room, "alice");

        expect(result).toBe("Alice");
      });

      it("finds user in spectators array", () => {
        const room = createRoom({
          users: ["Alice", "Bob"],
          spectators: ["Charlie"],
        });

        const result = findCanonicalUserName(room, "charlie");

        expect(result).toBe("Charlie");
      });

      it("returns undefined if user not found", () => {
        const room = createRoom({
          users: ["Alice"],
          spectators: ["Bob"],
        });

        const result = findCanonicalUserName(room, "nonexistent");

        expect(result).toBeUndefined();
      });

      it("handles case-insensitive matching", () => {
        const room = createRoom({
          users: ["Alice"],
          spectators: ["Bob"],
        });

        expect(findCanonicalUserName(room, "ALICE")).toBe("Alice");
        expect(findCanonicalUserName(room, "BOB")).toBe("Bob");
      });

      it("trims whitespace", () => {
        const room = createRoom({
          users: ["Alice"],
          spectators: ["Bob"],
        });

        expect(findCanonicalUserName(room, "  alice  ")).toBe("Alice");
        expect(findCanonicalUserName(room, "  bob  ")).toBe("Bob");
      });

      it("handles empty spectators array", () => {
        const room = createRoom({
          users: ["Alice"],
          spectators: undefined,
        });

        expect(findCanonicalUserName(room, "alice")).toBe("Alice");
        expect(findCanonicalUserName(room, "bob")).toBeUndefined();
      });
    });
  });

  describe("sanitizeRoomData", () => {
    it("removes passcode hash and hidden game state from exposed room data", () => {
      const room = createRoom({
        passcodeHash: {
          hash: "h",
          salt: "s",
          iterations: 1,
        },
        gameSession: {
          type: "guess-the-number",
          startedBy: "mod",
          startedAt: Date.now(),
          round: 1,
          status: "active",
          participants: ["mod"],
          leaderboard: { mod: 0 },
          moves: [],
          events: [],
          numberTarget: 12,
          codenamesTargetIndices: [1, 2, 3],
          codenamesAssassinIndex: 7,
        },
      });

      const sanitized = sanitizeRoomData(room);

      expect(sanitized.passcodeHash).toBeUndefined();
      expect(sanitized.gameSession?.numberTarget).toBeUndefined();
      expect(sanitized.gameSession?.codenamesTargetIndices).toBeUndefined();
      expect(sanitized.gameSession?.codenamesAssassinIndex).toBeUndefined();
      expect(room.gameSession?.numberTarget).toBe(12);
      expect(room.gameSession?.codenamesTargetIndices).toEqual([1, 2, 3]);
      expect(room.gameSession?.codenamesAssassinIndex).toBe(7);
    });
  });

  describe('calculateVotingCompletion', () => {
    describe('non-structured voting', () => {
      it('returns all complete when all users have voted', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: 5, Bob: 3 },
        });

        const result = calculateVotingCompletion(room);

        expect(result).toEqual({
          allVotesComplete: true,
          completedCount: 2,
          totalCount: 2,
          incompleteUsers: [],
        });
      });

      it('returns incomplete when some users have not voted', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: 5 },
        });

        const result = calculateVotingCompletion(room);

        expect(result).toEqual({
          allVotesComplete: false,
          completedCount: 1,
          totalCount: 2,
          incompleteUsers: ['Bob'],
        });
      });

      it('returns incomplete when no users have voted', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: {},
        });

        const result = calculateVotingCompletion(room);

        expect(result).toEqual({
          allVotesComplete: false,
          completedCount: 0,
          totalCount: 2,
          incompleteUsers: ['Alice', 'Bob'],
        });
      });
    });

    describe('structured voting', () => {
      it('returns complete when all users have complete structured votes', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: 5, Bob: 3 },
          structuredVotes: {
            Alice: {
              criteriaScores: {
                complexity: 2,
                confidence: 3,
                volume: 1,
                unknowns: 0,
              },
              calculatedStoryPoints: 5,
            },
            Bob: {
              criteriaScores: {
                complexity: 1,
                confidence: 4,
                volume: 1,
                unknowns: 0,
              },
              calculatedStoryPoints: 3,
            },
          },
          settings: {
            ...baseSettings,
            enableStructuredVoting: true,
            votingCriteria: [
              {
                id: 'complexity',
                name: 'Complexity',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'confidence',
                name: 'Confidence',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'volume',
                name: 'Volume',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'unknowns',
                name: 'Unknowns',
                description: '',
                minScore: 0,
                maxScore: 2,
              },
            ],
          },
        });

        const result = calculateVotingCompletion(room);

        expect(result.allVotesComplete).toBe(true);
        expect(result.completedCount).toBe(2);
        expect(result.totalCount).toBe(2);
      });

      it('returns incomplete when user has incomplete structured vote', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: 5, Bob: 3 },
          structuredVotes: {
            Alice: {
              criteriaScores: {
                complexity: 2,
                confidence: 3,
                volume: 1,
                unknowns: 0,
              },
              calculatedStoryPoints: 5,
            },
            Bob: {
              criteriaScores: { complexity: 1, confidence: 4 },
              calculatedStoryPoints: 3,
            },
          },
          settings: {
            ...baseSettings,
            enableStructuredVoting: true,
            votingCriteria: [
              {
                id: 'complexity',
                name: 'Complexity',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'confidence',
                name: 'Confidence',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'volume',
                name: 'Volume',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'unknowns',
                name: 'Unknowns',
                description: '',
                minScore: 0,
                maxScore: 2,
              },
            ],
          },
        });

        const result = calculateVotingCompletion(room);

        expect(result.allVotesComplete).toBe(false);
        expect(result.completedCount).toBe(1);
        expect(result.incompleteUsers).toEqual(['Bob']);
      });

      it('treats extra vote options as complete', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: '?', Bob: 3 },
          structuredVotes: {
            Bob: {
              criteriaScores: {
                complexity: 1,
                confidence: 4,
                volume: 1,
                unknowns: 0,
              },
              calculatedStoryPoints: 3,
            },
          },
          settings: {
            ...baseSettings,
            estimateOptions: [1, 2, 3, 5, 8, '?'],
            enableStructuredVoting: true,
            extraVoteOptions: [
              { id: 'unsure', label: 'Unsure', value: '?', enabled: true },
            ],
            votingCriteria: [
              {
                id: 'complexity',
                name: 'Complexity',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'confidence',
                name: 'Confidence',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'volume',
                name: 'Volume',
                description: '',
                minScore: 0,
                maxScore: 4,
              },
              {
                id: 'unknowns',
                name: 'Unknowns',
                description: '',
                minScore: 0,
                maxScore: 2,
              },
            ],
          },
        });

        const result = calculateVotingCompletion(room);

        expect(result.allVotesComplete).toBe(true);
        expect(result.completedCount).toBe(2);
      });
    });

    describe('privacy settings', () => {
      it('hides incomplete user names when anonymousVotes is enabled', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: 5 },
          settings: {
            ...baseSettings,
            anonymousVotes: true,
          },
        });

        const result = calculateVotingCompletion(room);

        expect(result.incompleteUsers).toBeUndefined();
        expect(result.completedCount).toBe(1);
      });

      it('hides incomplete user names when hideParticipantNames is enabled', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: 5 },
          settings: {
            ...baseSettings,
            hideParticipantNames: true,
          },
        });

        const result = calculateVotingCompletion(room);

        expect(result.incompleteUsers).toBeUndefined();
      });

      it('shows incomplete user names when privacy is disabled', () => {
        const room = createRoom({
          users: ['Alice', 'Bob'],
          votes: { Alice: 5 },
        });

        const result = calculateVotingCompletion(room);

        expect(result.incompleteUsers).toEqual(['Bob']);
      });
    });
  });
});
