import { afterEach, describe, expect, it, vi } from "vitest";

import { loadWorkspaceAuthProfile } from "@/lib/workspace-loaders";
import type { WorkerLoaderArgs } from "@/lib/worker-utils";

const makeArgs = (response: Response): WorkerLoaderArgs =>
  ({
    request: new Request("https://sprintjam.test/room/ROOM1"),
    context: {
      cloudflare: {
        env: {
          AUTH_WORKER: {
            fetch: vi.fn().mockResolvedValue(response),
          },
        },
      },
    },
  }) as unknown as WorkerLoaderArgs;

describe("loadWorkspaceAuthProfile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null instead of throwing when the auth worker errors", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const args = makeArgs(
      new Response("Auth worker unavailable", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(loadWorkspaceAuthProfile(args)).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to load initial workspace auth profile",
      expect.any(Response),
    );
  });

  it("still returns authenticated profile data when the auth worker succeeds", async () => {
    const profile = {
      user: { id: 1, name: "Ada" },
      teams: [],
    };
    const args = makeArgs(
      new Response(JSON.stringify(profile), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(loadWorkspaceAuthProfile(args)).resolves.toEqual(profile);
  });
});
