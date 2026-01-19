const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export function jsonResponse(body: unknown, status = 200): Response {
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

export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return jsonError(message, 401);
}

export function forbiddenResponse(message = 'Access denied'): Response {
  return jsonError(message, 403);
}

export function notFoundResponse(message = 'Not found'): Response {
  return jsonError(message, 404);
}
