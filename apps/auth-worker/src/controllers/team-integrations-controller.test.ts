import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";
import { signState } from "@sprintjam/utils";

import {
  initiateTeamOAuthController,
  handleGithubTeamOAuthCallbackController,
  handleSlackTeamOAuthCallbackController,
  listTeamIntegrationBoardsController,
  searchTeamIntegrationTicketsController,
} from "./team-integrations-controller";

const mockAuthenticateRequest = vi.fn();
const mockTeamGetById = vi.fn();
const mockTeamIsAdmin = vi.fn();
const mockWorkspaceGetChallenge = vi.fn();
const mockWorkspaceMarkChallengeUsed = vi.fn();
const mockWorkspaceIsOrganisationAdmin = vi.fn();
const mockGetJiraCredentials = vi.fn();
const mockGetGithubCredentials = vi.fn();
const mockUpdateTokens = vi.fn();
const mockSaveSlackCredentials = vi.fn();
const mockFetchJiraBoards = vi.fn();
const mockFetchGithubRepoIssues = vi.fn();
const mockExchangeSlackOAuthCode = vi.fn();

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

vi.mock("../repositories/team-integration-repository", () => ({
  TeamIntegrationRepository: class {
    getJiraCredentials(...args: unknown[]) {
      return mockGetJiraCredentials(...args);
    }

    getGithubCredentials(...args: unknown[]) {
      return mockGetGithubCredentials(...args);
    }

    updateTokens(...args: unknown[]) {
      return mockUpdateTokens(...args);
    }

    saveSlackCredentials(...args: unknown[]) {
      return mockSaveSlackCredentials(...args);
    }
  },
}));

