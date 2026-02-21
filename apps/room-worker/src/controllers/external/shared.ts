import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";
import { escapeHtml, getRoomStub } from "@sprintjam/utils";

export async function validateSession(
  env: RoomWorkerEnv,
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<void> {
  if (!sessionToken) {
    throw new Error("Missing session token");
  }

  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request("https://internal/session/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName, sessionToken }),
    }) as unknown as CfRequest,
  );

  if (!response.ok) {
    const error = await response.json<{
      error?: string;
    }>();
    throw new Error(error.error || "Invalid session");
  }
}

export function parseOptionalLimit(limit: unknown): number | null {
  if (limit === undefined || limit === null) {
    return null;
  }

  if (typeof limit === "number") {
    return limit;
  }

  if (typeof limit === "string" && !Number.isNaN(Number(limit))) {
    return Number(limit);
  }

  return null;
}

export function parseOptionalNote(note: unknown): string {
  return typeof note === "string" ? note.trim() : "";
}

export function isAuthError(
  message: string,
  indicators: readonly string[],
): boolean {
  const lowerMessage = message.toLowerCase();
  return indicators.some((indicator) => lowerMessage.includes(indicator));
}

function oauthHtmlResponse(
  title: string,
  message: string,
  status: number,
  closeWindow = false,
): CfResponse {
  const closeScript = closeWindow ? "<script>window.close();</script>" : "";
  return new Response(
    `<html><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${closeScript}</body></html>`,
    { status, headers: { "Content-Type": "text/html" } },
  ) as unknown as CfResponse;
}

export function oauthHtmlErrorResponse(
  message: string,
  status = 400,
  closeWindow = false,
): CfResponse {
  return oauthHtmlResponse("OAuth Error", message, status, closeWindow);
}

export function oauthHtmlSuccessResponse(
  message: string,
  closeWindow = false,
): CfResponse {
  return oauthHtmlResponse("Success!", message, 200, closeWindow);
}

export async function fetchOAuthStatus<T>(
  roomObject: ReturnType<typeof getRoomStub>,
  provider: "jira" | "linear" | "github",
  payload: {
    roomKey: string;
    userName: string;
    sessionToken?: string | null;
  },
): Promise<T> {
  const response = await roomObject.fetch(
    new Request(`https://internal/${provider}/oauth/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(payload.sessionToken
          ? { Cookie: `room_session=${payload.sessionToken}` }
          : {}),
      },
      body: JSON.stringify(payload),
    }) as unknown as CfRequest,
  );

  if (!response.ok) {
    throw new Error("Failed to get OAuth status");
  }

  return response.json<T>();
}

export async function revokeOAuthCredentials(
  roomObject: ReturnType<typeof getRoomStub>,
  provider: "jira" | "linear" | "github",
  payload: {
    roomKey: string;
    userName: string;
    sessionToken?: string | null;
  },
): Promise<void> {
  const response = await roomObject.fetch(
    new Request(`https://internal/${provider}/oauth/revoke`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(payload.sessionToken
          ? { Cookie: `room_session=${payload.sessionToken}` }
          : {}),
      },
      body: JSON.stringify(payload),
    }) as unknown as CfRequest,
  );

  if (!response.ok) {
    throw new Error("Failed to revoke OAuth credentials");
  }
}
