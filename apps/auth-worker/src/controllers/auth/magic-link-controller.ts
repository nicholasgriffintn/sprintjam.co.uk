import type { AuthWorkerEnv } from "@sprintjam/types";
import {
  extractDomain,
  generateToken,
  generateVerificationCode,
  hashToken,
} from "@sprintjam/utils";
import { sendVerificationCodeEmail } from "@sprintjam/services";

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  AUTH_CHALLENGE_EXPIRY_MS,
  MAGIC_LINK_EXPIRY_MS,
} from "../../constants";
import {
  EMAIL_REGEX,
  enforceEmailAndIpRateLimit,
  getRequestMeta,
} from "../../lib/auth-helpers";

export async function requestMagicLinkController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{ email?: string }>();
  const email = body?.email?.toLowerCase().trim();

  if (!email) {
    return jsonError("Email is required", 400);
  }

  if (!EMAIL_REGEX.test(email)) {
    return jsonError("Invalid email format", 400);
  }

  const rateLimitResponse = await enforceEmailAndIpRateLimit(
    request,
    env,
    email,
    env.MAGIC_LINK_RATE_LIMITER,
    "magic-link:email",
    "Rate limit exceeded. Please wait before requesting another magic link.",
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const domain = extractDomain(email);
  const repo = new WorkspaceAuthRepository(env.DB);
  const { ip, userAgent } = getRequestMeta(request);

  let isDomainAllowed = false;
  let pendingInvite: Awaited<
    ReturnType<WorkspaceAuthRepository["getPendingWorkspaceInviteByEmail"]>
  > | null = null;
  let existingUser: Awaited<
    ReturnType<WorkspaceAuthRepository["getUserByEmail"]>
  > | null = null;
  try {
    isDomainAllowed = await repo.isDomainAllowed(domain);
    if (!isDomainAllowed) {
      pendingInvite = await repo.getPendingWorkspaceInviteByEmail(email);
      if (!pendingInvite) {
        existingUser = await repo.getUserByEmail(email);
      }
    }
  } catch (error) {
    console.error("Failed to check domain allowlist:", error);
    await repo.logAuditEvent({
      email,
      event: "magic_link_request",
      status: "failure",
      reason: "domain_check_failed",
      ip,
      userAgent,
    });
    return jsonError("Service temporarily unavailable", 503);
  }

  if (!isDomainAllowed && !pendingInvite && !existingUser) {
    await repo.logAuditEvent({
      email,
      event: "magic_link_request",
      status: "failure",
      reason: "domain_not_allowed",
      ip,
      userAgent,
    });
    return jsonResponse(
      {
        error: "domain_not_allowed",
        message: "Your email domain is not authorized for workspace access. Please contact your administrator."
      },
      403,
    );
  }

  const code = generateVerificationCode();
  const codeHash = await hashToken(code);
  const expiresAt = Date.now() + MAGIC_LINK_EXPIRY_MS;

  try {
    await repo.createMagicLink(email, codeHash, expiresAt);
  } catch (error) {
    console.error("Failed to persist verification code:", error);
    await repo.logAuditEvent({
      email,
      event: "magic_link_request",
      status: "failure",
      reason: "magic_link_persist_failed",
      ip,
      userAgent,
    });
    return jsonError(
      "Unable to create a verification code right now. Please try again shortly.",
      500,
    );
  }

  try {
    await sendVerificationCodeEmail({
      email,
      code,
      resendApiKey: env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error("Failed to send verification code email:", error);
    await repo.logAuditEvent({
      email,
      event: "magic_link_request",
      status: "failure",
      reason: "magic_link_email_failed",
      ip,
      userAgent,
    });
    return jsonError("Failed to send verification code email", 500);
  }

  await repo.logAuditEvent({
    email,
    event: "magic_link_request",
    status: "success",
    reason: pendingInvite
      ? "code_sent_for_invite"
      : existingUser
        ? "code_sent_for_existing_user"
        : "code_sent",
    ip,
    userAgent,
  });

  return jsonResponse({ message: "Verification code sent to your email" });
}

export async function verifyCodeController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{ email?: string; code?: string }>();
  const email = body?.email?.toLowerCase().trim();
  const code = body?.code?.trim();

  if (!email || !code) {
    return jsonError("Email and code are required", 400);
  }

  const verifyRateLimitResponse = await enforceEmailAndIpRateLimit(
    request,
    env,
    email,
    env.VERIFICATION_RATE_LIMITER,
    "verify:email",
    "Too many verification attempts. Please wait before trying again.",
  );
  if (verifyRateLimitResponse) {
    return verifyRateLimitResponse;
  }

  const codeHash = await hashToken(code);
  const repo = new WorkspaceAuthRepository(env.DB);
  const { ip, userAgent } = getRequestMeta(request);

  const result = await repo.validateVerificationCode(email, codeHash);
  if (!result.success) {
    const errorMessages = {
      invalid: "Invalid verification code",
      expired: "Verification code has expired",
      used: "Verification code has already been used",
      locked: "Too many failed attempts. Please request a new code.",
    };
    await repo.logAuditEvent({
      email,
      event: "magic_link_verify",
      status: "failure",
      reason: result.error,
      ip,
      userAgent,
    });
    return jsonError(errorMessages[result.error], 401);
  }

  const domain = extractDomain(result.email);
  const pendingInvite = await repo.getPendingWorkspaceInviteByEmail(
    result.email,
  );
  const existingUser = await repo.getUserByEmail(email);

  let organisationId: number;
  if (pendingInvite) {
    organisationId = pendingInvite.organisationId;
    if (existingUser && existingUser.organisationId !== organisationId) {
      await repo.updateUserOrganisation(existingUser.id, organisationId);
    }
  } else if (existingUser) {
    organisationId = existingUser.organisationId;
  } else {
    organisationId = await repo.getOrCreateOrganisation(domain);
  }

  const userId = await repo.getOrCreateUser(email, organisationId);
  if (pendingInvite) {
    await repo.markWorkspaceInviteAccepted(pendingInvite.id, userId);
  }
  const user = await repo.getUserByEmail(email);
  if (!user?.id) {
    return jsonError("User not found", 404);
  }

  const existingMfa = await repo.listMfaCredentials(userId);
  const methods = Array.from(
    new Set(existingMfa.map((credential: { type: string }) => credential.type)),
  ) as Array<"totp" | "webauthn">;
  const requiresSetup = methods.length === 0;

  const challengeToken = await generateToken();
  const challengeTokenHash = await hashToken(challengeToken);
  await repo.createAuthChallenge({
    userId,
    tokenHash: challengeTokenHash,
    type: requiresSetup ? "setup" : "verify",
    expiresAt: Date.now() + AUTH_CHALLENGE_EXPIRY_MS,
  });

  await repo.logAuditEvent({
    userId,
    email,
    event: "magic_link_verify",
    status: "success",
    reason: requiresSetup ? "mfa_setup_required" : "mfa_verify_required",
    ip,
    userAgent,
  });

  return jsonResponse({
    status: "mfa_required",
    mode: requiresSetup ? "setup" : "verify",
    challengeToken,
    methods: requiresSetup ? ["totp", "webauthn"] : methods,
  });
}
