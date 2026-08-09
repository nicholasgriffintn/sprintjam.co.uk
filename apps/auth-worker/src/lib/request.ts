export function requestWithJsonBody(
  request: Request,
  body: Readonly<Record<string, unknown>>,
): Request {
  return new Request(request.url, {
    body: JSON.stringify(body),
    headers: request.headers,
    method: "POST",
  });
}
