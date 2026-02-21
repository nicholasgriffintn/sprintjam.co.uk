import { describe, it, expect } from "vitest";
import type { VotingCompletion } from "@sprintjam/types";
import { applyRoomUpdate } from "./room";
import type { RoomData, WebSocketMessage } from "../types";

const createBaseRoom = (): RoomData => ({
  key: "test-room",
  users: ["Alice", "Bob"],
  votes: {},
  showVotes: false,
  moderator: "Alice",
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
    judgeAlgorithm: "smartConsensus" as const,
  },
});

describe("applyRoomUpdate", () => {
  describe("vote messages", () => {
    it("updates votingCompletion when included in vote message", () => {
      const room = createBaseRoom();
      const votingCompletion: VotingCompletion = {
        allVotesComplete: false,
        completedCount: 1,
        totalCount: 2,
        incompleteUsers: ["Bob"],
      };

      const message: WebSocketMessage = {
        type: "vote",
        user: "Alice",
        vote: 5,
        votingCompletion,
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votingCompletion).toEqual(votingCompletion);
    });

    it("preserves existing votingCompletion when not included in message", () => {
      const existingCompletion: VotingCompletion = {
        allVotesComplete: false,
        completedCount: 0,
        totalCount: 2,
        incompleteUsers: ["Alice", "Bob"],
      };

      const room = createBaseRoom();
      room.votingCompletion = existingCompletion;

      const message: WebSocketMessage = {
        type: "vote",
        user: "Alice",
        vote: 5,
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votingCompletion).toEqual(existingCompletion);
    });

    it("updates votingCompletion with structured vote", () => {
      const votingCompletion: VotingCompletion = {
        allVotesComplete: false,
        completedCount: 0,
        totalCount: 2,
        incompleteUsers: ["Alice", "Bob"],
      };

      const room = createBaseRoom();
      const message: WebSocketMessage = {
        type: "vote",
        user: "Alice",
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

  describe("resetVotes messages", () => {
    it("updates votingCompletion when resetting votes", () => {
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
        incompleteUsers: ["Alice", "Bob"],
      };

      const message: WebSocketMessage = {
        type: "resetVotes",
        votingCompletion: newCompletion,
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votes).toEqual({});
      expect(result?.votingCompletion).toEqual(newCompletion);
    });

    it("clears votingCompletion when not included in reset message", () => {
      const room = createBaseRoom();
      room.votes = { Alice: 5 };
      room.votingCompletion = {
        allVotesComplete: false,
        completedCount: 1,
        totalCount: 2,
        incompleteUsers: ["Bob"],
      };

      const message: WebSocketMessage = {
        type: "resetVotes",
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.votes).toEqual({});
      expect(result?.votingCompletion).toBeUndefined();
    });

    it("updates roundHistory when included in reset message", () => {
      const room = createBaseRoom();
      room.roundHistory = [
        {
          id: "round-old",
          type: "reset",
          endedAt: 1,
          votes: [{ userName: "Alice", vote: 3, votedAt: 1 }],
        },
      ];

      const message: WebSocketMessage = {
        type: "resetVotes",
        roundHistory: [
          {
            id: "round-new",
            type: "reset",
            endedAt: 2,
            votes: [{ userName: "Bob", vote: 5, votedAt: 2 }],
          },
        ],
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.roundHistory).toEqual(message.roundHistory);
    });
  });

  describe("nextTicket messages", () => {
    it("updates roundHistory when included in nextTicket message", () => {
      const room = createBaseRoom();
      room.roundHistory = [
        {
          id: "round-old",
          type: "reset",
          endedAt: 1,
          votes: [{ userName: "Alice", vote: 3, votedAt: 1 }],
        },
      ];

      const message: WebSocketMessage = {
        type: "nextTicket",
        ticket: {
          id: 1,
          ticketId: "ABC-1",
          status: "in_progress",
          createdAt: Date.now(),
          ordinal: 1,
          externalService: "none",
        },
        queue: [],
        roundHistory: [
          {
            id: "round-new",
            type: "next_ticket",
            endedAt: 2,
            votes: [{ userName: "Bob", vote: 5, votedAt: 2 }],
          },
        ],
      };

      const result = applyRoomUpdate(room, message);

      expect(result?.roundHistory).toEqual(message.roundHistory);
    });
  });
  describe("game messages", () => {
    it("stores game session when game starts", () => {
      const room = createBaseRoom();
      const message: WebSocketMessage = {
        type: "gameStarted",
        startedBy: "Alice",
        gameSession: {
          type: "emoji-story",
          startedBy: "Alice",
          startedAt: Date.now(),
          round: 1,
          status: "active",
          participants: ["Alice", "Bob"],
          leaderboard: { Alice: 0, Bob: 0 },
          moves: [],
          events: [],
        },
      };

      const result = applyRoomUpdate(room, message);
      expect(result?.gameSession?.type).toBe("emoji-story");
    });

    it("stores clueboard blocker secret for the current round", () => {
      const room = createBaseRoom();
      room.gameSession = {
        type: "clueboard",
        startedBy: "Alice",
        startedAt: Date.now(),
        round: 2,
        status: "active",
        participants: ["Alice", "Bob"],
        leaderboard: { Alice: 0, Bob: 0 },
        moves: [],
        events: [],
      };

      const message: WebSocketMessage = {
        type: "clueboardSecret",
        round: 2,
        blockerIndex: 5,
      };

      const result = applyRoomUpdate(room, message);
      expect(result?.gameSession?.codenamesKnownBlockerIndex).toBe(5);
    });
  });
});
