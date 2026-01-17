import { describe, it, expect } from "vitest";

import { validateRoundIngestPayload, LIMITS } from "./validation";

describe("validateRoundIngestPayload", () => {
  const validPayload = {
    roomKey: "room-123",
    roundId: "round-456",
    votes: [
      { userName: "alice", vote: "5", votedAt: 1700000000 },
      { userName: "bob", vote: "3", votedAt: 1700000001 },
    ],
    roundEndedAt: 1700000010,
    type: "reset" as const,
  };

  describe("required fields", () => {
    it("accepts valid payload with all required fields", () => {
      const result = validateRoundIngestPayload(validPayload);
      expect(result.valid).toBe(true);
    });

    it("rejects null body", () => {
      const result = validateRoundIngestPayload(null);
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "Request body must be an object");
    });

    it("rejects non-object body", () => {
      const result = validateRoundIngestPayload("string");
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "Request body must be an object");
    });

    it("rejects missing roomKey", () => {
      const { roomKey, ...payload } = validPayload;
      const result = validateRoundIngestPayload(payload);
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "Missing required fields");
    });

    it("rejects missing roundId", () => {
      const { roundId, ...payload } = validPayload;
      const result = validateRoundIngestPayload(payload);
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "Missing required fields");
    });

    it("rejects missing votes", () => {
      const { votes, ...payload } = validPayload;
      const result = validateRoundIngestPayload(payload);
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "Missing required fields");
    });

    it("rejects missing roundEndedAt", () => {
      const { roundEndedAt, ...payload } = validPayload;
      const result = validateRoundIngestPayload(payload);
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "Missing required fields");
    });
  });

  describe("roomKey validation", () => {
    it("rejects non-string roomKey", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roomKey: 123,
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `roomKey must be a string with max ${LIMITS.MAX_ROOM_KEY_LENGTH} characters`,
      );
    });

    it("rejects roomKey exceeding max length", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roomKey: "a".repeat(LIMITS.MAX_ROOM_KEY_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `roomKey must be a string with max ${LIMITS.MAX_ROOM_KEY_LENGTH} characters`,
      );
    });

    it("accepts roomKey at max length", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roomKey: "a".repeat(LIMITS.MAX_ROOM_KEY_LENGTH),
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("roundId validation", () => {
    it("rejects non-string roundId", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roundId: 123,
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `roundId must be a string with max ${LIMITS.MAX_ROUND_ID_LENGTH} characters`,
      );
    });

    it("rejects roundId exceeding max length", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roundId: "a".repeat(LIMITS.MAX_ROUND_ID_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("ticketId validation", () => {
    it("accepts valid ticketId", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        ticketId: "TICKET-123",
      });
      expect(result.valid).toBe(true);
    });

    it("accepts undefined ticketId", () => {
      const result = validateRoundIngestPayload(validPayload);
      expect(result.valid).toBe(true);
    });

    it("rejects non-string ticketId", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        ticketId: 123,
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `ticketId must be a string with max ${LIMITS.MAX_TICKET_ID_LENGTH} characters`,
      );
    });

    it("rejects ticketId exceeding max length", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        ticketId: "a".repeat(LIMITS.MAX_TICKET_ID_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("roundEndedAt validation", () => {
    it("rejects non-number roundEndedAt", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roundEndedAt: "1700000010",
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        "roundEndedAt must be a positive number",
      );
    });

    it("rejects negative roundEndedAt", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roundEndedAt: -1,
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        "roundEndedAt must be a positive number",
      );
    });

    it("accepts zero roundEndedAt", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        roundEndedAt: 0,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("votes array validation", () => {
    it("rejects non-array votes", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: "not-an-array",
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "votes must be an array");
    });

    it("accepts empty votes array", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [],
      });
      expect(result.valid).toBe(true);
    });

    it("rejects votes array exceeding max length", () => {
      const votes = Array.from(
        { length: LIMITS.MAX_VOTES_PER_ROUND + 1 },
        (_, i) => ({
          userName: `user${i}`,
          vote: "5",
          votedAt: 1700000000,
        }),
      );
      const result = validateRoundIngestPayload({ ...validPayload, votes });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `Maximum ${LIMITS.MAX_VOTES_PER_ROUND} votes per round`,
      );
    });

    it("accepts votes array at max length", () => {
      const votes = Array.from(
        { length: LIMITS.MAX_VOTES_PER_ROUND },
        (_, i) => ({
          userName: `user${i}`,
          vote: "5",
          votedAt: 1700000000,
        }),
      );
      const result = validateRoundIngestPayload({ ...validPayload, votes });
      expect(result.valid).toBe(true);
    });
  });

  describe("individual vote validation", () => {
    it("rejects non-object vote", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: ["not-an-object"],
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "votes[0] must be an object");
    });

    it("rejects null vote", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [null],
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty("error", "votes[0] must be an object");
    });

    it("rejects empty userName", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [{ userName: "", vote: "5", votedAt: 1700000000 }],
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `votes[0].userName must be a non-empty string with max ${LIMITS.MAX_USERNAME_LENGTH} characters`,
      );
    });

    it("rejects userName exceeding max length", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [
          {
            userName: "a".repeat(LIMITS.MAX_USERNAME_LENGTH + 1),
            vote: "5",
            votedAt: 1700000000,
          },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("rejects empty vote value", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [{ userName: "alice", vote: "", votedAt: 1700000000 }],
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `votes[0].vote must be a non-empty string with max ${LIMITS.MAX_VOTE_LENGTH} characters`,
      );
    });

    it("rejects vote value exceeding max length", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [
          {
            userName: "alice",
            vote: "a".repeat(LIMITS.MAX_VOTE_LENGTH + 1),
            votedAt: 1700000000,
          },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("rejects non-number votedAt", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [{ userName: "alice", vote: "5", votedAt: "1700000000" }],
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        "votes[0].votedAt must be a positive number",
      );
    });

    it("rejects negative votedAt", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [{ userName: "alice", vote: "5", votedAt: -1 }],
      });
      expect(result.valid).toBe(false);
    });

    it("accepts valid structuredVote", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [
          {
            userName: "alice",
            vote: "5",
            votedAt: 1700000000,
            structuredVote: { complexity: "high", confidence: 0.9 },
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("rejects structuredVote exceeding max size", () => {
      const largeObject = { data: "x".repeat(LIMITS.MAX_STRUCTURED_VOTE_SIZE) };
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [
          {
            userName: "alice",
            vote: "5",
            votedAt: 1700000000,
            structuredVote: largeObject,
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `votes[0].structuredVote exceeds max size of ${LIMITS.MAX_STRUCTURED_VOTE_SIZE} bytes`,
      );
    });

    it("reports correct index for invalid vote in array", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        votes: [
          { userName: "alice", vote: "5", votedAt: 1700000000 },
          { userName: "bob", vote: "3", votedAt: 1700000001 },
          { userName: "", vote: "5", votedAt: 1700000002 },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `votes[2].userName must be a non-empty string with max ${LIMITS.MAX_USERNAME_LENGTH} characters`,
      );
    });
  });

  describe("judgeScore validation", () => {
    it("accepts valid judgeScore", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        judgeScore: "5",
      });
      expect(result.valid).toBe(true);
    });

    it("accepts undefined judgeScore", () => {
      const result = validateRoundIngestPayload(validPayload);
      expect(result.valid).toBe(true);
    });

    it("rejects non-string judgeScore", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        judgeScore: 5,
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `judgeScore must be a string with max ${LIMITS.MAX_JUDGE_SCORE_LENGTH} characters`,
      );
    });

    it("rejects judgeScore exceeding max length", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        judgeScore: "a".repeat(LIMITS.MAX_JUDGE_SCORE_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("judgeMetadata validation", () => {
    it("accepts valid judgeMetadata", () => {
      const result = validateRoundIngestPayload({
        ...validPayload,
        judgeMetadata: { confidence: 0.9, reasoning: "High consensus" },
      });
      expect(result.valid).toBe(true);
    });

    it("accepts undefined judgeMetadata", () => {
      const result = validateRoundIngestPayload(validPayload);
      expect(result.valid).toBe(true);
    });

    it("rejects judgeMetadata exceeding max size", () => {
      const largeMetadata = {
        data: "x".repeat(LIMITS.MAX_JUDGE_METADATA_SIZE),
      };
      const result = validateRoundIngestPayload({
        ...validPayload,
        judgeMetadata: largeMetadata,
      });
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty(
        "error",
        `judgeMetadata exceeds max size of ${LIMITS.MAX_JUDGE_METADATA_SIZE} bytes`,
      );
    });
  });

  describe("complete payload validation", () => {
    it("accepts complete valid payload with all optional fields", () => {
      const result = validateRoundIngestPayload({
        roomKey: "room-123",
        roundId: "round-456",
        ticketId: "TICKET-789",
        votes: [
          {
            userName: "alice",
            vote: "5",
            votedAt: 1700000000,
            structuredVote: { complexity: "high" },
          },
          { userName: "bob", vote: "3", votedAt: 1700000001 },
        ],
        judgeScore: "5",
        judgeMetadata: { confidence: 0.9 },
        roundEndedAt: 1700000010,
        type: "reset" as const,
      });
      expect(result.valid).toBe(true);
    });
  });
});
