import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";
import * as utils from "@sprintjam/utils";
import * as services from "@sprintjam/services";

import {
  requestMagicLinkController,
  verifyMagicLinkController,
  getCurrentUserController,
  logoutController,
} from "./auth-controller";
import { WorkspaceAuthRepository } from "../repositories/workspace-auth";

vi.mock("../repositories/workspace-auth");
vi.mock("@sprintjam/services");
vi.mock("@sprintjam/utils", async () => {
  const actual = await vi.importActual("@sprintjam/utils");
  return {
    ...actual,
    generateToken: vi.fn(),
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

    vi.mocked(WorkspaceAuthRepository).mockImplementation(() => mockRepo);
    vi.mocked(utils.generateToken).mockResolvedValue("mock-token-123");
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token-123");
    vi.mocked(services.sendMagicLinkEmail).mockResolvedValue(undefined);
  });

  it("should return error when email is missing", async () => {
    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email is required");
  });

  it("should return error when email format is invalid", async () => {
    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = await response.json();

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
      "hashed-token-123",
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
    const data = await response.json();

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
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not authorized for workspace access");
  });

  it("should return 500 when magic link creation fails", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockRejectedValue(new Error("DB Error"));

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Unable to create a magic link");
  });

  it("should return 500 when email sending fails", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);
    vi.mocked(services.sendMagicLinkEmail).mockRejectedValue(
      new Error("Email Error"),
    );

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to send magic link email");
  });

  it("should successfully send magic link for valid email", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await requestMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Magic link sent to your email");
    expect(services.sendMagicLinkEmail).toHaveBeenCalledWith({
      email: "test@example.com",
      magicLink: "https://test.com/auth/verify?token=mock-token-123",
      resendApiKey: "test-api-key",
    });
  });

  it("should generate correct magic link with token", async () => {
    mockRepo.isDomainAllowed.mockResolvedValue(true);
    mockRepo.createMagicLink.mockResolvedValue(undefined);

    const request = new Request("https://test.com/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });

    await requestMagicLinkController(request, mockEnv);

    expect(utils.generateToken).toHaveBeenCalled();
    expect(utils.hashToken).toHaveBeenCalledWith("mock-token-123");
    expect(mockRepo.createMagicLink).toHaveBeenCalledWith(
      "test@example.com",
      "hashed-token-123",
      expect.any(Number),
    );
  });
});

describe("verifyMagicLinkController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
    } as AuthWorkerEnv;

    mockRepo = {
      validateMagicLink: vi.fn(),
      getOrCreateOrganisation: vi.fn(),
      getOrCreateUser: vi.fn(),
      createSession: vi.fn(),
      getUserByEmail: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(() => mockRepo);
    vi.mocked(utils.generateToken).mockResolvedValue("session-token-123");
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session-123");
  });

  it("should return error when token is missing", async () => {
    const request = new Request("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await verifyMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Token is required");
  });

  it("should return 401 when magic link is invalid", async () => {
    mockRepo.validateMagicLink.mockResolvedValue(null);

    const request = new Request("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token: "invalid-token" }),
    });

    const response = await verifyMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired magic link");
  });

  it("should return 401 when magic link is expired", async () => {
    mockRepo.validateMagicLink.mockResolvedValue(null);

    const request = new Request("https://test.com/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token: "expired-token" }),
    });

    const response = await verifyMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired magic link");
  });

  it("should successfully verify magic link and create session", async () => {
    mockRepo.validateMagicLink.mockResolvedValue("test@example.com");
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
      body: JSON.stringify({ token: "valid-token" }),
    });

    const response = await verifyMagicLinkController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionToken).toBe("session-token-123");
    expect(data.expiresAt).toBeGreaterThan(Date.now());
    expect(data.user).toEqual({
      id: 100,
      email: "test@example.com",
      name: "Test User",
      organisationId: 1,
    });
  });

  it("should create organisation and user for new email", async () => {
    mockRepo.validateMagicLink.mockResolvedValue("newuser@newcompany.com");
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
      body: JSON.stringify({ token: "valid-token" }),
    });

    await verifyMagicLinkController(request, mockEnv);

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

  it("should hash token before validation", async () => {
    mockRepo.validateMagicLink.mockResolvedValue("test@example.com");
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
      body: JSON.stringify({ token: "plain-token" }),
    });

    await verifyMagicLinkController(request, mockEnv);

    expect(utils.hashToken).toHaveBeenCalledWith("plain-token");
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

    vi.mocked(WorkspaceAuthRepository).mockImplementation(() => mockRepo);
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-session");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const request = new Request("https://test.com/auth/me", {
      method: "GET",
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when Authorization header does not start with Bearer", async () => {
    const request = new Request("https://test.com/auth/me", {
      method: "GET",
      headers: { Authorization: "Basic token" },
    });

    const response = await getCurrentUserController(request, mockEnv);
    const data = await response.json();

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
    const data = await response.json();

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
    const data = await response.json();

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
    const data = await response.json();

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

    vi.mocked(WorkspaceAuthRepository).mockImplementation(() => mockRepo);
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const request = new Request("https://test.com/auth/logout", {
      method: "POST",
    });

    const response = await logoutController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when Authorization header is invalid", async () => {
    const request = new Request("https://test.com/auth/logout", {
      method: "POST",
      headers: { Authorization: "InvalidFormat token" },
    });

    const response = await logoutController(request, mockEnv);
    const data = await response.json();

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
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
    expect(mockRepo.invalidateSession).toHaveBeenCalledWith("hashed-token");
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
