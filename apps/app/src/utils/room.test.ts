import { describe, it, expect } from 'vitest';
import { applyRoomUpdate } from './room';
import type { RoomData, WebSocketMessage, VotingCompletion } from '../types';

const createBaseRoom = (): RoomData => ({
  key: 'test-room',
  users: ['Alice', 'Bob'],
  votes: {},
  showVotes: false,
  moderator: 'Alice',
  connectedUsers: { Alice: true, Bob: true },
  judgeScore: null,
  settings: {
    estimateOptions: [1, 2, 3, 5, 8],
    allowOthersToShowEstimates: false,
    allowOthersToDeleteEstimates: false,
    showTimer: false,
    showUserPresence: false,
    showAverage: false,
    showMedian: false,
    showTopVotes: false,
    topVotesCount: 3,
    anonymousVotes: false,
    enableJudge: false,
    judgeAlgorithm: 'smartConsensus' as const,
  },
});

describe('applyRoomUpdate', () => {
  describe('vote messages', () => {
    it('updates votingCompletion when included in vote message', () => {
      const room = createBaseRoom();
      const votingCompletion: VotingCompletion = {
        allVotesComplete: false,
        completedCount: 1,
        totalCount: 2,
        incompleteUsers: ['Bob'],
      };

      const message: WebSocketMessage = {
        type: 'vote',
        user: 'Alice',
        vote: 5,
        votingCompletion,
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votingCompletion).toEqual(votingCompletion);
    });

    it('preserves existing votingCompletion when not included in message', () => {
      const existingCompletion: VotingCompletion = {
        allVotesComplete: false,
        completedCount: 0,
        totalCount: 2,
        incompleteUsers: ['Alice', 'Bob'],
      };

      const room = createBaseRoom();
      room.votingCompletion = existingCompletion;

      const message: WebSocketMessage = {
        type: 'vote',
        user: 'Alice',
        vote: 5,
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votingCompletion).toEqual(existingCompletion);
    });

    it('updates votingCompletion with structured vote', () => {
      const votingCompletion: VotingCompletion = {
        allVotesComplete: false,
        completedCount: 0,
        totalCount: 2,
        incompleteUsers: ['Alice', 'Bob'],
      };

      const room = createBaseRoom();
      const message: WebSocketMessage = {
        type: 'vote',
        user: 'Alice',
        vote: 5,
        structuredVote: {
          criteriaScores: { complexity: 2 },
          calculatedStoryPoints: 5,
        },
        votingCompletion,
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votingCompletion).toEqual(votingCompletion);
      expect(result?.structuredVotes?.Alice).toBeDefined();
    });
  });

  describe('resetVotes messages', () => {
    it('updates votingCompletion when resetting votes', () => {
      const room = createBaseRoom();
      room.votes = { Alice: 5, Bob: 3 };
      room.votingCompletion = {
        allVotesComplete: true,
        completedCount: 2,
        totalCount: 2,
        incompleteUsers: [],
      };

      const newCompletion: VotingCompletion = {
        allVotesComplete: false,
        completedCount: 0,
        totalCount: 2,
        incompleteUsers: ['Alice', 'Bob'],
      };

      const message: WebSocketMessage = {
        type: 'resetVotes',
        votingCompletion: newCompletion,
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votes).toEqual({});
      expect(result?.votingCompletion).toEqual(newCompletion);
    });

    it('clears votingCompletion when not included in reset message', () => {
      const room = createBaseRoom();
      room.votes = { Alice: 5 };
      room.votingCompletion = {
        allVotesComplete: false,
        completedCount: 1,
        totalCount: 2,
        incompleteUsers: ['Bob'],
      };

      const message: WebSocketMessage = {
        type: 'resetVotes',
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votes).toEqual({});
      expect(result?.votingCompletion).toBeUndefined();
    });
  });
});
