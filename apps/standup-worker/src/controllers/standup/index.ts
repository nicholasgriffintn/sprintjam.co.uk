import type { StandupRoom } from "../../durable-objects/standup-room";
import type { StandupData, StandupWorkerEnv } from "@sprintjam/types";
import {
  hashPasscode,
  verifyPasscode,
  generateSessionToken,
  generateRecoveryPasskey,
  serializePasscodeHash,
  parsePasscodeHash,
  getStandupSessionToken,
  createStandupSessionCookie,
  SESSION_TOKEN_TTL_MS,
  PASSCODE_MIN_LENGTH,
  PASSCODE_MAX_LENGTH,
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

  if (path === "/recover" && request.method === "POST") {
    return handleRecover(context, request);
  }

  return null;
}

function normalisePasscode(value?: string): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validatePasscode(passcode: string): string | null {
  if (passcode.length < PASSCODE_MIN_LENGTH) {
    return `Passcode cannot be less than ${PASSCODE_MIN_LENGTH} characters`;
  }

  if (passcode.length > PASSCODE_MAX_LENGTH) {
    return `Passcode must be ${PASSCODE_MAX_LENGTH} characters or less`;
  }

  return null;
}

function passcodeErrorResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
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
  env: StandupWorkerEnv,
): Response {
  const isSecure = env.ENVIRONMENT !== "development";
  const maxAgeSeconds = Math.floor(SESSION_TOKEN_TTL_MS / 1000);
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": createStandupSessionCookie(
        sessionToken,
        maxAgeSeconds,
        isSecure,
      ),
    },
  });
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

  const normalisedPasscode = normalisePasscode(passcode);
  if (normalisedPasscode) {
    const validationError = validatePasscode(normalisedPasscode);
    if (validationError) {
      return jsonError(validationError);
    }
  }

  const passcodeHash = normalisedPasscode
    ? await hashPasscode(normalisedPasscode)
    : undefined;

  await context.repository.createStandup(
    standupKey,
    moderator,
    serializePasscodeHash(passcodeHash) ?? undefined,
    teamId,
  );

  const sessionToken = generateSessionToken();
  const recoveryPasskey = generateRecoveryPasskey();
  context.repository.setSessionToken(moderator, sessionToken);
  await context.repository.setRecoveryPasskey(moderator, recoveryPasskey);

  if (avatar) {
    context.repository.setUserAvatar(moderator, avatar);
  }

  const standupData = await context.getStandupData();

  return buildSessionResponse(
    { success: true, standup: standupData, recoveryPasskey },
    sessionToken,
    context.env,
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
    const normalisedPasscode = normalisePasscode(passcode);
    if (!normalisedPasscode) {
      return passcodeErrorResponse("Passcode is required");
    }

    const validationError = validatePasscode(normalisedPasscode);
    if (validationError) {
      return passcodeErrorResponse(validationError);
    }

    const isValid = await verifyPasscode(normalisedPasscode, parsedPasscode);
    if (!isValid) {
      return passcodeErrorResponse("Invalid passcode");
    }
  }

  const existingUser = standupData.users.find(
    (u) => u.toLowerCase() === name.toLowerCase(),
  );

  if (existingUser) {
    const authToken = getStandupSessionToken(request);
    const hasValidSessionToken = context.repository.validateSessionToken(
      existingUser,
      authToken ?? null,
    );

    const isConnected = !!standupData.connectedUsers[existingUser];
    const hasResponded = standupData.respondedUsers.includes(existingUser);

    if ((isConnected || hasResponded) && !hasValidSessionToken) {
      return jsonError("This name is already in use in this standup", 409);
    }

    if (isConnected) {
      context.disconnectUserSessions(existingUser);
    }
  }

  const canonicalName = context.repository.ensureUser(name);
  const sessionToken = generateSessionToken();
  const recoveryPasskey = generateRecoveryPasskey();
  context.repository.setSessionToken(canonicalName, sessionToken);
  await context.repository.setRecoveryPasskey(canonicalName, recoveryPasskey);

  if (avatar) {
    context.repository.setUserAvatar(canonicalName, avatar);
  }

  const freshStandup = await context.getStandupData();

  return buildSessionResponse(
    { success: true, standup: freshStandup, recoveryPasskey },
    sessionToken,
    context.env,
  );
}

async function handleRecover(
  context: StandupRoomHttpContext,
  request: Request,
): Promise<Response> {
  const body = await request.json<{ name: string; recoveryPasskey: string }>();
  const { name, recoveryPasskey } = body;

  if (!name || !recoveryPasskey) {
    return jsonError("Name and recovery passkey are required");
  }

  const standupData = await context.getStandupData();
  if (!standupData) {
    return jsonError("Standup not found", 404);
  }

  const canonicalName = standupData.users.find(
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

  if (standupData.connectedUsers[canonicalName]) {
    context.disconnectUserSessions(canonicalName);
  }

  const freshStandup = await context.getStandupData();

  return buildSessionResponse(
    { success: true, standup: freshStandup },
    sessionToken,
    context.env,
  );
}
