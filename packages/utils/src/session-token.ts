import { SESSION_TOKEN_TTL_MS } from "./room-cypto";

interface IsSessionTokenValidOptions {
  storedToken?: string | null;
  providedToken?: string | null;
  createdAt?: number | null;
  now?: number;
  ttlMs?: number;
}

export function isSessionTokenExpired(
  createdAt?: number | null,
  now = Date.now(),
  ttlMs = SESSION_TOKEN_TTL_MS,
): boolean {
  if (typeof createdAt !== "number") {
    return false;
  }

  return now - createdAt > ttlMs;
}

export function isSessionTokenValid({
  storedToken,
  providedToken,
  createdAt,
  now = Date.now(),
  ttlMs = SESSION_TOKEN_TTL_MS,
}: IsSessionTokenValidOptions): boolean {
  if (!storedToken || !providedToken) {
    return false;
  }

  if (isSessionTokenExpired(createdAt, now, ttlMs)) {
    return false;
  }

  return storedToken === providedToken;
}
