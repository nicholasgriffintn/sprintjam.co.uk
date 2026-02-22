import type { AuthWorkerEnv } from "@sprintjam/types";
import { TokenCipher, generateToken, hashToken } from '@sprintjam/utils';

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  AUTH_CHALLENGE_EXPIRY_MS,
} from "../../constants";
import {
  createAuthenticatedSessionResponse,
  getChallengeAndUserOrError,
  getRequestMeta,
  parseChallengeMetadata,
} from "../../lib/auth-helpers";
import {
  createWebAuthnAuthenticationOptions,
  verifyWebAuthnAssertion,
} from "../../lib/webauthn";
import { getWebAuthnRequestContext } from "./webauthn-context";
import { verifyTotpCode, hashRecoveryCode } from '../../lib/mfa';

export async function startMfaVerifyController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    method?: "webauthn";
  }>();
  const challengeToken = body?.challengeToken;
  const method = body?.method;

  if (method !== "webauthn") {
    return jsonError("Unsupported verification method", 400);
  }

  const repo = new WorkspaceAuthRepository(env.DB);
  const challengeAndUser = await getChallengeAndUserOrError(
    repo,
    challengeToken,
    "verify",
  );
  if ("response" in challengeAndUser) {
    return challengeAndUser.response;
  }
  const { challenge, user } = challengeAndUser;

  const credentials = await repo.listWebAuthnCredentials(user.id);
  if (credentials.length === 0) {
    return jsonError("No WebAuthn credentials found", 404);
  }

  const { origin, rpId } = getWebAuthnRequestContext(request);
  const allowCredentials = credentials
    .map((cred: { credentialId: string | null }) => cred.credentialId)
    .filter((id): id is string => Boolean(id));

  const options = await createWebAuthnAuthenticationOptions({
    rpId,
    allowCredentials,
  });

  await repo.updateAuthChallengeMetadata(
    challenge.id,
    JSON.stringify({ challenge: options.challenge, origin, rpId }),
    "webauthn",
  );

  return jsonResponse({
    method: "webauthn",
    options,
  });
}

export async function verifyMfaController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    method?: "totp" | "webauthn" | "recovery";
    code?: string;
    credential?: {
      id: string;
      rawId: string;
      type: "public-key";
      clientExtensionResults: Record<string, unknown>;
      response: {
        clientDataJSON: string;
        authenticatorData: string;
        signature: string;
        userHandle?: string;
      };
    };
  }>();

  const challengeToken = body?.challengeToken;
  const method = body?.method;
  if (!method) {
    return jsonError("MFA method is required", 400);
  }

  const repo = new WorkspaceAuthRepository(env.DB);
  const challengeAndUser = await getChallengeAndUserOrError(
    repo,
    challengeToken,
    "verify",
  );
  if ("response" in challengeAndUser) {
    return challengeAndUser.response;
  }
  const { challenge, user } = challengeAndUser;

  const { ip, userAgent } = getRequestMeta(request);

  if (method === "totp") {
    if (!body?.code?.trim()) {
      return jsonError("Verification code is required", 400);
    }

    const credential = await repo.getTotpCredential(user.id);
    if (!credential?.secretEncrypted) {
      return jsonError("No TOTP credential found", 404);
    }

    const cipher = new TokenCipher(env.TOKEN_ENCRYPTION_SECRET);
    const secret = await cipher.decrypt(credential.secretEncrypted);
    const isValid = await verifyTotpCode(secret, body.code);

    if (!isValid) {
      await repo.logAuditEvent({
        userId: user.id,
        email: user.email,
        event: "mfa_verify",
        status: "failure",
        reason: "totp_invalid",
        ip,
        userAgent,
      });
      return jsonError("Invalid authenticator code", 401);
    }
  } else if (method === "recovery") {
    if (!body?.code?.trim()) {
      return jsonError("Recovery code is required", 400);
    }
    const codeHash = await hashRecoveryCode(body.code);
    const consumed = await repo.consumeRecoveryCode(user.id, codeHash);
    if (!consumed) {
      await repo.logAuditEvent({
        userId: user.id,
        email: user.email,
        event: "mfa_verify",
        status: "failure",
        reason: "recovery_invalid",
        ip,
        userAgent,
      });
      return jsonError("Invalid recovery code", 401);
    }

    const resetChallengeToken = await generateToken();
    const resetChallengeTokenHash = await hashToken(resetChallengeToken);
    await repo.createAuthChallenge({
      userId: user.id,
      tokenHash: resetChallengeTokenHash,
      type: "setup",
      metadata: JSON.stringify({ allowMfaReset: true }),
      expiresAt: Date.now() + AUTH_CHALLENGE_EXPIRY_MS,
    });
    await repo.markAuthChallengeUsed(challenge.id);

    await repo.logAuditEvent({
      userId: user.id,
      email: user.email,
      event: "mfa_verify",
      status: "success",
      reason: "recovery_reset_required",
      ip,
      userAgent,
    });

    return jsonResponse({
      status: "mfa_required",
      mode: "setup",
      challengeToken: resetChallengeToken,
      methods: ["totp", "webauthn"],
      reason: "recovery_reset_required",
    });
  } else {
    if (!body?.credential) {
      return jsonError("WebAuthn credential is required", 400);
    }

    const metadata = parseChallengeMetadata<{
      challenge?: string;
      origin?: string;
      rpId?: string;
    }>(challenge.metadata);

    if (!metadata?.challenge || !metadata.origin || !metadata.rpId) {
      return jsonError("WebAuthn verification has not been started", 400);
    }

    const storedCredential = await repo.getWebAuthnCredentialById(
      body.credential.id,
    );
    if (!storedCredential?.publicKey || !storedCredential.credentialId) {
      return jsonError("Unknown WebAuthn credential", 404);
    }

    try {
      const assertion = await verifyWebAuthnAssertion({
        response: body.credential,
        expectedChallenge: metadata.challenge,
        expectedOrigin: metadata.origin,
        expectedRpId: metadata.rpId,
        credential: {
          id: storedCredential.credentialId,
          publicKey: storedCredential.publicKey,
          counter: storedCredential.counter,
        },
      });

      if (assertion.counter > storedCredential.counter) {
        await repo.updateWebAuthnCounter(
          storedCredential.id,
          assertion.counter,
        );
      }
    } catch (error) {
      await repo.logAuditEvent({
        userId: user.id,
        email: user.email,
        event: "mfa_verify",
        status: "failure",
        reason: "webauthn_invalid",
        ip,
        userAgent,
      });
      return jsonError("Unable to verify WebAuthn assertion", 401);
    }
  }

  await repo.markAuthChallengeUsed(challenge.id);

  await repo.logAuditEvent({
    userId: user.id,
    email: user.email,
    event: "mfa_verify",
    status: "success",
    reason: method,
    ip,
    userAgent,
  });

  return createAuthenticatedSessionResponse(repo, user);
}
