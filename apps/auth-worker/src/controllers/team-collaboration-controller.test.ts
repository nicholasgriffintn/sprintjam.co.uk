import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";

import {
  listTeamCollaborationInstallationsController,
  saveTeamsCollaborationInstallationController,
} from "./team-collaboration-controller";

const mockAuthenticateRequest = vi.fn();
const mockListForTeam = vi.fn();
const mockSaveTeamsInstallation = vi.fn();

vi.mock("../lib/auth", () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
  isAuthError: (result: { status?: string }) =>
    "status" in result && result.status === "error",
}));

vi.mock("../repositories/team-collaboration-repository", () => ({
  TeamCollaborationRepository: class {
    listForTeam(...args: unknown[]) {
      return mockListForTeam(...args);
    }

    saveTeamsInstallation(...args: unknown[]) {
      return mockSaveTeamsInstallation(...args);
    }
  },
}));

const makeRequest = (input: RequestInfo | URL, init?: RequestInit): Request =>
  new Request(input, init);

const createRepo = (overrides: Record<string, unknown> = {}) => ({
  getTeamById: vi.fn().mockResolvedValue({
    id: 7,
    organisationId: 5,
    ownerId: 99,
    accessPolicy: "restricted",
  }),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    email: "admin@example.com",
    organisationId: 5,
  }),
  isOrganisationAdmin: vi.fn().mockResolvedValue(false),
  getTeamMembership: vi
    .fn()
    .mockResolvedValue({ role: "admin", status: "active" }),
  ...overrides,
});

const authenticateAs = (repo: ReturnType<typeof createRepo>) => {
  mockAuthenticateRequest.mockResolvedValue({
    userId: 1,
    email: "admin@example.com",
    repo,
  });
};

describe("team collaboration controller", () => {
  let env: AuthWorkerEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    env = { DB: {} as any } as AuthWorkerEnv;
  });

  it("allows team members to list connected collaboration apps", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);
    mockListForTeam.mockResolvedValue([
      {
        id: 3,
        teamId: 7,
        platform: "teams",
        tenantId: "tenant-1",
        metadata: {},
      },
    ]);

    const response = await listTeamCollaborationInstallationsController(
      makeRequest("https://test/api/teams/7/collaboration-installations"),
      env,
      7,
    );
    const data = (await response.json()) as { installations: unknown[] };

    expect(response.status).toBe(200);
    expect(data.installations).toHaveLength(1);
    expect(mockListForTeam).toHaveBeenCalledWith(7);
  });

  it("requires team admin access to connect Teams", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await saveTeamsCollaborationInstallationController(
      makeRequest("https://test/api/teams/7/collaboration-installations/teams", {
        method: "POST",
        body: JSON.stringify({
          tenantId: "tenant-1",
          externalChannelId: "channel-1",
        }),
      }),
      env,
      7,
    );

    expect(response.status).toBe(403);
    expect(mockSaveTeamsInstallation).not.toHaveBeenCalled();
  });

  it("stores a validated Teams context for team admins", async () => {
    const repo = createRepo();
    authenticateAs(repo);
    mockSaveTeamsInstallation.mockResolvedValue({
      id: 4,
      teamId: 7,
      platform: "teams",
      tenantId: "tenant-1",
      externalTeamId: "team-1",
      externalChannelId: "channel-1",
      externalChatId: null,
      externalUserId: "user-1",
      displayName: "Planning",
      metadata: { source: "teams" },
      installedById: 1,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    });

    const response = await saveTeamsCollaborationInstallationController(
      makeRequest("https://test/api/teams/7/collaboration-installations/teams", {
        method: "POST",
        body: JSON.stringify({
          tenantId: "tenant-1",
          externalTeamId: "team-1",
          externalChannelId: "channel-1",
          externalUserId: "user-1",
          displayName: "Planning",
          metadata: { source: "teams" },
        }),
      }),
      env,
      7,
    );
    const data = (await response.json()) as {
      installation: { platform: string };
    };

    expect(response.status).toBe(201);
    expect(data.installation.platform).toBe("teams");
    expect(mockSaveTeamsInstallation).toHaveBeenCalledWith({
      teamId: 7,
      installedById: 1,
      input: {
        tenantId: "tenant-1",
        externalTeamId: "team-1",
        externalChannelId: "channel-1",
        externalChatId: null,
        externalUserId: "user-1",
        displayName: "Planning",
        metadata: { source: "teams" },
      },
    });
  });

  it("rejects Teams contexts without tenant id", async () => {
    const repo = createRepo();
    authenticateAs(repo);

    const response = await saveTeamsCollaborationInstallationController(
      makeRequest("https://test/api/teams/7/collaboration-installations/teams", {
        method: "POST",
        body: JSON.stringify({ externalChannelId: "channel-1" }),
      }),
      env,
      7,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe("tenantId is required");
    expect(mockSaveTeamsInstallation).not.toHaveBeenCalled();
  });
});
