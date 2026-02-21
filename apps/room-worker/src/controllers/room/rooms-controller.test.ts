import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request as CfRequest } from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";

vi.mock("@sprintjam/utils", async () => {
  const actual =
    await vi.importActual<typeof import("@sprintjam/utils")>(
      "@sprintjam/utils",
    );
  return {
    ...actual,
    getRoomStub: vi.fn(),
  };
});

import { joinRoomController } from "./rooms-controller";
import { getRoomStub } from "@sprintjam/utils";

describe("joinRoomController", () => {
  const roomFetch = vi.fn();
  const env = {} as RoomWorkerEnv;

  beforeEach(() => {
    roomFetch.mockReset();
    vi.mocked(getRoomStub).mockReturnValue({ fetch: roomFetch } as any);
  });

  it("forwards room session cookie to the internal join request", async () => {
    roomFetch.mockResolvedValue(new Response("ok", { status: 200 }));

    const response = (await joinRoomController(
      new Request("https://test/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "room_session=cookie-token",
        },
        body: JSON.stringify({ name: "Alice", roomKey: "ROOM1" }),
      }) as unknown as CfRequest,
      env,
    )) as Response;

    expect(response.status).toBe(200);
    expect(roomFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          get: expect.any(Function),
        }),
      }),
    );
    const forwardedRequest = roomFetch.mock.calls[0]?.[0] as Request;
    expect(forwardedRequest.headers.get("Cookie")).toBe(
      "room_session=cookie-token",
    );
  });
});
