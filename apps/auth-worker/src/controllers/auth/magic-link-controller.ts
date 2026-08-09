import { AuthError } from "@ngriffin_uk/auth-core";
import { sendVerificationCodeEmail } from "@sprintjam/services";
import type { AuthWorkerEnv } from "@sprintjam/types";

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  EMAIL_REGEX,
  enforceEmailAndIpRateLimit,
  getRequestMeta,
  isMfaMethod,
} from "../../lib/auth-helpers";
import { createSprintJamMagicLinkAuth } from "../../lib/shared-auth";
import {
  getWorkspaceMagicLinkEligibility,
  resolveWorkspaceAuthUser,
  type WorkspaceMagicLinkEligibility,
  WorkspaceAccessError,
} from "../../lib/workspace-auth-user";

export async function requestMagicLinkController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{ email?: string }>();
  const email = body?.email?.toLowerCase().trim();
  if (!email) return jsonError("Email is required", 400, "email_required");
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
  if (rateLimitResponse) return rateLimitResponse;

  const repo = new WorkspaceAuthRepository(env.DB);
  const { ip, userAgent } = getRequestMeta(request);
  let eligibility: WorkspaceMagicLinkEligibility;
  try {
    eligibility = await getWorkspaceMagicLinkEligibility(repo, email);
  } catch (error) {
    console.error("Failed to check workspace eligibility.", error);
    try {
      await repo.logAuditEvent({
        email,
        event: "magic_link_request",
        status: "failure",
        reason: "domain_check_failed",
        ip,
        userAgent,
      });
    } catch (auditError) {
      console.error(
        "Failed to record workspace eligibility failure.",
        auditError,
      );
    }
    return jsonError(
      "Service temporarily unavailable",
      503,
      "workspace_eligibility_unavailable",
    );
  }
  if (!eligibility.allowed) {
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
  if (!env.SEND_EMAIL) {
    return jsonError(
      "Verification code email is disabled in this environment.",
      500,
      "verification_code_email_disabled",
    );
  }

  try {
    const auth = createSprintJamMagicLinkAuth(env, {
      resolveUser: (candidate) => resolveWorkspaceAuthUser(env, candidate),
      send: async (delivery) => {
        await sendVerificationCodeEmail({
          email: delivery.email,
          code: delivery.token,
          sendEmail: env.SEND_EMAIL,
        });
      },
    });
    const result = await auth.providers["magic-link"].request(email);
    if (!result) {
      return jsonError(
        "Unable to create a verification code.",
        500,
        "verification_code_creation_failed",
      );
    }
    await repo.logAuditEvent({
      email,
      event: "magic_link_request",
      status: "success",
      reason: eligibility.reason,
      ip,
      userAgent,
    });
    return jsonResponse(result);
  } catch {
    console.error("Failed to send verification code email.");
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
}

export async function verifyCodeController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    code?: string;
  }>();
  const challengeToken = body?.challengeToken?.trim();
  const code = body?.code?.trim();
  if (!challengeToken || !code) {
    return jsonError(
      "Challenge token and code are required",
      400,
      "challenge_and_code_required",
    );
  }

  const { ip, userAgent } = getRequestMeta(request);
  try {
    const auth = createSprintJamMagicLinkAuth(env, {
      resolveUser: (email) => resolveWorkspaceAuthUser(env, email),
      send: async () => {},
    });
    const user = await auth.providers["magic-link"].verify({
      token: challengeToken,
      code,
    });
    const repo = new WorkspaceAuthRepository(env.DB);
    const credentials = await repo.listMfaCredentials(Number(user.id));
    const methods = Array.from(
      new Set(
        credentials
          .map((credential: { type: string }) => credential.type)
          .filter(isMfaMethod),
      ),
    );
    const mode = methods.length === 0 ? "setup" : "verify";
    const availableChallenges =
      mode === "setup" ? ["totp", "webauthn"] : methods;
    const selection = await auth.issueChallenge("sprintjam", "mfa_selection", {
      userId: user.id,
      email: user.email,
      mode,
      availableChallenges,
    });
    await repo.logAuditEvent({
      userId: Number(user.id),
      email: user.email,
      event: "magic_link_verify",
      status: "success",
      reason: mode === "setup" ? "mfa_setup_required" : "mfa_verify_required",
      ip,
      userAgent,
    });
    return jsonResponse({
      status:
        mode === "setup" ? "mfa_setup_required" : "mfa_challenge_required",
      challenge: {
        kind: "mfa_selection",
        continuationToken: selection.token,
        expiresAt: selection.expiresAt,
        parameters: {
          mode,
          availableChallenges,
        },
      },
    });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return jsonError(error.message, error.status, error.code);
    }
    if (error instanceof AuthError) {
      return jsonError(
        error.code === "challenge_expired"
          ? "Verification code has expired"
          : "Invalid verification code",
        401,
        error.code === "challenge_expired"
          ? "verification_code_expired"
          : "invalid_verification_code",
      );
    }
    throw error;
  }
}
