import { describe, expect, it } from "vitest";

import type { RoomData, RoomSettings } from "@/types";
import { getGuidancePhase, getVoteSpreadSummary } from "./room-guidance";

const buildSettings = (
  overrides: Partial<RoomSettings> = {},
): RoomSettings => ({
  estimateOptions: [1, 2, 3, 5, 8, 13, "❓"],
  allowOthersToShowEstimates: false,
  allowOthersToDeleteEstimates: false,
  showTimer: true,
  showUserPresence: false,
  showAverage: true,
  showMedian: true,
  showTopVotes: true,
  topVotesCount: 4,
  anonymousVotes: false,
  enableJudge: true,
  judgeAlgorithm: "smartConsensus",
  extraVoteOptions: [
    {
      id: "unsure",
      label: "Unsure",
      value: "❓",
      aliases: ["?"],
      enabled: true,
    },
  ],
  ...overrides,
});

const buildRoom = (overrides: Partial<RoomData> = {}): RoomData => ({
  key: "ROOM1",
  users: ["Ava", "Ben"],
  votes: {},
  structuredVotes: {},
  showVotes: false,
  moderator: "Ava",
  connectedUsers: {},
  judgeScore: null,
  settings: buildSettings(),
  ...overrides,
});

describe("room guidance helpers", () => {
  it("derives phases for pre-vote and voting states", () => {
    const lobbyRoom = buildRoom();
    const lobbySummary = getVoteSpreadSummary(lobbyRoom);
    expect(getGuidancePhase(lobbyRoom, lobbySummary)).toBe("preVote");

    const votingRoom = buildRoom({
      votes: { Ava: 3 },
      users: ["Ava", "Ben"],
    });
    const votingSummary = getVoteSpreadSummary(votingRoom);
    expect(getGuidancePhase(votingRoom, votingSummary)).toBe("voting");
  });

  it("flags wide spread when revealed votes diverge", () => {
    const room = buildRoom({
      showVotes: true,
      votes: { Ava: 3, Ben: 13 },
    });
    const summary = getVoteSpreadSummary(room);
    expect(summary.isWideSpread).toBe(true);
    expect(getGuidancePhase(room, summary)).toBe("revealedWideSpread");
  });

  it("counts unknown votes from extra options", () => {
    const room = buildRoom({
      votes: { Ava: "❓", Ben: "?" },
    });
    const summary = getVoteSpreadSummary(room);
    expect(summary.unknownVoteCount).toBe(2);
  });

  it("treats low judge confidence as wide spread in structured voting", () => {
    const room = buildRoom({
      showVotes: true,
      settings: buildSettings({ enableStructuredVoting: true }),
      judgeMetadata: {
        confidence: "low",
        needsDiscussion: true,
        reasoning: "",
        algorithm: "smartConsensus",
      },
    });
    const summary = getVoteSpreadSummary(room);
    expect(summary.isWideSpread).toBe(true);
  });
});
