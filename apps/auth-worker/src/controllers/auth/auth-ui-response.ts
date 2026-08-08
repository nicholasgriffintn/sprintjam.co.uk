import { isRecord } from "@sprintjam/utils";

export async function adaptAuthUiClientResponse(
  response: Response,
): Promise<Response> {
  if (!response.ok) return response;
  const body: unknown = await response.json();
  if (!isRecord(body) || body.status !== "authenticated") {
    return jsonResponseWithHeaders(body, response.headers);
  }
  const recoveryCodes = Array.isArray(body.recoveryCodes)
    ? body.recoveryCodes.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const result = {
    status: "authenticated",
    ...(isRecord(body.user) ? { user: { profile: body.user } } : {}),
    ...(recoveryCodes.length ? { recoveryCodes } : {}),
  };
  return jsonResponseWithHeaders(result, response.headers);
}

function jsonResponseWithHeaders(
  body: unknown,
  sourceHeaders: Headers,
): Response {
  const headers = new Headers(sourceHeaders);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { headers });
}
