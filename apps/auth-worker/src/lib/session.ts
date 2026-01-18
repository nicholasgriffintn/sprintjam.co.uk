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
