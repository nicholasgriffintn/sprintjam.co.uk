import type { Request as CfRequest } from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";
import { getRoomStub } from "@sprintjam/utils";

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
