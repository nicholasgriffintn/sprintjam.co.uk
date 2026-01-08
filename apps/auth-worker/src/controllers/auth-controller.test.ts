import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";
import * as utils from "@sprintjam/utils";
import * as services from "@sprintjam/services";

import {
  requestMagicLinkController,
  verifyCodeController,
  getCurrentUserController,
  logoutController,
} from "./auth-controller";
import { WorkspaceAuthRepository } from "../repositories/workspace-auth";

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
      createMagicLink: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.generateVerificationCode).mockReturnValue("123456");
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-code-123");
    vi.mocked(services.sendVerificationCodeEmail).mockResolvedValue(undefined);
  });

  it("should return error when email is missing", async () => {
    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email is required");
  });

  it("should return error when email format is invalid", async () => {
    const request = new Request("https://test.com/auth/request", {
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

    const request = new Request("https://test.com/auth/request", {
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

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(data.error).toContain("Workspace allowlist is unavailable");
  });

  it("should return 403 when domain is not allowed", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(false);

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@notallowed.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toContain("not authorized for workspace access");
  });

  it("should return 500 when verification code creation fails", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockRejectedValue(new Error("DB Error"));

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toContain("Unable to create a verification code");
  });

  it("should return 500 when email sending fails", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);
    vi.mocked(services.sendVerificationCodeEmail).mockRejectedValue(
      new Error("Email Error"),
    );

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to send verification code email");
  });

  it("should successfully send verification code for valid email", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = new Request("https://test.com/auth/request", {
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
  });

  it("should generate correct verification code and hash it", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = new Request("https://test.com/auth/request", {
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
});

describe("verifyCodeController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
    } as AuthWorkerEnv;

    mockRepo = {
      validateVerificationCode: vi.fn(),
      getOrCreateOrganisation: vi.fn(),
      getOrCreateUser: vi.fn(),
      createSession: vi.fn(),
      getUserByEmail: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.generateToken).mockResolvedValue("session-token-123");
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session-123");
  });

  it("should return error when email or code is missing", async () => {
    const request = new Request("https://test.com/auth/verify", {
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

    const request = new Request("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", code: "000000" }),
    });

    const response = await verifyCodeController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid verification code");
  });

  it("should return 401 when verification code is expired", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: false,
      error: "expired",
    });

    const request = new Request("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", code: "123456" }),
    });

    const response = await verifyCodeController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Verification code has expired");
  });

  it("should successfully verify code and create session", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: true,
      email: "test@example.com",
    });
    mockRepo.getOrCreateOrganisation.mockResolvedValue(1);
    mockRepo.getOrCreateUser.mockResolvedValue(100);
    mockRepo.getUserByEmail.mockResolvedValue({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });

    const request = new Request("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", code: "123456" }),
    });

    const response = await verifyCodeController(request, mockEnv);
    const data = (await response.json()) as {
      expiresAt: number;
      user: { id: number; email: string; name: string; organisationId: number };
    };

    expect(response.status).toBe(200);
    expect(data.expiresAt).toBeGreaterThan(Date.now());
    expect(data.user).toEqual({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("workspace_session=session-token-123");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
  });

  it("should create organisation and user for new email", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: true,
      email: "newuser@newcompany.com",
    });
    mockRepo.getOrCreateOrganisation.mockResolvedValue(2);
    mockRepo.getOrCreateUser.mockResolvedValue(200);
    mockRepo.getUserByEmail.mockResolvedValue({
      id: 200,
      email: "newuser@newcompany.com",
      name: null,
      organisationId: 2,
    });

    const request = new Request("https://test.com/auth/verify", {
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
    expect(mockRepo.createSession).toHaveBeenCalledWith(
      200,
      "hashed-session-123",
      expect.any(Number),
    );
  });

  it("should hash code before validation", async () => {
    mockRepo.validateVerificationCode.mockResolvedValue({
      success: true,
      email: "test@example.com",
    });
    mockRepo.getOrCreateOrganisation.mockResolvedValue(1);
    mockRepo.getOrCreateUser.mockResolvedValue(100);
    mockRepo.getUserByEmail.mockResolvedValue({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });

    const request = new Request("https://test.com/auth/verify", {
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
      getUserTeams: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const request = new Request("https://test.com/auth/me", {
      method: "GET",
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when Authorization header does not start with Bearer", async () => {
    const request = new Request("https://test.com/auth/me", {
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

    const request = new Request("https://test.com/auth/me", {
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

    const request = new Request("https://test.com/auth/me", {
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
    mockRepo.getUserTeams.mockResolvedValue([
      { id: 1, name: "Team Alpha", organisationId: 1, ownerId: 100 },
      { id: 2, name: "Team Beta", organisationId: 1, ownerId: 100 },
    ]);

    const request = new Request("https://test.com/auth/me", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = (await response.json()) as {
      user: { id: number; email: string; name: string; organisationId: number };
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
    mockRepo.getUserTeams.mockResolvedValue([]);

    const request = new Request("https://test.com/auth/me", {
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
    mockRepo.getUserTeams.mockResolvedValue([]);

    const request = new Request("https://test.com/auth/me", {
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
    const request = new Request("https://test.com/auth/logout", {
      method: "POST",
    });

    const response = await logoutController(request, mockEnv);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when Authorization header is invalid", async () => {
    const request = new Request("https://test.com/auth/logout", {
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

    const request = new Request("https://test.com/auth/logout", {
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

    const request = new Request("https://test.com/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer my-session-token" },
    });

    await logoutController(request, mockEnv);

    expect(utils.hashToken).toHaveBeenCalledWith("my-session-token");
    expect(mockRepo.invalidateSession).toHaveBeenCalledWith("hashed-token");
  });
});
