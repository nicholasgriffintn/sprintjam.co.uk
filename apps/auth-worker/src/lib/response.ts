const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function defaultErrorCode(status: number): string {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "request_error";
}

export function jsonResponse(
  body: unknown,
  statusOrHeaders?: number | Record<string, string>,
): Response {
  const status = typeof statusOrHeaders === "number" ? statusOrHeaders : 200;
  const extraHeaders =
    typeof statusOrHeaders === "object" ? statusOrHeaders : undefined;
  return new Response(JSON.stringify(body), {
    status,
    headers: extraHeaders
      ? { ...SECURITY_HEADERS, ...extraHeaders }
      : SECURITY_HEADERS,
  });
}

export function jsonError(
  message: string,
  status = 400,
  code = defaultErrorCode(status),
): Response {
  return new Response(JSON.stringify({ code, message, error: message }), {
    status,
    headers: SECURITY_HEADERS,
  });
}

export function unauthorizedResponse(
  message = "Unauthorized",
  code = "unauthorized",
): Response {
  return jsonError(message, 401, code);
}

export function forbiddenResponse(
  message = "Access denied",
  code = "forbidden",
): Response {
  return jsonError(message, 403, code);
}

export function notFoundResponse(
  message = "Not found",
  code = "not_found",
): Response {
  return jsonError(message, 404, code);
}
