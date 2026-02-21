export function getWebAuthnRequestContext(request: Request): {
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
