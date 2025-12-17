import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { RoomData, RoomSettings, RoomStats } from "@/types";
import { JudgeResult } from "./JudgeResult";

function buildSettings(overrides: Partial<RoomSettings> = {}): RoomSettings {
  const base: RoomSettings = {
    estimateOptions: ["1", "2", "3", "5", "8"],
    voteOptionsMetadata: undefined,
    allowOthersToShowEstimates: false,
    allowOthersToDeleteEstimates: false,
    allowOthersToManageQueue: false,
    showTimer: true,
    showUserPresence: false,
    showAverage: true,
    showMedian: true,
    showTopVotes: true,
    topVotesCount: 3,
    anonymousVotes: false,
    enableJudge: true,
    judgeAlgorithm: "smartConsensus",
    hideParticipantNames: false,
    externalService: "none",
    enableStructuredVoting: false,
    votingCriteria: undefined,
    autoSyncEstimates: true,
    resultsDisplay: undefined,
    structuredVotingDisplay: undefined,
    autoHandoverModerator: false,
    enableStrudelPlayer: false,
    strudelAutoGenerate: false,
    enableTicketQueue: false,
  } as RoomSettings;

  return {
    ...base,
    ...overrides,
  };
}

function buildRoomData(overrides: Partial<RoomData> = {}): RoomData {
  const baseSettings = buildSettings();
  return {
    key: "room",
    users: ["Alice", "Bob"],
    votes: { Alice: "5", Bob: "?" },
    structuredVotes: undefined,
    showVotes: true,
    moderator: "Alice",
    connectedUsers: { Alice: true, Bob: true },
    judgeScore: null,
    settings: baseSettings,
    judgeMetadata: undefined,
    userAvatars: undefined,
    currentStrudelCode: undefined,
    currentStrudelGenerationId: undefined,
    strudelPhase: undefined,
    strudelIsPlaying: undefined,
    currentTicket: undefined,
    ticketQueue: undefined,
    timerState: undefined,
    ...overrides,
  };
}

function buildStats(overrides: Partial<RoomStats> = {}): RoomStats {
  return {
    avg: "5.0",
    mode: "5",
    distribution: { "5": 1 } as Record<string | number, number>,
    totalVotes: 1,
    votedUsers: 2,
    totalUsers: 2,
    judgeScore: null,
    ...overrides,
  } as RoomStats;
}

describe("JudgeResult", () => {
  it("shows a waiting message before the judge metadata arrives", () => {
    const roomData = buildRoomData();
    const stats = buildStats();

    const html = renderToStaticMarkup(
      <JudgeResult
        roomData={roomData}
        stats={stats}
        showJudgeAnimation={false}
      />,
    );

    expect(html).toContain(
      "Waiting for the judge to evaluate the revealed votes",
    );
  });

  it("renders participation context and structured criteria when available", () => {
    const structuredSettings = buildSettings({
      enableStructuredVoting: true,
      votingCriteria: [
        {
          id: "complexity",
          name: "Complexity",
          description: "",
          minScore: 0,
          maxScore: 4,
        },
        {
          id: "volume",
          name: "Volume",
          description: "",
          minScore: 0,
          maxScore: 4,
        },
      ],
    });

    const roomData = buildRoomData({
      settings: structuredSettings,
      judgeScore: 5,
      judgeMetadata: {
        confidence: "high",
        needsDiscussion: false,
        reasoning: "Strong consensus",
        algorithm: "smartConsensus",
        questionMarkCount: 1,
        numericVoteCount: 3,
        totalVoteCount: 4,
      },
    });

    const stats = buildStats({ judgeScore: 5 });

    const html = renderToStaticMarkup(
      <JudgeResult
        roomData={roomData}
        stats={stats}
        showJudgeAnimation={false}
      />,
    );

    expect(html).toContain("3/4 numeric votes analyzed");
    expect(html).toContain("1 question mark");
  });
});
