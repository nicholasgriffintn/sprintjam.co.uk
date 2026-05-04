export function getWebAuthnRequestContext(request: Request): {
  origin: string;
  rpId: string;
} {
  const requestUrl = new URL(request.url);
  return {
    origin: requestUrl.origin,
    rpId: requestUrl.hostname,
  };
}