vi.mock("@sprintjam/services", () => ({
  fetchJiraBoards: (...args: unknown[]) => mockFetchJiraBoards(...args),
  fetchGithubRepoIssues: (...args: unknown[]) =>
    mockFetchGithubRepoIssues(...args),
  fetchGithubMilestones: vi.fn(),
  fetchGithubRepos: vi.fn(),
  exchangeSlackOAuthCode: (...args: unknown[]) =>
    mockExchangeSlackOAuthCode(...args),
  fetchJiraBoardIssues: vi.fn(),
  fetchJiraSprints: vi.fn(),
  fetchLinearCycles: vi.fn(),
  fetchLinearIssues: vi.fn(),
  fetchLinearTeams: vi.fn(),
  findDefaultStoryPointsField: vi.fn(),
  findDefaultSprintField: vi.fn(),
  getLinearOrganization: vi.fn(),
  getLinearViewer: vi.fn(),
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
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "admin", status: "active" }),
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
    const signedState = JSON.parse(atob(encodedState as string)) as {
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

  it("initiates Slack OAuth with app scopes and signed team state", async () => {
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
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "admin", status: "active" }),
      createAuthChallenge: vi.fn().mockResolvedValue(1),
    };
    mockAuthenticateRequest.mockResolvedValue({
      userId: 12,
      email: "owner@example.com",
      repo,
    });

    const env = {
      DB: {} as any,
      SLACK_OAUTH_CLIENT_ID: "slack-id",
      SLACK_OAUTH_CLIENT_SECRET: "slack-secret",
      TOKEN_ENCRYPTION_SECRET: "token-secret",
    } as AuthWorkerEnv;

    const response = await initiateTeamOAuthController(
      new Request("https://test/api/teams/7/integrations/slack/authorize", {
        method: "POST",
      }),
      env,
      7,
      "slack",
    );
    const body = (await response.json()) as { authorizationUrl: string };
    const authorizationUrl = new URL(body.authorizationUrl);

    expect(response.status).toBe(200);
    expect(authorizationUrl.origin).toBe("https://slack.com");
    expect(authorizationUrl.pathname).toBe("/oauth/v2/authorize");
    expect(authorizationUrl.searchParams.get("scope")).toBe(
      "commands,chat:write,channels:read,groups:read",
    );
    expect(authorizationUrl.searchParams.get("state")).toBeTruthy();
  });

  it("stores Slack bot credentials from the OAuth callback", async () => {
    const state = await signState(
      {
        teamId: 7,
        userId: 12,
        nonce: "slack-nonce",
      },
      "slack-secret",
    );
    const url = new URL(
      `https://test/api/teams/integrations/slack/callback?code=abc&state=${encodeURIComponent(state)}`,
    );
    mockTeamIsAdmin.mockResolvedValue(true);
    mockWorkspaceGetChallenge.mockResolvedValue({
      id: 99,
      userId: 12,
      type: "oauth",
      usedAt: null,
      expiresAt: Date.now() + 60_000,
      metadata: JSON.stringify({
        teamId: 7,
        authorizedBy: "owner@example.com",
      }),
    });
    mockExchangeSlackOAuthCode.mockResolvedValue({
      ok: true,
      access_token: "xoxb-token",
      token_type: "bot",
      scope: "commands,chat:write,channels:read,groups:read",
      bot_user_id: "U-BOT",
      app_id: "A123",
      team: { id: "T123", name: "Example" },
      enterprise: null,
      authed_user: { id: "U123" },
    });

    const response = await handleSlackTeamOAuthCallbackController(url, {
      DB: {} as any,
      SLACK_OAUTH_CLIENT_ID: "slack-id",
      SLACK_OAUTH_CLIENT_SECRET: "slack-secret",
      TOKEN_ENCRYPTION_SECRET: "token-secret",
    } as AuthWorkerEnv);

    expect(response.status).toBe(200);
    expect(mockWorkspaceMarkChallengeUsed).toHaveBeenCalledWith(99);
    expect(mockSaveSlackCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 7,
        accessToken: "xoxb-token",
        tokenType: "bot",
        authorizedBy: "owner@example.com",
        slackTeamId: "T123",
        slackTeamName: "Example",
        slackBotUserId: "U-BOT",
        slackAppId: "A123",
        slackAuthedUserId: "U123",
      }),
    );
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

  it("lists team Jira boards for accessible users", async () => {
    const repo = {
      getTeamById: vi.fn().mockResolvedValue({
        id: 7,
        organisationId: 5,
        ownerId: 12,
      }),
      getUserById: vi.fn().mockResolvedValue({
        id: 12,
        organisationId: 5,
      }),
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getTeamMembership: vi.fn().mockResolvedValue({
        role: "member",
        status: "active",
      }),
    };

    mockAuthenticateRequest.mockResolvedValue({
      userId: 12,
      email: "owner@example.com",
      repo,
    });
    mockGetJiraCredentials.mockResolvedValue({
      accessToken: "jira-token",
      refreshToken: "jira-refresh",
      expiresAt: Date.now() + 60_000,
      tokenType: "Bearer",
      scope: null,
      authorizedBy: "owner@example.com",
      roomKey: "team:7",
      id: 0,
      createdAt: 0,
      updatedAt: 0,
      jiraDomain: "example.atlassian.net",
      jiraCloudId: "cloud-id",
      jiraUserId: null,
      jiraUserEmail: null,
      storyPointsField: null,
      sprintField: null,
    });
    mockFetchJiraBoards.mockResolvedValue([{ id: "3", name: "Platform" }]);

    const env = {
      DB: {} as any,
      JIRA_OAUTH_CLIENT_ID: "jira-id",
      JIRA_OAUTH_CLIENT_SECRET: "jira-secret",
      TOKEN_ENCRYPTION_SECRET: "token-secret",
    } as AuthWorkerEnv;

    const response = await listTeamIntegrationBoardsController(
      new Request("https://test/api/teams/7/integrations/jira/boards", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      env,
      7,
      "jira",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      boards: [{ id: "3", name: "Platform" }],
    });
    expect(mockGetJiraCredentials).toHaveBeenCalledWith(7);
  });

  it("searches GitHub tickets for accessible users", async () => {
    const repo = {
      getTeamById: vi.fn().mockResolvedValue({
        id: 7,
        organisationId: 5,
        ownerId: 12,
      }),
      getUserById: vi.fn().mockResolvedValue({
        id: 12,
        organisationId: 5,
      }),
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getTeamMembership: vi.fn().mockResolvedValue({
        role: "member",
        status: "active",
      }),
    };

    mockAuthenticateRequest.mockResolvedValue({
      userId: 12,
      email: "owner@example.com",
      repo,
    });
    mockGetGithubCredentials.mockResolvedValue({
      accessToken: "github-token",
      refreshToken: null,
      expiresAt: Date.now() + 60_000,
      tokenType: "Bearer",
      scope: null,
      authorizedBy: "owner@example.com",
      roomKey: "team:7",
      id: 0,
      createdAt: 0,
      updatedAt: 0,
      githubLogin: "sprintjam",
      githubUserEmail: null,
      defaultOwner: "sprintjam",
      defaultRepo: "app",
    });
    mockFetchGithubRepoIssues.mockResolvedValue([
      {
        id: "101",
        key: "sprintjam/app#42",
        repository: "sprintjam/app",
        number: 42,
        title: "Fix standup filter",
      },
    ]);

    const env = {
      DB: {} as any,
      TOKEN_ENCRYPTION_SECRET: "token-secret",
    } as AuthWorkerEnv;

    const response = await searchTeamIntegrationTicketsController(
      new Request("https://test/api/teams/7/integrations/github/tickets", {
        method: "POST",
        body: JSON.stringify({
          boardId: "sprintjam/app",
          sprintName: "Sprint 12",
          sprintNumber: 12,
          query: "standup",
        }),
      }),
      env,
      7,
      "github",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tickets: [
        {
          id: "101",
          key: "sprintjam/app#42",
          repository: "sprintjam/app",
          number: 42,
          title: "Fix standup filter",
        },
      ],
    });
    expect(mockFetchGithubRepoIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "github-token",
      }),
      "sprintjam/app",
      expect.objectContaining({
        milestoneNumber: 12,
        milestoneTitle: "Sprint 12",
        search: "standup",
      }),
    );
  });
});
