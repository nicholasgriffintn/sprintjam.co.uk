import type { StandupRoom } from "../../durable-objects/standup-room";
import type { StandupData, StandupWorkerEnv } from "@sprintjam/types";
import {
  hashPasscode,
  verifyPasscode,
  generateID,
  serializePasscodeHash,
  parsePasscodeHash,
} from "@sprintjam/utils";
import { jsonError } from "../../lib/response";

export interface StandupRoomHttpContext {
  repository: StandupRoom["repository"];
  getStandupData(): Promise<StandupData | undefined>;
  disconnectUserSessions(userName: string): void;
  env: StandupWorkerEnv;
}

export async function handleHttpRequest(
  context: StandupRoomHttpContext,
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/initialize" && request.method === "POST") {
    return handleInitialize(context, request);
  }

  if (path === "/join" && request.method === "POST") {
    return handleJoin(context, request);
  }

  return null;
}

function createStandupSessionCookie(
  token: string,
  env: StandupWorkerEnv,
): string {
  const secure = env.ENVIRONMENT === "development" ? "" : " Secure;";
  return `standup_session=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=86400`;
}

async function handleInitialize(
  context: StandupRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{
    standupKey: string;
    moderator: string;
    passcode?: string;
    avatar?: string;
    teamId?: number;
  }>();

  const { standupKey, moderator, passcode, avatar, teamId } = body;

  if (!standupKey || !moderator) {
    return jsonError("Standup key and moderator are required");
  }

  const existing = await context.getStandupData();
  if (existing) {
    return jsonError("Standup already exists", 409);
  }

  const passcodeHash = passcode ? await hashPasscode(passcode) : undefined;

  await context.repository.createStandup(
    standupKey,
    moderator,
    serializePasscodeHash(passcodeHash) ?? undefined,
    teamId,
  );

  const sessionToken = generateID();
  context.repository.setSessionToken(moderator, sessionToken);

  if (avatar) {
    context.repository.setUserAvatar(moderator, avatar);
  }

  const standupData = await context.getStandupData();

  return new Response(
    JSON.stringify({
      success: true,
      standup: standupData,
    }),
    {
      status: 200,
      headers: {
        "Set-Cookie": createStandupSessionCookie(sessionToken, context.env),
      },
    },
  );
}

async function handleJoin(
  context: StandupRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{
    name: string;
    passcode?: string;
    avatar?: string;
  }>();

  const { name, passcode, avatar } = body;

  if (!name) {
    return jsonError("Name is required");
  }

  const standupData = await context.getStandupData();
  if (!standupData) {
    return jsonError("Standup not found", 404);
  }

  const storedPasscode = context.repository.getPasscode();
  const parsedPasscode = parsePasscodeHash(storedPasscode);
  if (parsedPasscode) {
    if (!passcode) {
      return new Response(JSON.stringify({ error: "Passcode is required" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-Error-Kind": "passcode",
        },
      });
    }

    const isValid = await verifyPasscode(passcode, parsedPasscode);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid passcode" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-Error-Kind": "passcode",
        },
      });
    }
  }

  const existingUser = standupData.users.find(
    (u) => u.toLowerCase() === name.toLowerCase(),
  );

  if (existingUser && standupData.connectedUsers[existingUser]) {
    context.disconnectUserSessions(existingUser);
  }

  const canonicalName = context.repository.ensureUser(name);
  const sessionToken = generateID();
  context.repository.setSessionToken(canonicalName, sessionToken);

  if (avatar) {
    context.repository.setUserAvatar(canonicalName, avatar);
  }

  const freshStandup = await context.getStandupData();

  return new Response(
    JSON.stringify({
      success: true,
      standup: freshStandup,
    }),
    {
      status: 200,
      headers: {
        "Set-Cookie": createStandupSessionCookie(sessionToken, context.env),
      },
    },
  );
}
