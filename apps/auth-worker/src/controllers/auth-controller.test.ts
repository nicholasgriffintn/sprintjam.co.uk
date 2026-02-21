import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";
import * as utils from "@sprintjam/utils";
import * as services from "@sprintjam/services";

import {
  requestMagicLinkController,
  verifyCodeController,
  startMfaSetupController,
  verifyMfaSetupController,
  verifyMfaController,
  getCurrentUserController,
  logoutController,
} from "./auth-controller";
import { WorkspaceAuthRepository } from "../repositories/workspace-auth";

const makeRequest = (input: RequestInfo | URL, init?: RequestInit): Request =>
  new Request(input, init);

vi.mock("../repositories/workspace-auth", () => ({
  WorkspaceAuthRepository: vi.fn(),
}));
vi.mock("@sprintjam/services");
vi.mock("@sprintjam/utils", async () => {
  const actual = await vi.importActual("@sprintjam/utils");
  return {
    ...actual,
    generateToken: vi.fn(),
    generateVerificationCode: vi.fn(),
    hashToken: vi.fn(),
  };
});

describe("requestMagicLinkController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
      RESEND_API_KEY: "test-api-key",
    } as AuthWorkerEnv;

    mockRepo = {
      isDomainAllowed: vi.fn(),
      getPendingWorkspaceInviteByEmail: vi.fn().mockResolvedValue(null),
      getUserByEmail: vi.fn().mockResolvedValue(null),
      createMagicLink: vi.fn(),
      logAuditEvent: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.generateVerificationCode).mockReturnValue("123456");
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-code-123");
    vi.mocked(services.sendVerificationCodeEmail).mockResolvedValue(undefined);
  });

  it("should return error when email is missing", async () => {
    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email is required");
  });

  it("should return error when email format is invalid", async () => {
    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid email format");
  });

  it("should trim and lowercase email", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "  TEST@EXAMPLE.COM  " }),
    });

    await requestMagicLinkController(request, mockEnv);

    expect(mockRepo.createMagicLink).toHaveBeenCalledWith(
      "test@example.com",
      "hashed-code-123",
      expect.any(Number),
    );
  });

  it("should return 503 when domain check fails", async () => {
    mockRepo.isDomainAllowed.mockRejectedValue(new Error("DB Error"));

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(data.error).toContain("Service temporarily unavailable");
    expect(mockRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "magic_link_request",
        status: "failure",
        reason: "domain_check_failed",
      }),
    );
  });

  it("should return 403 when domain is not allowed", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(false);
    mockRepo.getPendingWorkspaceInviteByEmail.mockResolvedValue(null);
    mockRepo.getUserByEmail.mockResolvedValue(null);

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@notallowed.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toContain("not authorized for workspace access");
    expect(mockRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "magic_link_request",
        status: "failure",
        reason: "domain_not_allowed",
      }),
    );
  });

  it("should return 500 when verification code creation fails", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockRejectedValue(new Error("DB Error"));

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toContain("Unable to create a verification code");
    expect(mockRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "magic_link_request",
        status: "failure",
        reason: "magic_link_persist_failed",
      }),
    );
  });

  it("should return 500 when email sending fails", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);
    vi.mocked(services.sendVerificationCodeEmail).mockRejectedValue(
      new Error("Email Error"),
    );

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to send verification code email");
    expect(mockRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "magic_link_request",
        status: "failure",
        reason: "magic_link_email_failed",
      }),
    );
  });

  it("should successfully send verification code for valid email", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(data.message).toBe("Verification code sent to your email");
    expect(services.sendVerificationCodeEmail).toHaveBeenCalledWith({
      email: "test@example.com",
      code: "123456",
      resendApiKey: "test-api-key",
    });
    expect(mockRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "magic_link_request",
        status: "success",
        reason: "code_sent",
      }),
    );
  });

  it("should generate correct verification code and hash it", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    await requestMagicLinkController(request, mockEnv);

    expect(utils.generateVerificationCode).toHaveBeenCalled();
    expect(utils.hashToken).toHaveBeenCalledWith("123456");
    expect(mockRepo.createMagicLink).toHaveBeenCalledWith(
      "test@example.com",
      "hashed-code-123",
      expect.any(Number),
    );
  });

  it("should allow invited email even when domain is not allowed", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(false);
    mockRepo.getPendingWorkspaceInviteByEmail.mockResolvedValue({
      id: 7,
      organisationId: 3,
      email: "invitee@otherdomain.com",
    });
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "invitee@otherdomain.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    expect(response.status).toBe(200);
    expect(mockRepo.getPendingWorkspaceInviteByEmail).toHaveBeenCalledWith(
      "invitee@otherdomain.com",
    );
  });

  it("should allow existing user when domain is not allowed", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(false);
    mockRepo.getPendingWorkspaceInviteByEmail.mockResolvedValue(null);
    mockRepo.getUserByEmail.mockResolvedValue({
      id: 9,
      email: "existing@external.com",
      organisationId: 2,
    });
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = makeRequest("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "existing@external.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    expect(response.status).toBe(200);
  });
});

