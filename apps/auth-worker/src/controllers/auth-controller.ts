import type { AuthWorkerEnv } from "@sprintjam/types";
import {
  generateToken,
  generateVerificationCode,
  hashToken,
  extractDomain,
  clearSessionCookie,
  TokenCipher,
  buildTotpUri,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from "@sprintjam/utils";
import { sendVerificationCodeEmail } from "@sprintjam/services";

import { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import { jsonError } from "../lib/response";
import { getSessionTokenFromRequest } from "../lib/session";
import {
  EMAIL_REGEX,
  MFA_RECOVERY_CODES_COUNT,
  getRequestMeta,
  createAuthResponse,
  getChallengeOrError,
  encodeUserIdForWebAuthn,
} from "../lib/auth-helpers";
import {
  AUTH_CHALLENGE_EXPIRY_MS,
  MAGIC_LINK_EXPIRY_MS,
  SESSION_EXPIRY_MS,
} from "../constants";
import {
  createWebAuthnAuthenticationOptions,
  createWebAuthnRegistrationOptions,
  verifyWebAuthnAssertion,
  verifyWebAuthnAttestation,
} from "../lib/webauthn";

function getWebAuthnRequestContext(request: Request): {
  origin: string;
  rpId: string;
} {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin) {
    try {
      const originUrl = new URL(requestOrigin);
      return {
        origin: originUrl.origin,
        rpId: originUrl.hostname,
      };
    } catch {
      // Fall through to request URL parsing if Origin is malformed.
    }
  }

  const requestUrl = new URL(request.url);
  return {
    origin: requestUrl.origin,
    rpId: requestUrl.hostname,
  };
}

type AuthChallengeRecord = NonNullable<
  Awaited<ReturnType<WorkspaceAuthRepository["getAuthChallengeByTokenHash"]>>
>;

type AuthUserRecord = {
  id: number;
  email: string;
  name: string | null;
  organisationId: number;
};

async function getChallengeAndUserOrError(
  repo: WorkspaceAuthRepository,
  challengeToken: string | undefined,
  type: "setup" | "verify",
): Promise<
  | { response: Response }
  | { challenge: AuthChallengeRecord; user: AuthUserRecord }
> {
  const challengeResult = await getChallengeOrError(repo, challengeToken, type);
  if ("response" in challengeResult) {
    return { response: challengeResult.response };
  }

  const challenge = challengeResult.challenge;
  const user = await repo.getUserById(challenge.userId);
  if (!user?.id || !user.email) {
    return { response: jsonError("User not found", 404) };
  }

  return {
    challenge,
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      organisationId: user.organisationId,
    },
  };
}

function parseChallengeMetadata<T>(
  metadata: string | null | undefined,
): T | null {
  if (!metadata) {
    return null;
  }

  try {
    return JSON.parse(metadata) as T;
  } catch {
    return null;
  }
}

async function createAuthenticatedSessionResponse(
  repo: WorkspaceAuthRepository,
  user: AuthUserRecord,
  recoveryCodes?: string[],
): Promise<Response> {
  const sessionToken = await generateToken();
  const sessionTokenHash = await hashToken(sessionToken);
  const sessionExpiresAt = Date.now() + SESSION_EXPIRY_MS;
  await repo.createSession(user.id, sessionTokenHash, sessionExpiresAt);

  return createAuthResponse({
    sessionToken,
    expiresAt: sessionExpiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organisationId: user.organisationId,
    },
    recoveryCodes,
  });
}

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

  if (env.ENABLE_MAGIC_LINK_RATE_LIMIT === "true") {
    if (!env.MAGIC_LINK_RATE_LIMITER || !env.IP_RATE_LIMITER) {
      console.error(
        "Rate limiters are not configured but rate limiting is enabled",
      );
      return jsonError("Service temporarily unavailable", 503);
    }

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

    const { success: emailRateLimitSuccess } =
      await env.MAGIC_LINK_RATE_LIMITER.limit({
        key: `magic-link:email:${email}`,
      });

    const { success: ipRateLimitSuccess } = await env.IP_RATE_LIMITER.limit({
      key: `magic-link:ip:${ip}`,
    });

    if (!emailRateLimitSuccess || !ipRateLimitSuccess) {
      return jsonError(
        "Rate limit exceeded. Please wait before requesting another magic link.",
        429,
      );
    }
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
    return jsonError(
      "Your email domain is not authorized for workspace access. Please contact your administrator.",
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

  return new Response(
    JSON.stringify({
      message: "Verification code sent to your email",
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
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

  if (env.ENABLE_MAGIC_LINK_RATE_LIMIT === "true") {
    if (!env.VERIFICATION_RATE_LIMITER || !env.IP_RATE_LIMITER) {
      console.error(
        "Rate limiters are not configured but rate limiting is enabled",
      );
      return jsonError("Service temporarily unavailable", 503);
    }

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

    const { success: verifyRateLimitSuccess } =
      await env.VERIFICATION_RATE_LIMITER.limit({
        key: `verify:email:${email}`,
      });

    const { success: ipRateLimitSuccess } = await env.IP_RATE_LIMITER.limit({
      key: `verify:ip:${ip}`,
    });

    if (!verifyRateLimitSuccess || !ipRateLimitSuccess) {
      return jsonError(
        "Too many verification attempts. Please wait before trying again.",
        429,
      );
    }
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

  return new Response(
    JSON.stringify({
      status: "mfa_required",
      mode: requiresSetup ? "setup" : "verify",
      challengeToken,
      methods: requiresSetup ? ["totp", "webauthn"] : methods,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

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

    return new Response(
      JSON.stringify({
        method: "totp",
        secret,
        otpauthUrl: buildTotpUri({
          secret,
          account: user.email,
          issuer: "SprintJam",
        }),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
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

  return new Response(
    JSON.stringify({
      method: "webauthn",
      options,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
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

  return new Response(
    JSON.stringify({
      method: "webauthn",
      options,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
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

    return new Response(
      JSON.stringify({
        status: "mfa_required",
        mode: "setup",
        challengeToken: resetChallengeToken,
        methods: ["totp", "webauthn"],
        reason: "recovery_reset_required",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
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

export async function getCurrentUserController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  const session = await repo.validateSession(tokenHash);
  if (!session) {
    return jsonError("Invalid or expired session", 401);
  }

  const user = await repo.getUserByEmail(session.email);
  if (!user?.id) {
    return jsonError("User not found", 404);
  }

  const teams = await repo.getUserTeams(user.id);
  const organisation = await repo.getOrganisationById(user.organisationId);
  if (!organisation) {
    return jsonError("Organisation not found", 404);
  }
  const members = await repo.getOrganisationMembers(user.organisationId);
  const invites = await repo.listPendingWorkspaceInvites(user.organisationId);

  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organisationId: user.organisationId,
      },
      organisation,
      teams,
      members,
      invites,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function logoutController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  await repo.invalidateSession(tokenHash);

  return new Response(
    JSON.stringify({
      message: "Logged out successfully",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      },
    },
  );
}
