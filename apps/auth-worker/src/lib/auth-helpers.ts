import type { AuthFlowResult } from "@ngriffin_uk/auth-protocol";
import { createSessionCookie } from "@sprintjam/utils";

import { jsonError } from "./response";
import { SESSION_EXPIRY_MS } from "../constants";
import type { AuthWorkerEnv } from "@sprintjam/types";
import type { SprintJamAuthUser } from "./shared-auth";

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isMfaMethod(value: string): value is "totp" | "webauthn" {
  return value === "totp" || value === "webauthn";
}

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

export function createAuthenticatedFlowResponse(
  result: AuthFlowResult<SprintJamAuthUser>,
  incompleteMessage: string,
  recoveryCodes?: string[],
): Response {
  if (result.status !== "authenticated") {
    return jsonError(incompleteMessage, 500);
  }
  const user = result.session.user;
  return createAuthResponse({
    sessionToken: result.session.token,
    expiresAt: result.session.expiresAt.getTime(),
    user: {
      id: Number(user.id),
      email: user.email,
      name: user.name,
      organisationId: user.organisationId,
    },
    ...(recoveryCodes ? { recoveryCodes } : {}),
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
    console.error(
      "Rate limiters are not configured but rate limiting is enabled",
    );
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
