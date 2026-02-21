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
  const env = {} as RoomWorkerEnv;

  beforeEach(() => {
    roomFetch.mockReset();
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
});
