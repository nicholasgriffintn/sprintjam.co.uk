import { AuthError } from "@ngriffin_uk/auth-core";
import * as services from "@sprintjam/services";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCurrentUserController,
  logoutController,
  requestMagicLinkController,
  startMfaSetupController,
  startMfaVerifyController,
  verifyCodeController,
  verifyMfaController,
  verifyMfaSetupController,
} from "./auth-controller";
import { createTestAuthWorkerEnv } from "../test/auth-worker-env";

const authMocks = vi.hoisted(() => ({
  touchSession: vi.fn(),
  consumeChallenge: vi.fn(),
  createChallenge: vi.fn(),
  finishAuthentication: vi.fn(),
  finishRegistration: vi.fn(),
  issueChallenge: vi.fn(),
  magicLinkRequest: vi.fn(),
  magicLinkVerify: vi.fn(),
  readChallenge: vi.fn(),
  revokeSession: vi.fn(),
  startAuthentication: vi.fn(),
  startOtpSetup: vi.fn(),
  startRegistration: vi.fn(),
  verifyOtpChallenge: vi.fn(),
  verifyOtpRecoveryCode: vi.fn(),
  verifyOtpSetup: vi.fn(),
}));

const dependencyMocks = vi.hoisted(() => ({
  createSprintJamAuth: vi.fn(),
  createSprintJamMagicLinkAuth: vi.fn(),
  createSprintJamOtpAuth: vi.fn(),
  createSprintJamWebAuthnAuth: vi.fn(),
  workspaceAuthRepository: vi.fn(),
}));

vi.mock("../repositories/workspace-auth", () => ({
  WorkspaceAuthRepository: dependencyMocks.workspaceAuthRepository,
}));

vi.mock("../lib/shared-auth", async () => {
  const actual = await vi.importActual("../lib/shared-auth");
  return {
    ...actual,
    createSprintJamAuth: dependencyMocks.createSprintJamAuth,
    createSprintJamMagicLinkAuth: dependencyMocks.createSprintJamMagicLinkAuth,
    createSprintJamOtpAuth: dependencyMocks.createSprintJamOtpAuth,
    createSprintJamWebAuthnAuth: dependencyMocks.createSprintJamWebAuthnAuth,
  };
});

vi.mock("@sprintjam/services");

const env = createTestAuthWorkerEnv();

