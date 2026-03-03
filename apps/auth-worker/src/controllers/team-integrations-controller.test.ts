import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";
import { signState } from "@sprintjam/utils";

import {
  initiateTeamOAuthController,
  handleGithubTeamOAuthCallbackController,
} from "./team-integrations-controller";

const mockAuthenticateRequest = vi.fn();
const mockTeamGetById = vi.fn();
const mockTeamIsAdmin = vi.fn();
const mockWorkspaceGetChallenge = vi.fn();
const mockWorkspaceMarkChallengeUsed = vi.fn();
const mockWorkspaceIsOrganisationAdmin = vi.fn();

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

    isTeamAdmin(...args: unknown[]) {
      return mockTeamIsAdmin(...args);
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

    isOrganisationAdmin(...args: unknown[]) {
      return mockWorkspaceIsOrganisationAdmin(...args);
    }
  },
}));

describe("team integrations OAuth security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a one-time OAuth nonce challenge when initiating team OAuth", async () => {
    const repo = {
      getTeamById: vi.fn().mockResolvedValue({
        id: 7,
        ownerId: 12,
        organisationId: 5,
        accessPolicy: "restricted",
      }),
      getUserById: vi.fn().mockResolvedValue({
        id: 12,
        email: "owner@example.com",
        organisationId: 5,
      }),
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getTeamMembership: vi.fn().mockResolvedValue({ role: "admin", status: "active" }),
      isTeamAdmin: vi.fn().mockResolvedValue(true),
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
        metadata: JSON.stringify({
          teamId: 7,
          authorizedBy: "owner@example.com",
        }),
      }),
    );

    const body = (await response.json()) as { authorizationUrl: string };
    const authorizationUrl = new URL(body.authorizationUrl);
    expect(authorizationUrl.searchParams.get("state")).toBeTruthy();

    const encodedState = authorizationUrl.searchParams.get("state");
    const signedState = JSON.parse(
      atob(encodedState as string),
    ) as {
      data: {
        teamId: number;
        userId: number;
        nonce: string;
      };
    };

    expect(signedState.data).toEqual(
      expect.objectContaining({
        teamId: 7,
        userId: 12,
        nonce: expect.any(String),
      }),
    );
    expect(JSON.stringify(signedState.data)).not.toContain("owner@example.com");
  });

  it("rejects callback when nonce challenge is missing", async () => {
    const state = await signState(
      {
        teamId: 7,
        userId: 12,
        nonce: "nonce-value",
      },
      "github-secret",
    );
    const url = new URL(
      `https://test/api/teams/integrations/github/callback?code=abc&state=${encodeURIComponent(state)}`,
    );
    mockTeamIsAdmin.mockResolvedValue(true);
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

  it("accepts workspace admin access during callback revalidation", async () => {
    const state = await signState(
      {
        teamId: 7,
        userId: 12,
        nonce: "workspace-admin-nonce",
      },
      "github-secret",
    );
    const url = new URL(
      `https://test/api/teams/integrations/github/callback?code=abc&state=${encodeURIComponent(state)}`,
    );
    mockTeamIsAdmin.mockResolvedValue(false);
    mockTeamGetById.mockResolvedValue({
      id: 7,
      organisationId: 5,
      ownerId: 99,
    });
    mockWorkspaceIsOrganisationAdmin.mockResolvedValue(true);
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
    expect(mockWorkspaceIsOrganisationAdmin).toHaveBeenCalledWith(12, 5);
    const html = await response.text();
    expect(html).toContain("Invalid OAuth state");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