describe("verifyCodeController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
    } as AuthWorkerEnv;

    mockRepo = {
      validateVerificationCode: vi.fn(),
      getPendingWorkspaceInviteByEmail: vi.fn().mockResolvedValue(null),
      getOrCreateOrganisation: vi.fn(),
      updateUserOrganisation: vi.fn(),
      getOrCreateUser: vi.fn(),
      getUserByEmail: vi.fn(),
      markWorkspaceInviteAccepted: vi.fn(),
      listMfaCredentials: vi.fn(),
      createAuthChallenge: vi.fn(),
      logAuditEvent: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.generateToken).mockResolvedValue("session-token-123");
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session-123");
  });

  it("should return error when email or code is missing", async () => {
    const request = makeRequest("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await verifyCodeController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email and code are required");
  });

  it("should return 401 when verification code is invalid", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: false,
      error: "invalid",
    });

    const request = makeRequest("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", code: "000000" }),
    });

    const response = await verifyCodeController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid verification code");
    expect(mockRepo.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        event: "magic_link_verify",
        status: "failure",
        reason: "invalid",
      }),
    );
  });

  it("should return 401 when verification code is expired", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: false,
      error: "expired",
    });

    const request = makeRequest("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", code: "123456" }),
    });

    const response = await verifyCodeController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Verification code has expired");
  });

  it("should return MFA setup when no MFA credentials exist", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: true,
      email: "test@example.com",
    });
    mockRepo.getUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 100,
        email: "test@example.com",
        name: "Test User",
        organisationId: 1,
      });
    mockRepo.getOrCreateOrganisation.mockResolvedValue(1);
    mockRepo.getOrCreateUser.mockResolvedValue(100);
    mockRepo.listMfaCredentials.mockResolvedValue([]);

    const request = makeRequest("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", code: "123456" }),
    });

    const response = await verifyCodeController(request, mockEnv);
    const data = (await response.json()) as {
      status: string;
      mode: string;
      challengeToken: string;
      methods: string[];
    };

    expect(response.status).toBe(200);
    expect(data.status).toBe("mfa_required");
    expect(data.mode).toBe("setup");
    expect(data.methods).toContain("totp");
    expect(data.methods).toContain("webauthn");
  });

  it("should create organisation and user for new email", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: true,
      email: "newuser@newcompany.com",
    });
    mockRepo.getUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 200,
        email: "newuser@newcompany.com",
        name: null,
        organisationId: 2,
      });
    mockRepo.getOrCreateOrganisation.mockResolvedValue(2);
    mockRepo.getOrCreateUser.mockResolvedValue(200);
    mockRepo.listMfaCredentials.mockResolvedValue([]);

    const request = makeRequest("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "newuser@newcompany.com", code: "123456" }),
    });

    await verifyCodeController(request, mockEnv);

    expect(mockRepo.getOrCreateOrganisation).toHaveBeenCalledWith(
      "newcompany.com",
    );
    expect(mockRepo.getOrCreateUser).toHaveBeenCalledWith(
      "newuser@newcompany.com",
      2,
    );
    expect(mockRepo.createAuthChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 200 }),
    );
  });

  it("should use workspace invite organisation when invite exists", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: true,
      email: "invitee@external.com",
    });
    mockRepo.getPendingWorkspaceInviteByEmail.mockResolvedValue({
      id: 19,
      organisationId: 42,
      email: "invitee@external.com",
    });
    mockRepo.getUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 501,
        email: "invitee@external.com",
        name: null,
        organisationId: 42,
      });
    mockRepo.getOrCreateUser.mockResolvedValue(501);
    mockRepo.listMfaCredentials.mockResolvedValue([]);

    const request = makeRequest("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "invitee@external.com", code: "123456" }),
    });

    await verifyCodeController(request, mockEnv);

    expect(mockRepo.getOrCreateOrganisation).not.toHaveBeenCalled();
    expect(mockRepo.getOrCreateUser).toHaveBeenCalledWith(
      "invitee@external.com",
      42,
    );
    expect(mockRepo.markWorkspaceInviteAccepted).toHaveBeenCalledWith(19, 501);
  });

  it("should hash code before validation", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: true,
      email: "test@example.com",
    });
    mockRepo.getUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 100,
        email: "test@example.com",
        name: "Test User",
        organisationId: 1,
      });
    mockRepo.getOrCreateOrganisation.mockResolvedValue(1);
    mockRepo.getOrCreateUser.mockResolvedValue(100);
    mockRepo.listMfaCredentials.mockResolvedValue([]);

    const request = makeRequest("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", code: "654321" }),
    });

    await verifyCodeController(request, mockEnv);

    expect(utils.hashToken).toHaveBeenCalledWith("654321");
  });
});

