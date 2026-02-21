import { describe, it, expect, vi } from "vitest";
import { createInitialRoomData } from "@sprintjam/utils";
import type { SessionRoundHistoryItem } from "@sprintjam/types";

import { handleCompleteSession } from "./status";

describe("handleCompleteSession", () => {
  it("marks room completed for moderators", async () => {
    const roomData = createInitialRoomData({
      key: "room-1",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
    });

    const setRoomStatus = vi.fn();
    const broadcast = vi.fn();

    const room = {
      getRoomData: vi.fn(async () => roomData),
      repository: { setRoomStatus },
      broadcast,
    } as any;

    await handleCompleteSession(room, "mod");

    expect(setRoomStatus).toHaveBeenCalledWith("completed");
    expect(broadcast).toHaveBeenCalledWith({
      type: "roomStatusUpdated",
      status: "completed",
    });
  });

  it("rejects non-moderators without queue permissions", async () => {
    const roomData = createInitialRoomData({
      key: "room-2",
      users: ["mod", "alex"],
      moderator: "mod",
      connectedUsers: { mod: true, alex: true },
      settings: {
        allowOthersToManageQueue: false,
      },
    });

    const setRoomStatus = vi.fn();
    const broadcast = vi.fn();

    const room = {
      getRoomData: vi.fn(async () => roomData),
      repository: { setRoomStatus },
      broadcast,
    } as any;

    await handleCompleteSession(room, "alex");

    expect(setRoomStatus).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it("no-ops when already completed", async () => {
    const roomData = createInitialRoomData({
      key: "room-3",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
    });
    roomData.status = "completed";

    const setRoomStatus = vi.fn();
    const broadcast = vi.fn();

    const room = {
      getRoomData: vi.fn(async () => roomData),
      repository: { setRoomStatus },
      broadcast,
    } as any;

    await handleCompleteSession(room, "mod");

    expect(setRoomStatus).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it("captures and persists the in-progress round before completion", async () => {
    const roomData = createInitialRoomData({
      key: "room-4",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
      settings: {
        enableTicketQueue: true,
      },
    });
    roomData.votes = { mod: 5 };
    roomData.currentTicket = {
      id: 1,
      roomKey: "room-4",
      ticketId: "SPRINTJAM-001",
      title: "Initial ticket",
      status: "in_progress",
      createdAt: Date.now() - 1_000,
      ordinal: 1,
      externalService: "none",
    };

    const setRoomStatus = vi.fn(() => {
      roomData.status = "completed";
    });
    const setRoundHistory = vi.fn((history: SessionRoundHistoryItem[]) => {
      roomData.roundHistory = history;
    });
    const logTicketVote = vi.fn();
    const updateTicket = vi.fn();
    const setCurrentTicket = vi.fn();
    const broadcast = vi.fn();

    const room = {
      env: {
        STATS_WORKER: { fetch: vi.fn() },
        STATS_INGEST_TOKEN: undefined,
      },
      getRoomData: vi.fn(async () => roomData),
      repository: {
        setRoomStatus,
        setRoundHistory,
        logTicketVote,
        updateTicket,
        setCurrentTicket,
      },
      broadcast,
    } as any;

    await handleCompleteSession(room, "mod");

    expect(setRoundHistory).toHaveBeenCalled();
    expect(logTicketVote).toHaveBeenCalledWith(1, "mod", 5, undefined);
    expect(updateTicket).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "completed" }),
    );
    expect(setCurrentTicket).toHaveBeenCalledWith(null);
    expect(setRoomStatus).toHaveBeenCalledWith("completed");
    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "initialize",
      }),
    );
    expect(broadcast).toHaveBeenCalledWith({
      type: "roomStatusUpdated",
      status: "completed",
    });
  });
});
