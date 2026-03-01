/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoomData } from "@/types";

const mockSelectTicket = vi.fn();
const mockNextTicket = vi.fn();
const mockAddTicket = vi.fn();
const mockUpdateTicket = vi.fn();
const mockDeleteTicket = vi.fn();
const mockCompleteSession = vi.fn();
const mockStartGame = vi.fn();
const mockSubmitGameMove = vi.fn();
const mockEndGame = vi.fn();

vi.mock("@/lib/api-service", () => ({
  selectTicket: (...args: unknown[]) => mockSelectTicket(...args),
  nextTicket: () => mockNextTicket(),
  addTicket: (...args: unknown[]) => mockAddTicket(...args),
  updateTicket: (...args: unknown[]) => mockUpdateTicket(...args),
  deleteTicket: (...args: unknown[]) => mockDeleteTicket(...args),
  completeSession: () => mockCompleteSession(),
  startGame: (...args: unknown[]) => mockStartGame(...args),
  submitGameMove: (...args: unknown[]) => mockSubmitGameMove(...args),
  endGame: () => mockEndGame(),
}));

vi.mock("@/lib/workspace-service", () => ({
  completeSessionByRoomKey: vi.fn(),
}));

import { useRoomQueueAndGameActions } from "@/context/useRoomQueueAndGameActions";

const createRoomData = (status: RoomData["status"] = "active"): RoomData => ({
  key: "ROOM1",
  users: ["alice", "bob"],
  votes: {},
  showVotes: false,
  moderator: "alice",
  connectedUsers: { alice: true, bob: true },
  judgeScore: null,
  status,
  settings: {
    estimateOptions: [1, 2, 3, 5, 8],
    allowOthersToShowEstimates: false,
    allowOthersToDeleteEstimates: false,
    showTimer: false,
    showUserPresence: true,
    showAverage: false,
    showMedian: false,
    showTopVotes: false,
    topVotesCount: 3,
    anonymousVotes: false,
    enableJudge: false,
    judgeAlgorithm: "simpleAverage",
  },
});

describe("useRoomQueueAndGameActions", () => {
  const setRoomError = vi.fn();
  const setRoomErrorKind = vi.fn();
  const assignRoomError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows party games to start and accept moves on completed rooms", () => {
    const { result } = renderHook(() =>
      useRoomQueueAndGameActions({
        roomData: createRoomData("completed"),
        userName: "alice",
        setRoomError,
        setRoomErrorKind,
        assignRoomError,
      }),
    );

    act(() => {
      result.current.handleStartGame("emoji-story");
      result.current.handleSubmitGameMove("rocket");
    });

    expect(mockStartGame).toHaveBeenCalledWith("emoji-story");
    expect(mockSubmitGameMove).toHaveBeenCalledWith("rocket");
  });

  it("keeps queue management blocked on completed rooms", () => {
    const { result } = renderHook(() =>
      useRoomQueueAndGameActions({
        roomData: createRoomData("completed"),
        userName: "alice",
        setRoomError,
        setRoomErrorKind,
        assignRoomError,
      }),
    );

    act(() => {
      result.current.handleSelectTicket(1);
      result.current.handleNextTicket();
    });

    expect(mockSelectTicket).not.toHaveBeenCalled();
    expect(mockNextTicket).not.toHaveBeenCalled();
  });
});
