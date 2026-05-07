import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadInitialWorkspaceAuthProfile,
  loadWorkspaceAuthProfile,
} from "@/lib/workspace-loaders";
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

  it("throws when the auth worker errors", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const args = makeArgs(
      new Response("Auth worker unavailable", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(loadWorkspaceAuthProfile(args)).rejects.toMatchObject({
      status: 500,
    });
    expect(consoleError).not.toHaveBeenCalled();
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

  it("throws when the auth worker returns malformed JSON", async () => {
    const args = makeArgs(
      new Response("not json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(loadWorkspaceAuthProfile(args)).rejects.toBeInstanceOf(
      SyntaxError,
    );
  });

  it("returns null for unauthenticated auth responses", async () => {
    const args = makeArgs(new Response("Unauthorised", { status: 401 }));

    await expect(loadWorkspaceAuthProfile(args)).resolves.toBeNull();
  });
});

describe("loadInitialWorkspaceAuthProfile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null instead of throwing when the initial auth profile load errors", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const args = makeArgs(
      new Response("Auth worker unavailable", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(loadInitialWorkspaceAuthProfile(args)).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to load initial workspace auth profile",
      expect.any(Response),
    );
  });

  it("returns null instead of throwing when the initial auth profile is malformed", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const args = makeArgs(
      new Response("not json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(loadInitialWorkspaceAuthProfile(args)).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to load initial workspace auth profile",
      expect.any(SyntaxError),
    );
  });
});
