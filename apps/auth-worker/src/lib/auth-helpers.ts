import {
  createSessionCookie,
  generateToken,
  hashToken,
  bytesToBase64Url,
} from "@sprintjam/utils";

import { jsonError } from "./response";
import { SESSION_EXPIRY_MS } from "../constants";
import type { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import type { AuthWorkerEnv } from "@sprintjam/types";

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const MFA_RECOVERY_CODES_COUNT = 8;

export function getRequestMeta(request: Request) {
  return {
    ip: request.headers.get("cf-connecting-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export function createAuthResponse({
  sessionToken,
  expiresAt,
  user,
  recoveryCodes,
}: {
  sessionToken: string;
  expiresAt: number;
  user: {
    id: number;
    email: string;
    name: string | null;
    organisationId: number;
  };
  recoveryCodes?: string[];
}): Response {
  const maxAge = Math.floor(SESSION_EXPIRY_MS / 1000);
  const cookieValue = createSessionCookie(sessionToken, maxAge);

  return new Response(
    JSON.stringify({
      status: "authenticated",
      expiresAt,
      recoveryCodes,
      user,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieValue,
      },
    },
  );
}

type AuthChallenge = Awaited<
  ReturnType<WorkspaceAuthRepository["getAuthChallengeByTokenHash"]>
>;

type AuthChallengeRecord = NonNullable<AuthChallenge>;

export type AuthUserRecord = {
  id: number;
  email: string;
  name: string | null;
  organisationId: number;
};

export async function getChallengeOrError(
  repo: WorkspaceAuthRepository,
  challengeToken: string | undefined,
  type: "setup" | "verify",
): Promise<{ challenge: AuthChallengeRecord } | { response: Response }> {
  if (!challengeToken?.trim()) {
    return { response: jsonError("Challenge token is required", 400) };
  }

  const tokenHash = await hashToken(challengeToken);
  const challenge = await repo.getAuthChallengeByTokenHash(tokenHash);

  if (!challenge) {
    return { response: jsonError("Invalid or expired challenge", 401) };
  }

  if (challenge.type !== type) {
    return { response: jsonError("Invalid challenge type", 400) };
  }

  if (challenge.usedAt) {
    return { response: jsonError("Challenge already used", 409) };
  }

  if (challenge.expiresAt < Date.now()) {
    return { response: jsonError("Challenge expired", 401) };
  }

  return { challenge };
}

export async function getChallengeAndUserOrError(
  repo: WorkspaceAuthRepository,
  challengeToken: string | undefined,
  type: "setup" | "verify",
): Promise<{ challenge: AuthChallengeRecord; user: AuthUserRecord } | { response: Response }> {
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

export function parseChallengeMetadata<T>(
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

export async function createAuthenticatedSessionResponse(
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

export async function enforceEmailAndIpRateLimit(
  request: Request,
  env: AuthWorkerEnv,
  email: string,
  emailLimiter: AuthWorkerEnv["MAGIC_LINK_RATE_LIMITER"],
  emailKeyPrefix: string,
  exceededMessage: string,
): Promise<Response | null> {
  if (env.ENABLE_MAGIC_LINK_RATE_LIMIT !== "true") {
    return null;
  }

  if (!emailLimiter || !env.IP_RATE_LIMITER) {
    console.error("Rate limiters are not configured but rate limiting is enabled");
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success: emailRateLimitSuccess } = await emailLimiter.limit({
    key: `${emailKeyPrefix}:${email}`,
  });
  const { success: ipRateLimitSuccess } = await env.IP_RATE_LIMITER.limit({
    key: `${emailKeyPrefix.replace(":email", ":ip")}:${ip}`,
  });

  if (!emailRateLimitSuccess || !ipRateLimitSuccess) {
    return jsonError(exceededMessage, 429);
  }

  return null;
}

export function encodeUserIdForWebAuthn(userId: number): string {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const high = Math.floor(userId / 2 ** 32);
  const low = userId >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return bytesToBase64Url(new Uint8Array(buffer));
}
