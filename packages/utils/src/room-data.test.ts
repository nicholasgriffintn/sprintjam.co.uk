import { describe, it, expect, beforeEach } from "vitest";
import type { RoomData, RoomSettings } from '@sprintjam/types';
import { JudgeAlgorithm } from '@sprintjam/types';

import {
  assignUserAvatar,
  markUserConnection,
  ensureConnectedUsers,
  findCanonicalUserName,
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
});
