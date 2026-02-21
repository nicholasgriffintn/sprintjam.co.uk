import type { AuthWorkerEnv } from "@sprintjam/types";
import {
  TokenCipher,
  buildTotpUri,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from "@sprintjam/utils";

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import { jsonError, jsonResponse } from "../../lib/response";
import {
  MFA_RECOVERY_CODES_COUNT,
  createAuthenticatedSessionResponse,
  encodeUserIdForWebAuthn,
  getChallengeAndUserOrError,
  getRequestMeta,
  parseChallengeMetadata,
} from "../../lib/auth-helpers";
import {
  createWebAuthnRegistrationOptions,
  verifyWebAuthnAttestation,
} from "../../lib/webauthn";
import { getWebAuthnRequestContext } from "./webauthn-context";

export async function startMfaSetupController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    method?: "totp" | "webauthn";
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
    "setup",
  );
  if ("response" in challengeAndUser) {
    return challengeAndUser.response;
  }
  const { challenge, user } = challengeAndUser;
  const setupMetadata = parseChallengeMetadata<{ allowMfaReset?: boolean }>(
    challenge.metadata,
  );

  const allowMfaReset = setupMetadata?.allowMfaReset === true;
  const existing = await repo.listMfaCredentials(user.id);
  if (existing.length > 0 && !allowMfaReset) {
    return jsonError("MFA already configured", 409);
  }

  if (method === "totp") {
    const secret = generateTotpSecret();
    const cipher = new TokenCipher(env.TOKEN_ENCRYPTION_SECRET);
    const secretEncrypted = await cipher.encrypt(secret);
    await repo.updateAuthChallengeMetadata(
      challenge.id,
      JSON.stringify({ secretEncrypted, allowMfaReset }),
      "totp",
    );

    return jsonResponse({
      method: "totp",
      secret,
      otpauthUrl: buildTotpUri({
        secret,
        account: user.email,
        issuer: "SprintJam",
      }),
    });
  }

  const { origin, rpId } = getWebAuthnRequestContext(request);
  const options = await createWebAuthnRegistrationOptions({
    rpId,
    rpName: "SprintJam",
    userId: encodeUserIdForWebAuthn(user.id),
    userName: user.email,
  });

  await repo.updateAuthChallengeMetadata(
    challenge.id,
    JSON.stringify({
      challenge: options.challenge,
      origin,
      rpId,
      allowMfaReset,
    }),
    "webauthn",
  );

  return jsonResponse({
    method: "webauthn",
    options,
  });
}

export async function verifyMfaSetupController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{
    challengeToken?: string;
    method?: "totp" | "webauthn";
    code?: string;
    credential?: {
      id: string;
      rawId: string;
      type: "public-key";
      clientExtensionResults: Record<string, unknown>;
      response: {
        clientDataJSON: string;
        attestationObject: string;
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
    "setup",
  );
  if ("response" in challengeAndUser) {
    return challengeAndUser.response;
  }
  const { challenge, user } = challengeAndUser;

  const { ip, userAgent } = getRequestMeta(request);
  let persistVerifiedCredential: (() => Promise<void>) | null = null;
  let shouldResetExistingMfa = false;

  if (method === "totp") {
    if (!body?.code?.trim()) {
      return jsonError("Verification code is required", 400);
    }

    const metadata = parseChallengeMetadata<{
      secretEncrypted?: string;
      allowMfaReset?: boolean;
    }>(challenge.metadata);

    if (!metadata?.secretEncrypted) {
      return jsonError("TOTP setup has not been started", 400);
    }
    shouldResetExistingMfa = metadata.allowMfaReset === true;

    const cipher = new TokenCipher(env.TOKEN_ENCRYPTION_SECRET);
    const secret = await cipher.decrypt(metadata.secretEncrypted);
    const isValid = await verifyTotpCode(secret, body.code);

    if (!isValid) {
      await repo.logAuditEvent({
        userId: user.id,
        email: user.email,
        event: "mfa_setup",
        status: "failure",
        reason: "totp_invalid",
        ip,
        userAgent,
      });
      return jsonError("Invalid authenticator code", 401);
    }

    const { secretEncrypted } = metadata;
    persistVerifiedCredential = () =>
      repo.createTotpCredential(user.id, secretEncrypted);
  } else {
    if (!body?.credential) {
      return jsonError("WebAuthn credential is required", 400);
    }

    const metadata = parseChallengeMetadata<{
      challenge?: string;
      origin?: string;
      rpId?: string;
      allowMfaReset?: boolean;
    }>(challenge.metadata);

    if (!metadata?.challenge || !metadata.origin || !metadata.rpId) {
      return jsonError("WebAuthn setup has not been started", 400);
    }
    shouldResetExistingMfa = metadata.allowMfaReset === true;

    try {
      const attestation = await verifyWebAuthnAttestation({
        response: body.credential,
        expectedChallenge: metadata.challenge,
        expectedOrigin: metadata.origin,
        expectedRpId: metadata.rpId,
      });

      persistVerifiedCredential = () =>
        repo.createWebAuthnCredential({
          userId: user.id,
          credentialId: attestation.credentialId,
          publicKey: attestation.publicKey,
          counter: attestation.counter,
        });
    } catch (error) {
      await repo.logAuditEvent({
        userId: user.id,
        email: user.email,
        event: "mfa_setup",
        status: "failure",
        reason: "webauthn_invalid",
        ip,
        userAgent,
      });
      return jsonError("Unable to verify WebAuthn credential", 401);
    }
  }

  if (!persistVerifiedCredential) {
    return jsonError("Unable to store MFA credential", 500);
  }

  if (shouldResetExistingMfa) {
    await repo.resetMfaConfiguration(user.id);
  }
  await persistVerifiedCredential();

  const recoveryCodes = generateRecoveryCodes(MFA_RECOVERY_CODES_COUNT);
  const recoveryHashes = await Promise.all(
    recoveryCodes.map((code) => hashRecoveryCode(code)),
  );
  await repo.storeRecoveryCodes(user.id, recoveryHashes);
  await repo.markAuthChallengeUsed(challenge.id);

  await repo.logAuditEvent({
    userId: user.id,
    email: user.email,
    event: "mfa_setup",
    status: "success",
    reason: method,
    ip,
    userAgent,
  });

  return createAuthenticatedSessionResponse(repo, user, recoveryCodes);
}
