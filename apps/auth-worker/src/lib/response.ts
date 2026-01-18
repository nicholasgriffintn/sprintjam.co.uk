export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function unauthorizedResponse(message = "Unauthorized"): Response {
  return jsonError(message, 401);
}

export function forbiddenResponse(message = "Access denied"): Response {
  return jsonError(message, 403);
}

export function notFoundResponse(message = "Not found"): Response {
  return jsonError(message, 404);
}
