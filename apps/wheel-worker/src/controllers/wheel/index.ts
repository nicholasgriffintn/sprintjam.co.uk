import type { WheelRoom } from "../../durable-objects/wheel-room";
import type {
  WheelData,
  WheelSettings,
  WheelWorkerEnv,
} from "@sprintjam/types";
import {
  hashPasscode,
  verifyPasscode,
  generateID,
  getWheelSessionToken,
} from "@sprintjam/utils";
import { jsonResponse, jsonError } from "../../lib/response";

export interface WheelRoomHttpContext {
  repository: WheelRoom["repository"];
  getWheelData(): Promise<WheelData | undefined>;
  putWheelData(data: WheelData): Promise<void>;
  disconnectUserSessions(userName: string): void;
  env: WheelWorkerEnv;
}

const DEFAULT_SETTINGS: WheelSettings = {
  removeWinnerAfterSpin: false,
  showConfetti: true,
  playSounds: true,
  spinDurationMs: 4000,
};

const DEFAULT_ENTRY_NAMES = [
  "Ada",
  "Grace",
  "Linus",
  "Margaret",
  "Alan",
  "Tim",
];

export async function handleHttpRequest(
  context: WheelRoomHttpContext,
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

  if (path === "/settings" && request.method === "GET") {
    return handleGetSettings(context, request);
  }

  if (path === "/passcode" && request.method === "PUT") {
    return handleUpdatePasscode(context, request);
  }

  return null;
}

function passcodeErrorResponse(message: string, status = 401): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Error-Kind": "passcode",
    },
  });
}

function createWheelSessionCookie(token: string, env: WheelWorkerEnv): string {
  const secure = env.ENVIRONMENT === "development" ? "" : " Secure;";
  return `wheel_session=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=86400`;
}

async function handleInitialize(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{
    wheelKey: string;
    moderator: string;
    passcode?: string;
    settings?: Partial<WheelSettings>;
    avatar?: string;
  }>();

  const { wheelKey, moderator, passcode, settings, avatar } = body;

  if (!wheelKey || !moderator) {
    return jsonError("Wheel key and moderator are required");
  }

  const existingWheel = await context.getWheelData();
  if (existingWheel) {
    return jsonError("Wheel already exists", 409);
  }

  const sessionToken = generateID();

  const wheelSettings: WheelSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };

  const defaultEntries = DEFAULT_ENTRY_NAMES.map((name) => ({
    id: generateID(),
    name,
    enabled: true,
  }));

  const wheelData: WheelData = {
    key: wheelKey,
    entries: defaultEntries,
    moderator,
    users: [moderator],
    connectedUsers: { [moderator]: false },
    spinState: null,
    results: [],
    settings: wheelSettings,
    status: "active",
    passcodeHash: passcode ? await hashPasscode(passcode) : undefined,
    userAvatars: avatar ? { [moderator]: avatar } : undefined,
  };

  await context.putWheelData(wheelData);
  context.repository.setSessionToken(moderator, sessionToken);
  if (avatar) {
    context.repository.setUserAvatar(moderator, avatar);
  }

  return new Response(
    JSON.stringify({
      success: true,
      wheel: wheelData,
    }),
    {
      status: 200,
      headers: {
        "Set-Cookie": createWheelSessionCookie(sessionToken, context.env),
      },
    },
  );
}

async function handleJoin(
  context: WheelRoomHttpContext,
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

  const wheelData = await context.getWheelData();
  if (!wheelData) {
    return jsonError("Wheel not found", 404);
  }

  if (wheelData.passcodeHash) {
    if (!passcode) {
      return passcodeErrorResponse("Passcode is required", 401);
    }

    const isValid = await verifyPasscode(passcode, wheelData.passcodeHash);
    if (!isValid) {
      return passcodeErrorResponse("Invalid passcode", 401);
    }
  }

  const existingUser = wheelData.users.find(
    (u) => u.toLowerCase() === name.toLowerCase(),
  );

  if (existingUser && wheelData.connectedUsers[existingUser]) {
    context.disconnectUserSessions(existingUser);
  }

  const canonicalName = context.repository.ensureUser(name);
  const sessionToken = generateID();
  context.repository.setSessionToken(canonicalName, sessionToken);

  if (avatar) {
    context.repository.setUserAvatar(canonicalName, avatar);
  }

  const freshWheel = await context.getWheelData();

  return new Response(
    JSON.stringify({
      success: true,
      wheel: freshWheel,
    }),
    {
      status: 200,
      headers: {
        "Set-Cookie": createWheelSessionCookie(sessionToken, context.env),
      },
    },
  );
}

async function handleGetSettings(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  const wheelData = await context.getWheelData();
  if (!wheelData) {
    return jsonError("Wheel not found", 404);
  }

  return jsonResponse({
    settings: wheelData.settings,
    moderator: wheelData.moderator,
    isModerator: name ? wheelData.moderator === name : false,
  });
}

async function handleUpdatePasscode(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{
    userName: string;
    passcode: string | null;
  }>();

  const userName =
    typeof body?.userName === "string" ? body.userName.trim() : "";
  const passcode = body?.passcode ?? null;

  if (!userName) {
    return jsonError("User name is required");
  }

  const wheelData = await context.getWheelData();
  if (!wheelData) {
    return jsonError("Wheel not found", 404);
  }

  const sessionToken = getWheelSessionToken(request);
  const hasValidToken = context.repository.validateSessionToken(
    wheelData.moderator,
    sessionToken,
  );

  if (!hasValidToken) {
    return jsonError("Invalid or expired session", 401);
  }

  if (wheelData.moderator !== userName) {
    return jsonError("Only the moderator can update the passcode", 403);
  }

  const passcodeHash = passcode ? await hashPasscode(passcode) : undefined;
  context.repository.setPasscodeHash(passcodeHash);

  return jsonResponse({
    success: true,
    hasPasscode: !!passcode,
  });
}