describe("getCurrentUserController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
    } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getUserByEmail: vi.fn(),
      getOrganisationById: vi.fn(),
      getOrganisationMembers: vi.fn(),
      listPendingWorkspaceInvites: vi.fn(),
      getUserTeams: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const request = makeRequest("https://test.com/auth/me", {
      method: "GET",
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when Authorization header does not start with Bearer", async () => {
    const request = makeRequest("https://test.com/auth/me", {
      method: "GET",
      headers: { Authorization: "Basic token" },
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when session is invalid", async () => {
    mockRepo.validateSession.mockResolvedValue(null);

    const request = makeRequest("https://test.com/auth/me", {
      method: "GET",
      headers: { Authorization: "Bearer invalid-token" },
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired session");
  });

  it("should return 404 when user is not found", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 100,
      email: "test@example.com",
    });
    mockRepo.getUserByEmail.mockResolvedValue(null);

    const request = makeRequest("https://test.com/auth/me", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return user data and teams for valid session", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 100,
      email: "test@example.com",
    });
    mockRepo.getUserByEmail.mockResolvedValue({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });
    mockRepo.getOrganisationById.mockResolvedValue({
      id: 1,
      domain: "example.com",
      name: "Example",
      logoUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockRepo.getOrganisationMembers.mockResolvedValue([]);
    mockRepo.listPendingWorkspaceInvites.mockResolvedValue([]);
    mockRepo.getUserTeams.mockResolvedValue([
      { id: 1, name: "Team Alpha", organisationId: 1, ownerId: 100 },
      { id: 2, name: "Team Beta", organisationId: 1, ownerId: 100 },
    ]);

    const request = makeRequest("https://test.com/auth/me", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = (await response.json()) as {
      user: { id: number; email: string; name: string; organisationId: number };
      organisation: { id: number; name: string };
      teams: {
        id: number;
        name: string;
        organisationId: number;
        ownerId: number;
      }[];
    };

    expect(response.status).toBe(200);
    expect(data.user).toEqual({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });
    expect(data.teams).toHaveLength(2);
    expect(data.organisation.name).toBe("Example");
    expect(data.teams[0].name).toBe("Team Alpha");
  });

  it("should extract token from Bearer header correctly", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 100,
      email: "test@example.com",
    });
    mockRepo.getUserByEmail.mockResolvedValue({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });
    mockRepo.getOrganisationById.mockResolvedValue({
      id: 1,
      domain: "example.com",
      name: "Example",
      logoUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockRepo.getOrganisationMembers.mockResolvedValue([]);
    mockRepo.listPendingWorkspaceInvites.mockResolvedValue([]);
    mockRepo.getUserTeams.mockResolvedValue([]);

    const request = makeRequest("https://test.com/auth/me", {
      method: "GET",
      headers: { Authorization: "Bearer my-session-token-123" },
    });

    await getCurrentUserController(request, mockEnv);

    expect(utils.hashToken).toHaveBeenCalledWith("my-session-token-123");
  });

  it("should accept session token from cookie", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 100,
      email: "test@example.com",
    });
    mockRepo.getUserByEmail.mockResolvedValue({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });
    mockRepo.getOrganisationById.mockResolvedValue({
      id: 1,
      domain: "example.com",
      name: "Example",
      logoUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockRepo.getOrganisationMembers.mockResolvedValue([]);
    mockRepo.listPendingWorkspaceInvites.mockResolvedValue([]);
    mockRepo.getUserTeams.mockResolvedValue([]);

    const request = makeRequest("https://test.com/auth/me", {
      method: "GET",
      headers: { Cookie: "workspace_session=cookie-session-token" },
    });

    const response = await getCurrentUserController(request, mockEnv);

    expect(response.status).toBe(200);
    expect(utils.hashToken).toHaveBeenCalledWith("cookie-session-token");
  });
});

