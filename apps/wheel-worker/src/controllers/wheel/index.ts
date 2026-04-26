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
  generateSessionToken,
  generateRecoveryPasskey,
  getWheelSessionToken,
  createWheelSessionCookie,
  SESSION_TOKEN_TTL_MS,
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

  if (path === "/recover" && request.method === "POST") {
    return handleRecover(context, request);
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

function buildSessionResponse(
  body: unknown,
  sessionToken: string,
  env: WheelWorkerEnv,
): Response {
  const isSecure = env.ENVIRONMENT !== "development";
  const maxAgeSeconds = Math.floor(SESSION_TOKEN_TTL_MS / 1000);
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": createWheelSessionCookie(
        sessionToken,
        maxAgeSeconds,
        isSecure,
      ),
    },
  });
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
    workspaceUserId?: number;
  }>();

  const { wheelKey, moderator, passcode, settings, avatar, workspaceUserId } =
    body;

  if (!wheelKey || !moderator) {
    return jsonError("Wheel key and moderator are required");
  }

  const existingWheel = await context.getWheelData();
  if (existingWheel) {
    return jsonError("Wheel already exists", 409);
  }

  const sessionToken = generateSessionToken();

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

  if (workspaceUserId) {
    context.repository.setWorkspaceUserId(moderator, workspaceUserId);
  }

  if (avatar) {
    context.repository.setUserAvatar(moderator, avatar);
  }

  let recoveryPasskey: string | undefined;
  if (!workspaceUserId) {
    recoveryPasskey = generateRecoveryPasskey();
    await context.repository.setRecoveryPasskey(moderator, recoveryPasskey);
  }

  return buildSessionResponse(
    { success: true, wheel: wheelData, recoveryPasskey },
    sessionToken,
    context.env,
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
    workspaceUserId?: number;
  }>();

  const { name, passcode, avatar, workspaceUserId } = body;

  if (!name) {
    return jsonError("Name is required");
  }

  const wheelData = await context.getWheelData();
  if (!wheelData) {
    return jsonError("Wheel not found", 404);
  }

  // For workspace users, find their existing slot by user ID first.
  let canonicalName: string | undefined;
  if (workspaceUserId) {
    canonicalName =
      context.repository.findUserNameByWorkspaceId(workspaceUserId);
  }

  const isWorkspaceUserRejoining = !!canonicalName;

  if (!isWorkspaceUserRejoining) {
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
      return jsonError("Name already connected", 409);
    }
  } else {
    if (wheelData.connectedUsers[canonicalName!]) {
      context.disconnectUserSessions(canonicalName!);
    }
  }

  const resolvedName = canonicalName ?? name;
  const finalName = context.repository.ensureUser(resolvedName);
  const sessionToken = generateSessionToken();
  context.repository.setSessionToken(finalName, sessionToken);

  if (workspaceUserId) {
    context.repository.setWorkspaceUserId(finalName, workspaceUserId);
  }

  if (avatar) {
    context.repository.setUserAvatar(finalName, avatar);
  }

  let recoveryPasskey: string | undefined;
  if (!workspaceUserId) {
    recoveryPasskey = generateRecoveryPasskey();
    await context.repository.setRecoveryPasskey(finalName, recoveryPasskey);
  }

  const freshWheel = await context.getWheelData();

  return buildSessionResponse(
    { success: true, wheel: freshWheel, recoveryPasskey },
    sessionToken,
    context.env,
  );
}

async function handleRecover(
  context: WheelRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{ name: string; recoveryPasskey: string }>();
  const { name, recoveryPasskey } = body;

  if (!name || !recoveryPasskey) {
    return jsonError("Name and recovery passkey are required");
  }

  const wheelData = await context.getWheelData();
  if (!wheelData) {
    return jsonError("Wheel not found", 404);
  }

  const canonicalName = wheelData.users.find(
    (u) => u.toLowerCase() === name.toLowerCase(),
  );
  if (!canonicalName) {
    return jsonError("Invalid name or recovery passkey", 401);
  }

  const isValid = await context.repository.validateRecoveryPasskey(
    canonicalName,
    recoveryPasskey,
  );
  if (!isValid) {
    return jsonError("Invalid name or recovery passkey", 401);
  }

  const sessionToken = generateSessionToken();
  context.repository.setSessionToken(canonicalName, sessionToken);

  if (wheelData.connectedUsers[canonicalName]) {
    context.disconnectUserSessions(canonicalName);
  }

  const freshWheel = await context.getWheelData();

  return buildSessionResponse(
    { success: true, wheel: freshWheel },
    sessionToken,
    context.env,
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
