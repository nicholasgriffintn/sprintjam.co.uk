import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";

import * as auth from "../lib/auth";
import * as notifications from "../lib/mfa-reset-notifications";
import {
  approveMfaResetRequestController,
  rejectMfaResetRequestController,
  requestMfaResetController,
} from "./mfa-reset-controller";

const testState = vi.hoisted(() => ({
  repository: null as Record<string, ReturnType<typeof vi.fn>> | null,
  consumeChallenge: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: (result: { status?: string }) => result.status === "error",
}));

vi.mock("../lib/shared-auth", () => ({
  createSprintJamAuth: () => ({
    consumeChallenge: testState.consumeChallenge,
  }),
}));

vi.mock("../lib/mfa-reset-notifications", () => ({
  sendMfaResetRequestNotifications: vi.fn().mockResolvedValue(undefined),
  sendMfaResetResolutionNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../repositories/workspace-auth", () => ({
  WorkspaceAuthRepository: vi.fn(function WorkspaceAuthRepositoryMock() {
    return testState.repository;
  }),
}));

function createRepo(overrides: Record<string, unknown> = {}) {
  return {
    getUserById: vi.fn().mockResolvedValue({
      id: 2,
      email: "member@example.com",
      organisationId: 10,
      name: "Member",
      avatar: null,
    }),
    getOrganisationMembership: vi.fn().mockResolvedValue({
      id: 1,
      organisationId: 10,
      userId: 2,
      role: "member",
      status: "active",
    }),
    isOrganisationAdmin: vi.fn().mockResolvedValue(false),
    getOrganisationById: vi.fn().mockResolvedValue({
      id: 10,
      name: "Example Workspace",
    }),
    getOrganisationMembers: vi
      .fn()
      .mockResolvedValue([
        { id: 1, email: "admin@example.com", role: "admin" },
      ]),
    expireMfaResetRequests: vi.fn().mockResolvedValue(undefined),
    getPendingMfaResetRequestForUser: vi.fn().mockResolvedValue(null),
    createMfaResetRequest: vi.fn().mockResolvedValue({
      id: 22,
      organisationId: 10,
      userId: 2,
      status: "pending",
      requestedAt: 1,
      expiresAt: 2,
      resolvedAt: null,
      resolvedById: null,
    }),
    logAuditEvent: vi.fn().mockResolvedValue(undefined),
    getMfaResetRequestById: vi.fn().mockResolvedValue({
      id: 22,
      organisationId: 10,
      userId: 2,
      status: "pending",
      expiresAt: Date.now() + 60_000,
    }),
    approveMfaResetRequest: vi.fn().mockResolvedValue(true),
    rejectMfaResetRequest: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function authenticateAsAdmin(repo: ReturnType<typeof createRepo>, userId = 1) {
  repo.getUserById.mockResolvedValueOnce({
    id: userId,
    email: "admin@example.com",
    organisationId: 10,
    name: "Admin",
    avatar: null,
  });
  repo.getOrganisationMembership.mockResolvedValueOnce({
    id: 1,
    organisationId: 10,
    userId,
    role: "admin",
    status: "active",
  });
  repo.isOrganisationAdmin.mockResolvedValueOnce(true);
  vi.mocked(auth.authenticateRequest).mockResolvedValue({
    userId,
    email: "admin@example.com",
    repo: repo as never,
  });
}

describe("MFA reset requests", () => {
  const env = { DB: {} } as AuthWorkerEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    testState.repository = createRepo();
    testState.consumeChallenge.mockResolvedValue({
      payload: { userId: "2", mode: "verify" },
    });
  });

  it("creates a reset request after an email-verified MFA challenge", async () => {
    const response = await requestMfaResetController(
      new Request("https://example.com/auth/mfa/reset-requests", {
        method: "POST",
        body: JSON.stringify({ challengeToken: "verified-selection" }),
      }),
      env,
    );
    const body = (await response.json()) as { request: { id: number } };

    expect(response.status).toBe(201);
    expect(body.request.id).toBe(22);
    expect(testState.consumeChallenge).toHaveBeenCalledWith(
      "verified-selection",
      "sprintjam",
      ["mfa_selection"],
    );
    expect(testState.repository?.createMfaResetRequest).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: 10, userId: 2 }),
    );
    expect(notifications.sendMfaResetRequestNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        requester: expect.objectContaining({ email: "member@example.com" }),
        admins: [
          expect.objectContaining({
            email: "admin@example.com",
            role: "admin",
          }),
        ],
        workspaceName: "Example Workspace",
      }),
    );
  });

  it("does not allow a setup challenge to request a reset", async () => {
    testState.consumeChallenge.mockResolvedValue({
      payload: { userId: "2", mode: "setup" },
    });

    const response = await requestMfaResetController(
      new Request("https://example.com/auth/mfa/reset-requests", {
        method: "POST",
        body: JSON.stringify({ challengeToken: "setup-selection" }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(testState.repository?.createMfaResetRequest).not.toHaveBeenCalled();
  });

  it("requires a workspace admin to approve a request", async () => {
    const repo = createRepo();
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "member@example.com",
      repo: repo as never,
    });

    const response = await approveMfaResetRequestController(
      new Request(
        "https://example.com/workspace/mfa-reset-requests/22/approve",
        {
          method: "POST",
        },
      ),
      env,
      22,
    );

    expect(response.status).toBe(403);
    expect(repo.approveMfaResetRequest).not.toHaveBeenCalled();
  });

  it("forbids an admin from approving their own reset", async () => {
    const repo = createRepo({
      getMfaResetRequestById: vi.fn().mockResolvedValue({
        id: 22,
        organisationId: 10,
        userId: 1,
        status: "pending",
        expiresAt: Date.now() + 60_000,
      }),
    });
    authenticateAsAdmin(repo);

    const response = await approveMfaResetRequestController(
      new Request(
        "https://example.com/workspace/mfa-reset-requests/22/approve",
        {
          method: "POST",
        },
      ),
      env,
      22,
    );

    expect(response.status).toBe(403);
    expect(repo.approveMfaResetRequest).not.toHaveBeenCalled();
  });

  it("approves a same-workspace request through the atomic reset operation", async () => {
    const repo = createRepo();
    authenticateAsAdmin(repo);

    const response = await approveMfaResetRequestController(
      new Request(
        "https://example.com/workspace/mfa-reset-requests/22/approve",
        {
          method: "POST",
        },
      ),
      env,
      22,
    );

    expect(response.status).toBe(200);
    expect(repo.approveMfaResetRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 22,
        organisationId: 10,
        userId: 2,
        resolvedById: 1,
      }),
    );
    expect(
      notifications.sendMfaResetResolutionNotification,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterEmail: "member@example.com",
        resolution: "approved",
      }),
    );
  });

  it("does not reveal reset requests from another workspace", async () => {
    const repo = createRepo({
      getMfaResetRequestById: vi.fn().mockResolvedValue({
        id: 22,
        organisationId: 99,
        userId: 2,
        status: "pending",
        expiresAt: Date.now() + 60_000,
      }),
    });
    authenticateAsAdmin(repo);

    const response = await approveMfaResetRequestController(
      new Request(
        "https://example.com/workspace/mfa-reset-requests/22/approve",
        {
          method: "POST",
        },
      ),
      env,
      22,
    );

    expect(response.status).toBe(404);
    expect(repo.approveMfaResetRequest).not.toHaveBeenCalled();
  });

  it("rejects a request and emails the requester with the next action", async () => {
    const repo = createRepo();
    authenticateAsAdmin(repo);

    const response = await rejectMfaResetRequestController(
      new Request(
        "https://example.com/workspace/mfa-reset-requests/22/reject",
        {
          method: "POST",
        },
      ),
      env,
      22,
    );

    expect(response.status).toBe(200);
    expect(repo.rejectMfaResetRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 22, resolvedById: 1 }),
    );
    expect(
      notifications.sendMfaResetResolutionNotification,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterEmail: "member@example.com",
        resolution: "rejected",
      }),
    );
  });
});
