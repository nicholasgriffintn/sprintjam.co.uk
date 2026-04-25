const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: SECURITY_HEADERS,
  });
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: SECURITY_HEADERS,
  });
}

export function getCookieValue(
  request: Request,
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

export function getSessionTokenFromRequest(request: Request): string | null {
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

export function createRoomSessionCookie(
  token: string,
  maxAgeSeconds: number,
  isSecure = true,
  roomKey?: string,
): string {
  const secureFlag = isSecure ? " Secure;" : "";
  const normalizedRoomKey = roomKey?.trim().toUpperCase();
  const hasStructuredRoomKey = Boolean(
    normalizedRoomKey && /^[A-Z0-9]{4,6}$/.test(normalizedRoomKey),
  );
  const cookieValue = hasStructuredRoomKey
    ? `${normalizedRoomKey}:${token}`
    : token;

  return `room_session=${cookieValue}; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearRoomSessionCookie(isSecure = true): string {
  const secureFlag = isSecure ? " Secure;" : "";
  return `room_session=; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=0`;
}

export function getRoomSessionToken(request: Request): string | null {
  const parsed = parseRoomSessionCookie(request);
  return parsed?.token ?? null;
}

export function getRoomSessionTokenForRoom(
  request: Request,
  roomKey?: string | null,
): string | null {
  const parsed = parseRoomSessionCookie(request);
  if (!parsed) {
    return null;
  }

  const requestedRoomKey = roomKey?.trim().toUpperCase();
  if (parsed.roomKey && parsed.roomKey !== requestedRoomKey) {
    return null;
  }

  return parsed.token;
}

export function getWheelSessionToken(request: Request): string | null {
  return getCookieValue(request, "wheel_session");
}

export function getStandupSessionToken(request: Request): string | null {
  return getCookieValue(request, "standup_session");
}

export function createStandupSessionCookie(
  token: string,
  maxAgeSeconds: number,
  isSecure = true,
): string {
  const secureFlag = isSecure ? " Secure;" : "";
  return `standup_session=${token}; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearStandupSessionCookie(isSecure = true): string {
  const secureFlag = isSecure ? " Secure;" : "";
  return `standup_session=; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=0`;
}

export function createWheelSessionCookie(
  token: string,
  maxAgeSeconds: number,
  isSecure = true,
): string {
  const secureFlag = isSecure ? " Secure;" : "";
  return `wheel_session=${token}; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearWheelSessionCookie(isSecure = true): string {
  const secureFlag = isSecure ? " Secure;" : "";
  return `wheel_session=; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=0`;
}

function parseRoomSessionCookie(
  request: Request,
): { token: string; roomKey: string | null } | null {
  const rawValue = getCookieValue(request, "room_session");
  if (!rawValue) {
    return null;
  }

  const separatorIndex = rawValue.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex >= rawValue.length - 1) {
    return {
      token: rawValue,
      roomKey: null,
    };
  }

  const roomKey = rawValue.slice(0, separatorIndex).toUpperCase();
  const token = rawValue.slice(separatorIndex + 1);

  if (!/^[A-Z0-9]{4,6}$/.test(roomKey)) {
    return {
      token: rawValue,
      roomKey: null,
    };
  }

  return {
    token,
    roomKey,
  };
}

const ALLOWED_ORIGINS = [
  "https://sprintjam.co.uk",
  "https://staging.sprintjam.co.uk",
];

const DEV_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/([a-z0-9-]+\.)*localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function isAllowedOrigin(
  origin: string | null,
  isDevelopment = false,
): boolean {
  if (!origin) {
    return false;
  }

  if ((ALLOWED_ORIGINS as readonly string[]).includes(origin)) {
    return true;
  }

  if (isDevelopment) {
    return DEV_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
  }

  return false;
}

const MAX_BODY_SIZE = 100 * 1024; // 100KB

export function validateRequestBodySize(
  request: Request,
  maxSize = MAX_BODY_SIZE,
): { ok: true } | { ok: false; response: Response } {
  const contentLength = parseInt(
    request.headers.get("Content-Length") || "0",
    10,
  );

  if (contentLength > maxSize) {
    return { ok: false, response: jsonError("Request too large", 413) };
  }

  return { ok: true };
}
