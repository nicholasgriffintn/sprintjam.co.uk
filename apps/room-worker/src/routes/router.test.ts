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

import { handleRequest } from "./router";
import { getRoomStub } from "@sprintjam/utils";

describe("handleRequest websocket", () => {
  const roomFetch = vi.fn();
  const authFetch = vi.fn();
  const env = {
    AUTH_WORKER: { fetch: authFetch },
  } as unknown as RoomWorkerEnv;

  beforeEach(() => {
    roomFetch.mockReset();
    authFetch.mockReset();
    vi.mocked(getRoomStub).mockReturnValue({ fetch: roomFetch } as any);
  });

  it("accepts room session cookie for websocket auth", async () => {
    roomFetch.mockResolvedValue(new Response(null, { status: 200 }));

    const response = (await handleRequest(
      new Request("https://test/ws?room=ROOM1&name=Alice", {
        headers: {
          Upgrade: "websocket",
          Cookie: "room_session=token",
        },
      }) as unknown as CfRequest,
      env,
    )) as Response;

    expect(response.status).toBe(200);
    expect(roomFetch).toHaveBeenCalled();
  });

  it("validates room ownership before forwarding workspace session writes", async () => {
    roomFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    authFetch.mockResolvedValue(
      new Response(JSON.stringify({ session: { id: 21 } }), { status: 201 }),
    );

    const response = (await handleRequest(
      new Request("https://test/api/rooms/workspace-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "room_session=token",
        },
        body: JSON.stringify({
          teamSlug: "amber-cobalt-ripple",
          name: "Sprint Planning",
          roomKey: "ROOM1",
        }),
      }) as unknown as CfRequest,
      env,
    )) as Response;

    expect(response.status).toBe(201);
    const validationRequest = roomFetch.mock.calls[0]?.[0] as Request;
    await expect(validationRequest.json()).resolves.toEqual({
      sessionToken: "token",
    });
    expect(authFetch).toHaveBeenCalled();
  });
});
