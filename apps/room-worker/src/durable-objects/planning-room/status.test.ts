import { describe, it, expect, vi } from "vitest";
import { createInitialRoomData } from "@sprintjam/utils";

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
});