describe("logoutController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
    } as AuthWorkerEnv;

    mockRepo = {
      invalidateSession: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const request = makeRequest("https://test.com/auth/logout", {
      method: "POST",
    });

    const response = await logoutController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when Authorization header is invalid", async () => {
    const request = makeRequest("https://test.com/auth/logout", {
      method: "POST",
      headers: { Authorization: "InvalidFormat token" },
    });

    const response = await logoutController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should successfully logout and invalidate session", async () => {
    mockRepo.invalidateSession.mockResolvedValue(undefined);

    const request = makeRequest("https://test.com/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await logoutController(request, mockEnv);
    const data = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
    expect(mockRepo.invalidateSession).toHaveBeenCalledWith("hashed-token");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("workspace_session=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("should hash token before invalidation", async () => {
    mockRepo.invalidateSession.mockResolvedValue(undefined);

    const request = makeRequest("https://test.com/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer my-session-token" },
    });

    await logoutController(request, mockEnv);

    expect(utils.hashToken).toHaveBeenCalledWith("my-session-token");
    expect(mockRepo.invalidateSession).toHaveBeenCalledWith("hashed-token");
  });
});

describe("mfa setup", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
    } as AuthWorkerEnv;

    mockRepo = {
      getAuthChallengeByTokenHash: vi.fn(),
      updateAuthChallengeMetadata: vi.fn(),
      getUserById: vi.fn(),
      listMfaCredentials: vi.fn(),
      createTotpCredential: vi.fn(),
      storeRecoveryCodes: vi.fn(),
      markAuthChallengeUsed: vi.fn(),
      logAuditEvent: vi.fn(),
      createSession: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-challenge");
    vi.mocked(utils.generateToken).mockResolvedValue("session-token-123");
  });

  it("should start TOTP setup and return secret", async () => {
    mockRepo.getAuthChallengeByTokenHash.mockResolvedValue({
      id: 1,
      userId: 10,
      type: "setup",
      usedAt: null,
      expiresAt: Date.now() + 60000,
      metadata: null,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 10,
      email: "user@example.com",
    });
    mockRepo.listMfaCredentials.mockResolvedValue([]);

    const request = makeRequest("https://test.com/auth/mfa/setup/start", {
      method: "POST",
      body: JSON.stringify({ challengeToken: "challenge", method: "totp" }),
    });

    const response = await startMfaSetupController(request, mockEnv);
    const data = (await response.json()) as {
      method: string;
      secret: string;
      otpauthUrl: string;
    };

    expect(response.status).toBe(200);
    expect(data.method).toBe("totp");
    expect(data.secret).toMatch(/^[A-Z2-7]+$/);
    expect(data.otpauthUrl).toContain("otpauth://totp/");
    expect(mockRepo.updateAuthChallengeMetadata).toHaveBeenCalledWith(
      1,
      expect.stringContaining("secretEncrypted"),
      "totp",
    );
  });

  it("should use Origin header when creating WebAuthn setup metadata", async () => {
    mockRepo.getAuthChallengeByTokenHash.mockResolvedValue({
      id: 3,
      userId: 10,
      type: "setup",
      usedAt: null,
      expiresAt: Date.now() + 60000,
      metadata: null,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 10,
      email: "user@example.com",
    });
    mockRepo.listMfaCredentials.mockResolvedValue([]);

    const request = makeRequest("https://internal.dev/auth/mfa/setup/start", {
      method: "POST",
      headers: {
        Origin: "https://sprintjam.localhost:5173",
      },
      body: JSON.stringify({
        challengeToken: "challenge",
        method: "webauthn",
      }),
    });

    const response = await startMfaSetupController(request, mockEnv);
    const data = (await response.json()) as {
      method: string;
      options: { rp: { id: string } };
    };

    expect(response.status).toBe(200);
    expect(data.method).toBe("webauthn");
    expect(data.options.rp.id).toBe("sprintjam.localhost");
    expect(mockRepo.updateAuthChallengeMetadata).toHaveBeenCalledWith(
      3,
      expect.any(String),
      "webauthn",
    );

    const metadataPayload =
      mockRepo.updateAuthChallengeMetadata.mock.calls[0]?.[1];
    const metadata = JSON.parse(metadataPayload) as {
      challenge: string;
      origin: string;
      rpId: string;
    };

    expect(metadata.origin).toBe("https://sprintjam.localhost:5173");
    expect(metadata.rpId).toBe("sprintjam.localhost");
    expect(metadata.challenge).toBeTruthy();
  });

  it("should verify TOTP setup and issue a session", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const cipher = new utils.TokenCipher("test-secret");
    const secretEncrypted = await cipher.encrypt(secret);
    const code = await utils.generateTotpCode(secret, Date.now());

    mockRepo.getAuthChallengeByTokenHash.mockResolvedValue({
      id: 2,
      userId: 11,
      type: "setup",
      usedAt: null,
      expiresAt: Date.now() + 60000,
      metadata: JSON.stringify({ secretEncrypted }),
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 11,
      email: "user@example.com",
      name: null,
      organisationId: 1,
    });
    mockRepo.listMfaCredentials.mockResolvedValue([]);
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session-123");

    const request = makeRequest("https://test.com/auth/mfa/setup/verify", {
      method: "POST",
      body: JSON.stringify({
        challengeToken: "challenge",
        method: "totp",
        code,
      }),
    });

    const response = await verifyMfaSetupController(request, mockEnv);
    const data = (await response.json()) as {
      status: string;
      recoveryCodes: string[];
      user: { id: number };
    };

    expect(response.status).toBe(200);
    expect(data.status).toBe("authenticated");
    expect(data.recoveryCodes).toHaveLength(8);
    expect(mockRepo.createTotpCredential).toHaveBeenCalledWith(
      11,
      secretEncrypted,
    );
    expect(mockRepo.createSession).toHaveBeenCalledWith(
      11,
      "hashed-session-123",
      expect.any(Number),
    );
    expect(mockRepo.markAuthChallengeUsed).toHaveBeenCalledWith(2);
  });
});

