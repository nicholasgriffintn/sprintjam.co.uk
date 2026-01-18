import { createSessionCookie, hashToken, bytesToBase64Url } from "@sprintjam/utils";

import { jsonError } from "./response";
import { SESSION_EXPIRY_MS } from "../constants";
import type { WorkspaceAuthRepository } from "../repositories/workspace-auth";

export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

export function encodeUserIdForWebAuthn(userId: number): string {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const high = Math.floor(userId / 2 ** 32);
  const low = userId >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return bytesToBase64Url(new Uint8Array(buffer));
}
