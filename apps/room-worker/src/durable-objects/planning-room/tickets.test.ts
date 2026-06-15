import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomData } from "@sprintjam/types";
import { createInitialRoomData } from "@sprintjam/utils";

import { handleAddTicket } from "./tickets";

const makeRoom = (overrides: {
  roomData: RoomData;
  repository: Partial<Record<string, unknown>>;
}) => {
  return {
    getRoomData: vi.fn(async () => overrides.roomData),
    repository: {
      ...overrides.repository,
    },
    broadcast: vi.fn(),
  } as any;
};

describe("planning-room ticket queue permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents non-moderators from adding tickets when queue sharing is disabled", async () => {
    const roomData = createInitialRoomData({
      key: "room-no-share",
      users: ["moderator", "alex"],
      moderator: "moderator",
      connectedUsers: { moderator: true, alex: true },
      settings: {
        enableTicketQueue: true,
        allowOthersToManageQueue: false,
      },
    });

    const repository = {
      getTicketQueue: vi.fn(),
      getNextTicketId: vi.fn(),
      getTicketByTicketKey: vi.fn(),
      createTicket: vi.fn(),
    };

    const room = makeRoom({
      roomData,
      repository,
    });

    await handleAddTicket(room, "alex", { ticketId: "ABC-1" });

    expect(repository.getTicketQueue).not.toHaveBeenCalled();
    expect(repository.getNextTicketId).not.toHaveBeenCalled();
    expect(repository.getTicketByTicketKey).not.toHaveBeenCalled();
    expect(repository.createTicket).not.toHaveBeenCalled();
    expect(room.broadcast).not.toHaveBeenCalled();
  });

  it("allows non-moderators to add tickets when queue sharing is enabled", async () => {
    const roomData = createInitialRoomData({
      key: "room-can-share",
      users: ["moderator", "alex"],
      moderator: "moderator",
      connectedUsers: { moderator: true, alex: true },
      settings: {
        enableTicketQueue: true,
        allowOthersToManageQueue: true,
      },
    });

    const ticketQueue = [];
    const repository = {
      getTicketQueue: vi.fn().mockReturnValue(ticketQueue),
      getNextTicketId: vi.fn(),
      getTicketByTicketKey: vi.fn(),
      createTicket: vi.fn().mockReturnValue({
        id: 7,
        roomKey: roomData.key,
        ticketId: "ABC-1",
        title: null,
        description: null,
        status: "pending",
        ordinal: 1,
        externalService: "none",
        externalServiceId: null,
        externalServiceMetadata: null,
      }),
    };

    repository.getTicketByTicketKey = vi
      .fn()
      .mockReturnValueOnce(undefined);
    repository.getTicketQueue.mockReturnValue(ticketQueue);

    const room = makeRoom({
      roomData,
      repository,
    });

    await handleAddTicket(room, "alex", { ticketId: "ABC-1" });

    expect(repository.getTicketQueue).toHaveBeenCalledTimes(2);
    expect(repository.createTicket).toHaveBeenCalledWith({
      ticketId: "ABC-1",
      title: null,
      description: null,
      status: "pending",
      ordinal: 1,
      externalService: "none",
      externalServiceId: null,
      externalServiceMetadata: null,
    });
    expect(room.broadcast).toHaveBeenCalledWith({
      type: "ticketAdded",
      ticket: expect.objectContaining({
        id: 7,
      }),
      queue: [],
    });
  });
});