describe("mfa verify", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
    } as AuthWorkerEnv;

    mockRepo = {
      getAuthChallengeByTokenHash: vi.fn(),
      getUserById: vi.fn(),
      consumeRecoveryCode: vi.fn(),
      markAuthChallengeUsed: vi.fn(),
      logAuditEvent: vi.fn(),
      createSession: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session-123");
    vi.mocked(utils.generateToken).mockResolvedValue("session-token-123");
  });

  it("should verify a recovery code and issue a session", async () => {
    mockRepo.getAuthChallengeByTokenHash.mockResolvedValue({
      id: 3,
      userId: 12,
      type: "verify",
      usedAt: null,
      expiresAt: Date.now() + 60000,
      metadata: null,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 12,
      email: "user@example.com",
      name: null,
      organisationId: 2,
    });
    mockRepo.consumeRecoveryCode.mockResolvedValue(true);

    const request = makeRequest("https://test.com/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({
        challengeToken: "challenge",
        method: "recovery",
        code: "ABCD-1234",
      }),
    });

    const response = await verifyMfaController(request, mockEnv);
    const data = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(data.status).toBe("authenticated");
    expect(mockRepo.createSession).toHaveBeenCalledWith(
      12,
      "hashed-session-123",
      expect.any(Number),
    );
  });
});
