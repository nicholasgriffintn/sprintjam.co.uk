import { createRecoveryCodes, hashRecoveryCode } from "@ngriffin_uk/auth-otp";
import type { AuthFlowResult } from "@ngriffin_uk/auth-protocol";
import type { WebAuthnRegistrationResponse } from "@ngriffin_uk/auth-webauthn";
import type { AuthWorkerEnv } from "@sprintjam/types";

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import {
  attachSelectionToken,
  createAuthChallengeErrorResponse,
  readChallengeEmail,
  readChallengeUserId,
  requireChallengeMode,
} from "../../lib/auth-challenge";
import {
  createAuthenticatedFlowResponse,
  getRequestMeta,
} from "../../lib/auth-helpers";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  createSprintJamAuth,
  createSprintJamOtpAuth,
  createSprintJamWebAuthnAuth,
  type SprintJamAuthUser,
} from "../../lib/shared-auth";

export async function startMfaSetupController(
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
    const selection = await readSetupSelection(env, body.challengeToken);
    const userId = readChallengeUserId(selection.payload);
    if (body.method === "totp") {
      const auth = createSprintJamOtpAuth(env);
      const result = await auth.providers.otp.startSetup({
        userId,
        accountName: readChallengeEmail(selection.payload),
      });
      return jsonResponse(attachSelectionToken(result, body.challengeToken));
    }

    const auth = createSprintJamWebAuthnAuth(request, env);
    const email = readChallengeEmail(selection.payload);
    const result = await auth.providers.webauthn.startRegistration({
      userId,
      userName: email,
      displayName: email,
    });
    return jsonResponse(attachSelectionToken(result, body.challengeToken));
  } catch (error) {
    return createAuthChallengeErrorResponse(error);
  }
}

export async function verifyMfaSetupController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    selectionToken?: string;
    method?: "totp" | "webauthn";
    code?: string;
    credential?: WebAuthnRegistrationResponse;
  }>();
  if (!body.challengeToken || !body.selectionToken || !body.method) {
    return jsonError("MFA setup data is incomplete", 400);
  }

  const baseAuth = createSprintJamAuth(env);
  try {
    const selection = await baseAuth.consumeChallenge(
      body.selectionToken,
      "sprintjam",
      ["mfa_selection"],
    );
    requireChallengeMode(selection.payload, "setup");
    const expectedUserId = readChallengeUserId(selection.payload);
    const reset = selection.payload["reset"] === true;
    let result: AuthFlowResult<SprintJamAuthUser>;
    let recoveryCodes: string[] | undefined;
    const repo = new WorkspaceAuthRepository(env.DB);

    if (body.method === "totp") {
      if (!body.code) return jsonError("Verification code is required", 400);
      result = await createSprintJamOtpAuth(env).providers.otp.verifySetup({
        token: body.challengeToken,
        code: body.code,
        expectedUserId,
      });
      if (reset) {
        await repo.deleteWebAuthnCredentials(Number(expectedUserId));
      }
    } else {
      if (!body.credential) {
        return jsonError("WebAuthn credential is required", 400);
      }
      result = await createSprintJamWebAuthnAuth(
        request,
        env,
      ).providers.webauthn.finishRegistration({
        token: body.challengeToken,
        response: body.credential,
        expectedUserId,
      });
      recoveryCodes = createRecoveryCodes(8);
      const hashes = await Promise.all(recoveryCodes.map(hashRecoveryCode));
      await repo.replaceRecoveryCodes(
        Number(expectedUserId),
        hashes.filter((hash): hash is string => hash !== null),
      );
      if (reset) {
        await repo.deleteMfaCredentialsExcept(
          Number(expectedUserId),
          body.credential.credentialId,
        );
      }
    }

    const { ip, userAgent } = getRequestMeta(request);
    await repo.logAuditEvent({
      userId: Number(expectedUserId),
      event: "mfa_setup",
      status: "success",
      reason: body.method,
      ip,
      userAgent,
    });
    return createAuthenticatedFlowResponse(
      result,
      "MFA setup did not complete",
      recoveryCodes,
    );
  } catch (error) {
    return createAuthChallengeErrorResponse(error);
  }
}

async function readSetupSelection(env: AuthWorkerEnv, token: string) {
  const selection = await createSprintJamAuth(env).readChallenge(
    token,
    "sprintjam",
    ["mfa_selection"],
  );
  requireChallengeMode(selection.payload, "setup");
  return selection;
}
