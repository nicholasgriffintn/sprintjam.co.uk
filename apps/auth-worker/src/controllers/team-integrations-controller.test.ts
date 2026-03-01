import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";
import { signState } from "@sprintjam/utils";

import {
  initiateTeamOAuthController,
  handleGithubTeamOAuthCallbackController,
} from "./team-integrations-controller";

const mockAuthenticateRequest = vi.fn();
const mockTeamGetById = vi.fn();
const mockWorkspaceGetChallenge = vi.fn();
const mockWorkspaceMarkChallengeUsed = vi.fn();

vi.mock("../lib/auth", () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
  isAuthError: (result: { status?: string }) =>
    "status" in result && result.status === "error",
}));

vi.mock("../repositories/team-repository", () => ({
  TeamRepository: class {
    getTeamById(...args: unknown[]) {
      return mockTeamGetById(...args);
    }
  },
}));

vi.mock("../repositories/workspace-auth", () => ({
  WorkspaceAuthRepository: class {
    getAuthChallengeByTokenHash(...args: unknown[]) {
      return mockWorkspaceGetChallenge(...args);
    }

    markAuthChallengeUsed(...args: unknown[]) {
      return mockWorkspaceMarkChallengeUsed(...args);
    }
  },
}));

describe("team integrations OAuth security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a one-time OAuth nonce challenge when initiating team OAuth", async () => {
    const repo = {
      getTeamById: vi.fn().mockResolvedValue({ id: 7, ownerId: 12 }),
      getUserById: vi.fn().mockResolvedValue({
        id: 12,
        email: "owner@example.com",
      }),
      createAuthChallenge: vi.fn().mockResolvedValue(1),
    };
    mockAuthenticateRequest.mockResolvedValue({
      userId: 12,
      email: "owner@example.com",
      repo,
    });

    const env = {
      DB: {} as any,
      JIRA_OAUTH_CLIENT_ID: "jira-id",
      JIRA_OAUTH_CLIENT_SECRET: "jira-secret",
      LINEAR_OAUTH_CLIENT_ID: "linear-id",
      LINEAR_OAUTH_CLIENT_SECRET: "linear-secret",
      GITHUB_OAUTH_CLIENT_ID: "github-id",
      GITHUB_OAUTH_CLIENT_SECRET: "github-secret",
      TOKEN_ENCRYPTION_SECRET: "token-secret",
    } as AuthWorkerEnv;

    const response = await initiateTeamOAuthController(
      new Request("https://test/api/teams/7/integrations/github/authorize", {
        method: "POST",
      }),
      env,
      7,
      "github",
    );

    expect(response.status).toBe(200);
    expect(repo.createAuthChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 12,
        type: "oauth",
      }),
    );

    const body = (await response.json()) as { authorizationUrl: string };
    expect(body.authorizationUrl).toContain("state=");
  });

  it("rejects callback when nonce challenge is missing", async () => {
    const state = await signState(
      {
        teamId: 7,
        userId: 12,
        authorizedBy: "owner@example.com",
        nonce: "nonce-value",
      },
      "github-secret",
    );
    const url = new URL(
      `https://test/api/teams/integrations/github/callback?code=abc&state=${encodeURIComponent(state)}`,
    );
    mockTeamGetById.mockResolvedValue({ id: 7, ownerId: 12 });
    mockWorkspaceGetChallenge.mockResolvedValue(null);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("fetch should not be called"));

    const env = {
      DB: {} as any,
      GITHUB_OAUTH_CLIENT_ID: "github-id",
      GITHUB_OAUTH_CLIENT_SECRET: "github-secret",
      TOKEN_ENCRYPTION_SECRET: "token-secret",
    } as AuthWorkerEnv;

    const response = await handleGithubTeamOAuthCallbackController(url, env);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain("Invalid OAuth state");
    expect(mockWorkspaceGetChallenge).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
