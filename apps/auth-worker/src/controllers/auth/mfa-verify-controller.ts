import { AuthError, type AuthFlowResult } from "@ngriffin_uk/auth-core";
import type { WebAuthnAuthenticationResponse } from "@ngriffin_uk/auth-webauthn";
import type { AuthWorkerEnv } from "@sprintjam/types";

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import { createAuthResponse, getRequestMeta } from "../../lib/auth-helpers";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  createSprintJamAuth,
  createSprintJamOtpAuth,
  createSprintJamWebAuthnAuth,
  type SprintJamAuthUser,
} from "../../lib/shared-auth";

export async function startMfaVerifyController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    method?: "totp" | "webauthn";
  }>();
  if (!body.challengeToken || !body.method) {
    return jsonError("Challenge token and MFA method are required", 400);
  }

  try {
    const baseAuth = createSprintJamAuth(env);
    const selection = await baseAuth.consumeChallenge(
      body.challengeToken,
      "sprintjam",
      ["mfa_selection"],
    );
    requireMode(selection.payload, "verify");
    const userId = payloadUserId(selection.payload);
    if (body.method === "totp") {
      const result =
        await createSprintJamOtpAuth(env).providers.otp.createChallenge(userId);
      if (result.status !== "mfa_challenge_required") {
        throw new AuthError("unsupported_operation");
      }
      return jsonResponse({
        ...result,
        challenge: {
          ...result.challenge,
          parameters: {
            ...result.challenge.parameters,
            method: "totp_or_recovery",
          },
        },
      });
    }
    return jsonResponse(
      await createSprintJamWebAuthnAuth(
        request,
        env,
      ).providers.webauthn.startAuthentication(userId),
    );
  } catch (error) {
    return sharedAuthError(error);
  }
}

export async function verifyMfaController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    method?: "totp" | "webauthn";
    code?: string;
    credential?: WebAuthnAuthenticationResponse;
  }>();
  if (!body.challengeToken || !body.method) {
    return jsonError("MFA verification data is incomplete", 400);
  }

  try {
    let result: AuthFlowResult<SprintJamAuthUser>;
    const repo = new WorkspaceAuthRepository(env.DB);
    const { ip, userAgent } = getRequestMeta(request);

    if (body.method === "totp") {
      if (!body.code) return jsonError("Verification code is required", 400);
      const otp = createSprintJamOtpAuth(env).providers.otp;
      if (/^\d{6}$/u.test(body.code.trim())) {
        result = await otp.verifyChallenge({
          token: body.challengeToken,
          code: body.code,
        });
      } else {
        const user = await otp.verifyRecoveryCode({
          token: body.challengeToken,
          code: body.code,
        });
        const selection = await createSprintJamAuth(env).issueChallenge(
          "sprintjam",
          "mfa_selection",
          {
            userId: user.id,
            email: user.email,
            mode: "setup",
            reset: true,
            availableChallenges: ["totp", "webauthn"],
          },
        );
        await repo.logAuditEvent({
          userId: Number(user.id),
          email: user.email,
          event: "mfa_verify",
          status: "success",
          reason: "recovery_reset_required",
          ip,
          userAgent,
        });
        return jsonResponse({
          status: "mfa_setup_required",
          challenge: {
            kind: "mfa_selection",
            continuationToken: selection.token,
            expiresAt: selection.expiresAt,
            parameters: {
              mode: "setup",
              reason: "recovery_reset_required",
              availableChallenges: ["totp", "webauthn"],
            },
          },
        });
      }
    } else {
      if (!body.credential) {
        return jsonError("WebAuthn credential is required", 400);
      }
      result = await createSprintJamWebAuthnAuth(
        request,
        env,
      ).providers.webauthn.finishAuthentication({
        token: body.challengeToken,
        response: body.credential,
      });
    }

    if (result.status !== "authenticated") {
      return jsonError("MFA verification did not complete", 500);
    }
    const user = result.session.user;
    await repo.logAuditEvent({
      userId: Number(user.id),
      email: user.email,
      event: "mfa_verify",
      status: "success",
      reason: body.method,
      ip,
      userAgent,
    });
    return createAuthResponse({
      sessionToken: result.session.token,
      expiresAt: result.session.expiresAt.getTime(),
      user: {
        id: Number(user.id),
        email: user.email,
        name: user.name,
        organisationId: user.organisationId,
      },
    });
  } catch (error) {
    return sharedAuthError(error);
  }
}

function payloadUserId(payload: Readonly<Record<string, unknown>>): string {
  const value = payload["userId"];
  if (typeof value !== "string") throw new AuthError("challenge_mismatch");
  return value;
}

function requireMode(
  payload: Readonly<Record<string, unknown>>,
  mode: "setup" | "verify",
): void {
  if (payload["mode"] !== mode) throw new AuthError("challenge_mismatch");
}

function sharedAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    const expired = error.code === "challenge_expired";
    return jsonError(
      expired ? "Authentication challenge expired" : error.message,
      expired ? 401 : 400,
      error.code,
    );
  }
  throw error;
}
