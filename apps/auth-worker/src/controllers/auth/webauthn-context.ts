function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function getTrustedLocalhostSubdomainOrigin(
  request: Request,
): URL | undefined {
  const origin = request.headers.get("Origin");
  if (!origin) return undefined;

  try {
    const originUrl = new URL(origin);
    if (
      originUrl.protocol === "https:" &&
      originUrl.hostname.endsWith(".localhost")
    ) {
      return originUrl;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function getWebAuthnRequestContext(request: Request): {
  origin: string;
  rpId: string;
} {
  const requestUrl = new URL(request.url);
  const localhostSubdomainOrigin = isLoopbackHostname(requestUrl.hostname)
    ? getTrustedLocalhostSubdomainOrigin(request)
    : undefined;

  if (localhostSubdomainOrigin) {
    return {
      origin: localhostSubdomainOrigin.origin,
      rpId: localhostSubdomainOrigin.hostname,
    };
  }

  return {
    origin: requestUrl.origin,
    rpId: requestUrl.hostname,
  };
}
