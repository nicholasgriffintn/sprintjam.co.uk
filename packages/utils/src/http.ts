import type {
  Response as CfResponse,
  Request as CfRequest,
} from "@cloudflare/workers-types";

export function createJsonResponse(body: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export function jsonError(message: string, status = 400): CfResponse {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export function getCookieValue(
  request: CfRequest,
  cookieName: string,
): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === cookieName) {
      return value || null;
    }
  }

  return null;
}

export function getSessionTokenFromRequest(request: CfRequest): string | null {
  const cookieToken = getCookieValue(request, "workspace_session");
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

export function createSessionCookie(
  sessionToken: string,
  maxAgeSeconds: number,
): string {
  return `workspace_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return "workspace_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}
