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
    return jsonError("Email is required", 400, "email_required");
  }

  if (!EMAIL_REGEX.test(email)) {
    return jsonError("Invalid email format", 400, "invalid_email_format");
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
  let activeMembership: Awaited<
    ReturnType<
      WorkspaceAuthRepository["getActiveOrganisationMembershipByEmail"]
    >
  > | null = null;
  try {
    isDomainAllowed = await repo.isDomainAllowed(domain);
    if (!isDomainAllowed) {
      pendingInvite = await repo.getPendingWorkspaceInviteByEmail(email);
      if (!pendingInvite) {
        activeMembership =
          await repo.getActiveOrganisationMembershipByEmail(email);
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
    return jsonError(
      "Service temporarily unavailable",
      503,
      "service_unavailable",
    );
  }

  if (!isDomainAllowed && !pendingInvite && !activeMembership) {
    await repo.logAuditEvent({
      email,
      event: "magic_link_request",
      status: "failure",
      reason: "domain_not_allowed",
      ip,
      userAgent,
    });
    return jsonError(
      "Your email domain is not authorized for workspace access. Please contact your administrator.",
      403,
      "domain_not_allowed",
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
      "verification_code_creation_failed",
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
    return jsonError(
      "Failed to send verification code email",
      500,
      "verification_code_email_failed",
    );
  }

  await repo.logAuditEvent({
    email,
    event: "magic_link_request",
    status: "success",
    reason: pendingInvite
      ? "code_sent_for_invite"
      : activeMembership
        ? "code_sent_for_existing_member"
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
    return jsonError(
      "Email and code are required",
      400,
      "email_and_code_required",
    );
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
    const errorCodes = {
      invalid: "invalid_verification_code",
      expired: "verification_code_expired",
      used: "verification_code_used",
      locked: "verification_code_locked",
    } as const;
    await repo.logAuditEvent({
      email,
      event: "magic_link_verify",
      status: "failure",
      reason: result.error,
      ip,
      userAgent,
    });
    return jsonError(
      errorMessages[result.error],
      401,
      errorCodes[result.error],
    );
  }

  const domain = extractDomain(result.email);
  const pendingInvite = await repo.getPendingWorkspaceInviteByEmail(
    result.email,
  );
  const existingUser = await repo.getUserByEmail(email);
  const activeMembership = await repo.getActiveOrganisationMembershipByEmail(
    result.email,
  );
  const isDomainAllowed = await repo.isDomainAllowed(domain);

  let organisationId: number;
  if (pendingInvite) {
    organisationId = pendingInvite.organisationId;
    if (existingUser && existingUser.organisationId !== organisationId) {
      await repo.updateUserOrganisation(existingUser.id, organisationId);
    }
  } else if (activeMembership) {
    organisationId = activeMembership.organisationId;
  } else if (isDomainAllowed) {
    organisationId = await repo.getOrCreateOrganisation(domain);
  } else {
    await repo.logAuditEvent({
      email,
      event: "magic_link_verify",
      status: "failure",
      reason: "membership_not_allowed",
      ip,
      userAgent,
    });
    return jsonError(
      "Your workspace access is not allowed",
      403,
      "workspace_access_not_allowed",
    );
  }

  const userId = await repo.getOrCreateUser(email, organisationId);
  await repo.setOrganisationOwnerIfNull(organisationId, userId);
  const organisation = await repo.getOrganisationById(organisationId);
  if (!organisation) {
    return jsonError("Organisation not found", 404, "organisation_not_found");
  }

  const role = organisation.ownerId === userId ? "admin" : "member";
  const existingMembership = await repo.getOrganisationMembership(
    userId,
    organisationId,
  );

  if (pendingInvite) {
    await repo.upsertWorkspaceMembership({
      organisationId,
      userId,
      role,
      status: "active",
      approvedById: pendingInvite.invitedById,
    });
    await repo.markWorkspaceInviteAccepted(pendingInvite.id, userId);
  } else if (!existingMembership || existingMembership.status !== "active") {
    if (organisation.requireMemberApproval && organisation.ownerId !== userId) {
      await repo.upsertWorkspaceMembership({
        organisationId,
        userId,
        role,
        status: "pending",
      });
      await repo.logAuditEvent({
        userId,
        email,
        event: "magic_link_verify",
        status: "failure",
        reason: "membership_pending_approval",
        ip,
        userAgent,
      });
      return jsonError(
        "Your workspace membership is pending approval",
        403,
        "workspace_membership_pending_approval",
      );
    }

    await repo.upsertWorkspaceMembership({
      organisationId,
      userId,
      role,
      status: "active",
      approvedById: organisation.ownerId === userId ? userId : null,
    });
  }

  const user = await repo.getUserByEmail(email);
  if (!user?.id) {
    return jsonError("User not found", 404, "user_not_found");
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