const authUser = {
  id: "12",
  email: "user@example.com",
  name: "Test User",
  organisationId: 2,
  workspaceRole: "member" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const authenticatedResult = {
  status: "authenticated",
  session: {
    token: "session-token",
    expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    user: authUser,
  },
};

const setupSelection = {
  payload: {
    userId: authUser.id,
    email: authUser.email,
    mode: "setup",
    availableChallenges: ["totp", "webauthn"],
  },
};

const verifySelection = {
  payload: {
    userId: authUser.id,
    email: authUser.email,
    mode: "verify",
    availableChallenges: ["totp"],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  dependencyMocks.createSprintJamAuth.mockReturnValue({
    touchSession: authMocks.touchSession,
    consumeChallenge: authMocks.consumeChallenge,
    issueChallenge: authMocks.issueChallenge,
    readChallenge: authMocks.readChallenge,
    revokeSession: authMocks.revokeSession,
  });
  dependencyMocks.createSprintJamMagicLinkAuth.mockReturnValue({
    issueChallenge: authMocks.issueChallenge,
    providers: {
      "magic-link": {
        request: authMocks.magicLinkRequest,
        verify: authMocks.magicLinkVerify,
      },
    },
  });
  dependencyMocks.createSprintJamOtpAuth.mockReturnValue({
    providers: {
      otp: {
        createChallenge: authMocks.createChallenge,
        startSetup: authMocks.startOtpSetup,
        verifyChallenge: authMocks.verifyOtpChallenge,
        verifyRecoveryCode: authMocks.verifyOtpRecoveryCode,
        verifySetup: authMocks.verifyOtpSetup,
      },
    },
  });
  dependencyMocks.createSprintJamWebAuthnAuth.mockReturnValue({
    providers: {
      webauthn: {
        finishAuthentication: authMocks.finishAuthentication,
        finishRegistration: authMocks.finishRegistration,
        startAuthentication: authMocks.startAuthentication,
        startRegistration: authMocks.startRegistration,
      },
    },
  });
  vi.mocked(services.sendVerificationCodeEmail).mockResolvedValue(undefined);
});

describe("requestMagicLinkController", () => {
  const repository = {
    getActiveOrganisationMembershipByEmail: vi.fn(),
    getPendingWorkspaceInviteByEmail: vi.fn(),
    isDomainAllowed: vi.fn(),
    logAuditEvent: vi.fn(),
  };

  beforeEach(() => {
    repository.getActiveOrganisationMembershipByEmail.mockResolvedValue(null);
    repository.getPendingWorkspaceInviteByEmail.mockResolvedValue(null);
    repository.isDomainAllowed.mockResolvedValue(true);
    repository.logAuditEvent.mockResolvedValue(undefined);
    dependencyMocks.workspaceAuthRepository.mockImplementation(function () {
      return repository;
    });
    authMocks.magicLinkRequest.mockResolvedValue({
      status: "verification_required",
      challenge: {
        kind: "magic_link",
        continuationToken: "challenge-token",
        expiresAt: new Date("2026-01-01T00:10:00.000Z"),
        parameters: { mode: "code" },
      },
    });
  });

  it.each([
    [{}, "Email is required", "email_required"],
    [{ email: "not-an-email" }, "Invalid email format", "invalid_email_format"],
  ])("rejects invalid input", async (body, message, code) => {
    const response = await requestMagicLinkController(
      new Request("https://test.com/auth/request", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code, message, error: message });
    expect(authMocks.magicLinkRequest).not.toHaveBeenCalled();
  });

  it("rejects an email without workspace eligibility", async () => {
    repository.isDomainAllowed.mockResolvedValue(false);

    const response = await requestMagicLinkController(
      new Request("https://test.com/auth/request", {
        method: "POST",
        body: JSON.stringify({ email: "user@blocked.example" }),
      }),
      env,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({ code: "domain_not_allowed" }),
    );
    expect(repository.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@blocked.example",
        event: "magic_link_request",
        reason: "domain_not_allowed",
        status: "failure",
      }),
    );
    expect(authMocks.magicLinkRequest).not.toHaveBeenCalled();
  });

  it("returns a service error when eligibility storage is unavailable", async () => {
    repository.isDomainAllowed.mockRejectedValue(new Error("D1 unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await requestMagicLinkController(
      new Request("https://test.com/auth/request", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      env,
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "workspace_eligibility_unavailable",
      message: "Service temporarily unavailable",
      error: "Service temporarily unavailable",
    });
    expect(authMocks.magicLinkRequest).not.toHaveBeenCalled();
    expect(repository.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        event: "magic_link_request",
        reason: "domain_check_failed",
        status: "failure",
      }),
    );
  });

  it.each([
    ["invite", { id: 1, organisationId: 2 }, null, "code_sent_for_invite"],
    [
      "membership",
      null,
      { organisationId: 2, status: "active" },
      "code_sent_for_existing_member",
    ],
  ])(
    "allows an existing %s when the domain is blocked",
    async (_case, invite, membership, reason) => {
      repository.isDomainAllowed.mockResolvedValue(false);
      repository.getPendingWorkspaceInviteByEmail.mockResolvedValue(invite);
      repository.getActiveOrganisationMembershipByEmail.mockResolvedValue(
        membership,
      );

      const response = await requestMagicLinkController(
        new Request("https://test.com/auth/request", {
          method: "POST",
          body: JSON.stringify({ email: "USER@EXTERNAL.EXAMPLE" }),
        }),
        env,
      );

      expect(response.status).toBe(200);
      expect(authMocks.magicLinkRequest).toHaveBeenCalledWith(
        "user@external.example",
      );
      expect(repository.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ reason, status: "success" }),
      );
    },
  );

  it("maps magic-link delivery to the email service", async () => {
    dependencyMocks.createSprintJamMagicLinkAuth.mockImplementation(
      (_authEnv, options) => ({
        providers: {
          "magic-link": {
            request: async (email: string) => {
              await options.send({
                email,
                token: "123456",
                expiresAt: new Date("2026-01-01T00:10:00.000Z"),
              });
              return {
                status: "verification_required",
                challenge: {
                  kind: "magic_link",
                  continuationToken: "challenge-token",
                  expiresAt: new Date("2026-01-01T00:10:00.000Z"),
                  parameters: { mode: "code" },
                },
              };
            },
          },
        },
      }),
    );

    const response = await requestMagicLinkController(
      new Request("https://test.com/auth/request", {
        method: "POST",
        body: JSON.stringify({ email: " user@example.com " }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(services.sendVerificationCodeEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      code: "123456",
      sendEmail: env.SEND_EMAIL,
    });
  });

  it("returns a stable error when delivery fails", async () => {
    authMocks.magicLinkRequest.mockRejectedValue(new Error("provider detail"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await requestMagicLinkController(
      new Request("https://test.com/auth/request", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      env,
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "verification_code_email_failed",
      message: "Failed to send verification code email",
      error: "Failed to send verification code email",
    });
    expect(repository.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "magic_link_email_failed",
        status: "failure",
      }),
    );
  });
});

describe("verifyCodeController", () => {
  const repository = {
    listMfaCredentials: vi.fn(),
    logAuditEvent: vi.fn(),
  };

  beforeEach(() => {
    repository.listMfaCredentials.mockResolvedValue([]);
    repository.logAuditEvent.mockResolvedValue(undefined);
    dependencyMocks.workspaceAuthRepository.mockImplementation(function () {
      return repository;
    });
    authMocks.magicLinkVerify.mockResolvedValue(authUser);
    authMocks.issueChallenge.mockResolvedValue({
      token: "selection-token",
      expiresAt: new Date("2026-01-01T00:10:00.000Z"),
    });
  });

  it("requires a challenge token and code", async () => {
    const response = await verifyCodeController(
      new Request("https://test.com/auth/verify", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: "challenge_and_code_required",
      message: "Challenge token and code are required",
      error: "Challenge token and code are required",
    });
  });

  it.each([
    ["invalid_credentials", "Invalid verification code"],
    ["challenge_expired", "Verification code has expired"],
  ] as const)("maps %s to a safe response", async (errorCode, message) => {
    authMocks.magicLinkVerify.mockRejectedValue(new AuthError(errorCode));

    const response = await verifyCodeController(
      new Request("https://test.com/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token",
          code: "123456",
        }),
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(
      expect.objectContaining({ message, error: message }),
    );
  });

  it("issues an MFA setup selection when no credentials exist", async () => {
    const response = await verifyCodeController(
      new Request("https://test.com/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token",
          code: "123456",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.magicLinkVerify).toHaveBeenCalledWith({
      token: "challenge-token",
      code: "123456",
    });
    expect(authMocks.issueChallenge).toHaveBeenCalledWith(
      "sprintjam",
      "mfa_selection",
      {
        userId: authUser.id,
        email: authUser.email,
        mode: "setup",
        availableChallenges: ["totp", "webauthn"],
      },
    );
    expect(await response.json()).toEqual({
      status: "mfa_setup_required",
      challenge: {
        kind: "mfa_selection",
        continuationToken: "selection-token",
        expiresAt: "2026-01-01T00:10:00.000Z",
        parameters: {
          mode: "setup",
          availableChallenges: ["totp", "webauthn"],
        },
      },
    });
  });

  it("deduplicates supported MFA methods for an existing user", async () => {
    repository.listMfaCredentials.mockResolvedValue([
      { type: "totp" },
      { type: "totp" },
      { type: "unsupported" },
      { type: "webauthn" },
    ]);

    const response = await verifyCodeController(
      new Request("https://test.com/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token",
          code: "123456",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.issueChallenge).toHaveBeenCalledWith(
      "sprintjam",
      "mfa_selection",
      expect.objectContaining({
        mode: "verify",
        availableChallenges: ["totp", "webauthn"],
      }),
    );
    expect(await response.json()).toEqual(
      expect.objectContaining({ status: "mfa_challenge_required" }),
    );
  });
});

describe("session controllers", () => {
  const repository = {
    getOrganisationMembership: vi.fn(),
    getOrganisationTeams: vi.fn(),
    getTeamMembership: vi.fn(),
    getUserByEmail: vi.fn(),
    isOrganisationAdmin: vi.fn(),
  };

  beforeEach(() => {
    dependencyMocks.workspaceAuthRepository.mockImplementation(function () {
      return repository;
    });
    authMocks.touchSession.mockResolvedValue({ user: authUser });
    authMocks.revokeSession.mockResolvedValue(undefined);
    repository.getUserByEmail.mockResolvedValue({
      id: 12,
      email: authUser.email,
      name: authUser.name,
      avatar: null,
      organisationId: authUser.organisationId,
    });
    repository.getOrganisationMembership.mockResolvedValue({
      role: "member",
      status: "active",
    });
    repository.isOrganisationAdmin.mockResolvedValue(false);
    repository.getOrganisationTeams.mockResolvedValue([]);
    repository.getTeamMembership.mockResolvedValue(null);
  });

  it.each([
    ["missing", {}],
    ["invalid", { Authorization: "Basic token" }],
  ])("rejects a %s session credential", async (_case, headers) => {
    const response = await getCurrentUserController(
      new Request("https://test.com/auth/me", { headers }),
      env,
    );

    expect(response.status).toBe(401);
    expect(authMocks.touchSession).not.toHaveBeenCalled();
  });

  it("rejects a session that shared auth cannot authenticate", async () => {
    authMocks.touchSession.mockResolvedValue(null);

    const response = await getCurrentUserController(
      new Request("https://test.com/auth/me", {
        headers: { Authorization: "Bearer invalid-token" },
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(authMocks.touchSession).toHaveBeenCalledWith("invalid-token");
  });

  it("returns the active workspace profile and access-filtered teams", async () => {
    repository.getOrganisationTeams.mockResolvedValue([
      {
        id: 1,
        name: "Open team",
        organisationId: 2,
        ownerId: 99,
        accessPolicy: "open",
      },
      {
        id: 2,
        name: "Restricted team",
        organisationId: 2,
        ownerId: 99,
        accessPolicy: "restricted",
      },
    ]);
    repository.getTeamMembership
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ role: "member", status: "pending" });

    const response = await getCurrentUserController(
      new Request("https://test.com/auth/me", {
        headers: { Cookie: "workspace_session=cookie-token" },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.touchSession).toHaveBeenCalledWith("cookie-token");
    expect(await response.json()).toEqual({
      user: {
        id: 12,
        email: authUser.email,
        name: authUser.name,
        avatar: null,
        organisationId: 2,
      },
      membership: { role: "member", status: "active" },
      teams: [
        expect.objectContaining({ name: "Open team", canAccess: true }),
        expect.objectContaining({
          name: "Restricted team",
          canAccess: false,
          currentUserStatus: "pending",
        }),
      ],
    });
  });

  it("rejects a user without an active workspace membership", async () => {
    repository.getOrganisationMembership.mockResolvedValue({
      role: "member",
      status: "pending",
    });

    const response = await getCurrentUserController(
      new Request("https://test.com/auth/me", {
        headers: { Authorization: "Bearer session-token" },
      }),
      env,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({ code: "workspace_access_inactive" }),
    );
  });

  it("revokes the raw session token and clears the cookie", async () => {
    const response = await logoutController(
      new Request("https://test.com/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer session-token" },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.revokeSession).toHaveBeenCalledWith("session-token");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
});

describe("MFA setup controllers", () => {
  const repository = {
    deleteMfaCredentialsExcept: vi.fn(),
    deleteWebAuthnCredentials: vi.fn(),
    logAuditEvent: vi.fn(),
    replaceRecoveryCodes: vi.fn(),
  };

  beforeEach(() => {
    dependencyMocks.workspaceAuthRepository.mockImplementation(function () {
      return repository;
    });
    authMocks.readChallenge.mockResolvedValue(setupSelection);
    authMocks.consumeChallenge.mockResolvedValue(setupSelection);
    authMocks.startOtpSetup.mockResolvedValue({
      status: "mfa_setup_required",
      challenge: {
        kind: "otp_setup",
        continuationToken: "otp-setup-token",
        expiresAt: new Date("2026-01-01T00:10:00.000Z"),
        parameters: {
          secret: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
          uri: "otpauth://totp/SprintJam:user@example.com",
        },
      },
    });
    authMocks.verifyOtpSetup.mockResolvedValue(authenticatedResult);
    repository.deleteMfaCredentialsExcept.mockResolvedValue(undefined);
    repository.deleteWebAuthnCredentials.mockResolvedValue(undefined);
    repository.logAuditEvent.mockResolvedValue(undefined);
    repository.replaceRecoveryCodes.mockResolvedValue(undefined);
  });

  it("starts TOTP setup from an MFA selection challenge", async () => {
    const response = await startMfaSetupController(
      new Request("https://test.com/auth/mfa/setup/start", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "selection-token",
          method: "totp",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.readChallenge).toHaveBeenCalledWith(
      "selection-token",
      "sprintjam",
      ["mfa_selection"],
    );
    expect(authMocks.startOtpSetup).toHaveBeenCalledWith({
      userId: authUser.id,
      accountName: authUser.email,
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({
        challenge: expect.objectContaining({
          parameters: expect.objectContaining({
            selectionToken: "selection-token",
          }),
        }),
      }),
    );
  });

  it("uses the request context when starting WebAuthn registration", async () => {
    authMocks.startRegistration.mockResolvedValue({
      status: "webauthn_challenge_required",
      challenge: {
        kind: "webauthn_registration",
        continuationToken: "registration-token",
        expiresAt: new Date("2026-01-01T00:10:00.000Z"),
        parameters: { publicKey: { rp: { id: "internal.dev" } } },
      },
    });
    const request = new Request("https://internal.dev/auth/mfa/setup/start", {
      method: "POST",
      body: JSON.stringify({
        challengeToken: "selection-token",
        method: "webauthn",
      }),
    });

    const response = await startMfaSetupController(request, env);

    expect(response.status).toBe(200);
    expect(dependencyMocks.createSprintJamWebAuthnAuth).toHaveBeenCalledWith(
      request,
      env,
    );
    expect(authMocks.startRegistration).toHaveBeenCalledWith({
      userId: authUser.id,
      userName: authUser.email,
      displayName: authUser.email,
    });
  });

  it("verifies TOTP setup only after consuming the setup selection", async () => {
    const response = await verifyMfaSetupController(
      new Request("https://test.com/auth/mfa/setup/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "otp-setup-token",
          selectionToken: "selection-token",
          method: "totp",
          code: "123456",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.consumeChallenge).toHaveBeenCalledWith(
      "selection-token",
      "sprintjam",
      ["mfa_selection"],
    );
    expect(authMocks.verifyOtpSetup).toHaveBeenCalledWith({
      token: "otp-setup-token",
      code: "123456",
      expectedUserId: authUser.id,
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({
        status: "authenticated",
        user: expect.objectContaining({ id: 12 }),
      }),
    );
    expect(response.headers.get("Set-Cookie")).toContain("session-token");
  });

  it("rejects a verify-mode selection during setup", async () => {
    authMocks.readChallenge.mockResolvedValue(verifySelection);

    const response = await startMfaSetupController(
      new Request("https://test.com/auth/mfa/setup/start", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "selection-token",
          method: "totp",
        }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({ code: "challenge_mismatch" }),
    );
    expect(authMocks.startOtpSetup).not.toHaveBeenCalled();
  });
});

describe("MFA verification controllers", () => {
  const repository = { logAuditEvent: vi.fn() };

  beforeEach(() => {
    dependencyMocks.workspaceAuthRepository.mockImplementation(function () {
      return repository;
    });
    repository.logAuditEvent.mockResolvedValue(undefined);
    authMocks.consumeChallenge.mockResolvedValue(verifySelection);
    authMocks.createChallenge.mockResolvedValue({
      status: "mfa_challenge_required",
      challenge: {
        kind: "otp_challenge",
        continuationToken: "otp-challenge-token",
        expiresAt: new Date("2026-01-01T00:10:00.000Z"),
        parameters: {},
      },
    });
    authMocks.verifyOtpChallenge.mockResolvedValue(authenticatedResult);
    authMocks.verifyOtpRecoveryCode.mockResolvedValue(authUser);
    authMocks.issueChallenge.mockResolvedValue({
      token: "reset-selection-token",
      expiresAt: new Date("2026-01-01T00:10:00.000Z"),
    });
  });

  it("starts a TOTP-or-recovery challenge from a verify selection", async () => {
    const response = await startMfaVerifyController(
      new Request("https://test.com/auth/mfa/verify/start", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "selection-token",
          method: "totp",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.consumeChallenge).toHaveBeenCalledWith(
      "selection-token",
      "sprintjam",
      ["mfa_selection"],
    );
    expect(authMocks.createChallenge).toHaveBeenCalledWith(authUser.id);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        challenge: expect.objectContaining({
          parameters: { method: "totp_or_recovery" },
        }),
      }),
    );
  });

  it("verifies a numeric TOTP and creates an authenticated response", async () => {
    const response = await verifyMfaController(
      new Request("https://test.com/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "otp-challenge-token",
          method: "totp",
          code: "123456",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.verifyOtpChallenge).toHaveBeenCalledWith({
      token: "otp-challenge-token",
      code: "123456",
    });
    expect(authMocks.verifyOtpRecoveryCode).not.toHaveBeenCalled();
    expect(response.headers.get("Set-Cookie")).toContain("session-token");
  });

  it("consumes a recovery code and requires fresh MFA setup", async () => {
    const response = await verifyMfaController(
      new Request("https://test.com/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "otp-challenge-token",
          method: "totp",
          code: "ABCD-1234",
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(authMocks.verifyOtpRecoveryCode).toHaveBeenCalledWith({
      token: "otp-challenge-token",
      code: "ABCD-1234",
    });
    expect(authMocks.issueChallenge).toHaveBeenCalledWith(
      "sprintjam",
      "mfa_selection",
      {
        userId: authUser.id,
        email: authUser.email,
        mode: "setup",
        reset: true,
        availableChallenges: ["totp", "webauthn"],
      },
    );
    expect(await response.json()).toEqual({
      status: "mfa_setup_required",
      challenge: {
        kind: "mfa_selection",
        continuationToken: "reset-selection-token",
        expiresAt: "2026-01-01T00:10:00.000Z",
        parameters: {
          mode: "setup",
          reason: "recovery_reset_required",
          availableChallenges: ["totp", "webauthn"],
        },
      },
    });
  });

  it("requires a WebAuthn credential before invoking the verifier", async () => {
    const response = await verifyMfaController(
      new Request("https://test.com/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "webauthn-token",
          method: "webauthn",
        }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(authMocks.finishAuthentication).not.toHaveBeenCalled();
  });

  it("maps expired challenges without exposing internal state", async () => {
    authMocks.verifyOtpChallenge.mockRejectedValue(
      new AuthError("challenge_expired"),
    );

    const response = await verifyMfaController(
      new Request("https://test.com/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "expired-token",
          method: "totp",
          code: "123456",
        }),
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "challenge_expired",
      message: "Authentication challenge expired",
      error: "Authentication challenge expired",
    });
  });
});
