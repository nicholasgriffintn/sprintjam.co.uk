import type { Response as CfResponse } from "@cloudflare/workers-types";

import type { BroadcastMessage, RoomData, RoomSettings } from "../types";
import { createInitialRoomData, getServerDefaults } from "../utils/defaults";
import {
  assignUserAvatar,
  markUserConnection,
  normalizeRoomData,
  sanitizeRoomData,
} from "../utils/room-data";
import { applySettingsUpdate } from "../utils/room-settings";
import { createJsonResponse } from "../utils/http";
import type { PlanningRoomRepository } from "../repositories/planning-room";
import { generateSessionToken, hashPasscode } from "../utils/security";

export interface PlanningRoomHttpContext {
  repository: PlanningRoomRepository;
  getRoomData(): Promise<RoomData | undefined>;
  putRoomData(roomData: RoomData): Promise<void>;
  broadcast(message: BroadcastMessage): void;
}

export async function handleHttpRequest(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse | null> {
  const url = new URL(request.url);

  if (url.pathname === "/initialize" && request.method === "POST") {
    const { roomKey, moderator, passcode, settings, avatar } =
      (await request.json()) as {
        roomKey: string;
        moderator: string;
        passcode?: string;
        settings?: Partial<RoomSettings>;
        avatar?: string;
      };

    const passcodeHash = passcode ? await hashPasscode(passcode) : undefined;
    let roomData = await ctx.getRoomData();

    if (roomData?.key) {
      return createJsonResponse({ error: 'Room already exists' }, 400);
    }

    roomData = createInitialRoomData({
      key: roomKey,
      users: [moderator],
      moderator,
      connectedUsers: { [moderator]: true },
      passcodeHash,
      settings,
    });

    assignUserAvatar(roomData, moderator, avatar);

    await ctx.putRoomData(roomData);

    const authToken = generateSessionToken();
    ctx.repository.setSessionToken(moderator, authToken);

    const defaults = getServerDefaults();

    return createJsonResponse({
      success: true,
      room: sanitizeRoomData(roomData),
      defaults,
      authToken,
    });
  }

  if (url.pathname === '/session/validate' && request.method === 'POST') {
    const { name, sessionToken } = (await request.json()) as {
      name?: string;
      sessionToken?: string;
    };

    if (!name || !sessionToken) {
      return createJsonResponse(
        { error: 'Missing user name or session token' },
        400
      );
    }

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    const isMember = roomData.users.includes(name);
    const tokenValid = ctx.repository.validateSessionToken(name, sessionToken);

    if (!isMember || !tokenValid) {
      return createJsonResponse({ error: 'Invalid session' }, 401);
    }

    return createJsonResponse({ success: true });
  }

  if (url.pathname === "/join" && request.method === "POST") {
    const { name, passcode, avatar, authToken } = (await request.json()) as {
      name: string;
      passcode?: string;
      avatar?: string;
      authToken?: string;
    };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    const storedPasscodeHash = ctx.repository.getPasscodeHash();
    const hasValidSessionToken = ctx.repository.validateSessionToken(
      name,
      authToken ?? null,
    );

    if (storedPasscodeHash && !hasValidSessionToken) {
      const providedHash = passcode ? await hashPasscode(passcode) : undefined;

      if (!providedHash || providedHash !== storedPasscodeHash) {
        return createJsonResponse({ error: "Invalid passcode" }, 401);
      }
    }

    const updatedRoomData = normalizeRoomData(roomData);
    markUserConnection(updatedRoomData, name, true);
    assignUserAvatar(updatedRoomData, name, avatar);

    ctx.repository.ensureUser(name);
    ctx.repository.setUserConnection(name, true);
    ctx.repository.setUserAvatar(name, avatar);

    ctx.broadcast({
      type: "userJoined",
      user: name,
      avatar,
    });

    const newAuthToken = generateSessionToken();
    ctx.repository.setSessionToken(name, newAuthToken);

    const defaults = getServerDefaults();

    return createJsonResponse({
      success: true,
      room: sanitizeRoomData(updatedRoomData),
      defaults,
      authToken: newAuthToken,
    });
  }

  if (url.pathname === "/vote" && request.method === "POST") {
    const { name, vote } = (await request.json()) as {
      name: string;
      vote: string | number;
    };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    if (!roomData.users.includes(name)) {
      return createJsonResponse({ error: "User not found in this room" }, 400);
    }

    roomData.votes[name] = vote;
    ctx.repository.setVote(name, vote);

    const structuredVote = roomData.structuredVotes?.[name];

    ctx.broadcast({
      type: "vote",
      user: name,
      vote,
      structuredVote,
    });

    return createJsonResponse({
      success: true,
      room: sanitizeRoomData(roomData),
    });
  }

  if (url.pathname === "/showVotes" && request.method === "POST") {
    const { name } = (await request.json()) as { name: string };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    if (
      roomData.moderator !== name &&
      !roomData.settings.allowOthersToShowEstimates
    ) {
      return createJsonResponse(
        { error: "Only the moderator can show votes" },
        403,
      );
    }

    roomData.showVotes = !roomData.showVotes;
    ctx.repository.setShowVotes(roomData.showVotes);

    ctx.broadcast({
      type: "showVotes",
      showVotes: roomData.showVotes,
    });

    return createJsonResponse({
      success: true,
      room: sanitizeRoomData(roomData),
    });
  }

  if (url.pathname === "/resetVotes" && request.method === "POST") {
    const { name } = (await request.json()) as { name: string };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    if (
      roomData.moderator !== name &&
      !roomData.settings.allowOthersToDeleteEstimates
    ) {
      return createJsonResponse(
        { error: "Only the moderator can reset votes" },
        403,
      );
    }

    roomData.votes = {};
    roomData.structuredVotes = {};
    roomData.showVotes = false;
    roomData.settings = applySettingsUpdate({
      currentSettings: roomData.settings,
    });
    ctx.repository.clearVotes();
    ctx.repository.clearStructuredVotes();
    ctx.repository.setShowVotes(roomData.showVotes);
    ctx.repository.setSettings(roomData.settings);

    ctx.broadcast({
      type: "resetVotes",
    });

    return createJsonResponse({
      success: true,
      room: sanitizeRoomData(roomData),
    });
  }

  if (url.pathname === "/settings" && request.method === "GET") {
    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    const sessionToken = url.searchParams.get("sessionToken");
    const name = url.searchParams.get("name");

    if (!name || !sessionToken) {
      return createJsonResponse(
        { error: "Missing name or session token" },
        401,
      );
    }

    const isMember = roomData.users.includes(name);
    const tokenValid = ctx.repository.validateSessionToken(name, sessionToken);

    if (!isMember || !tokenValid) {
      return createJsonResponse({ error: "Invalid session" }, 401);
    }

    return createJsonResponse({
      success: true,
      settings: roomData.settings,
    });
  }

  if (url.pathname === "/settings" && request.method === "PUT") {
    const { name, settings, sessionToken } = (await request.json()) as {
      name: string;
      settings: RoomData["settings"];
      sessionToken?: string;
    };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    if (!sessionToken) {
      return createJsonResponse({ error: "Missing session token" }, 401);
    }

    const tokenValid = ctx.repository.validateSessionToken(name, sessionToken);

    if (!tokenValid) {
      return createJsonResponse({ error: "Invalid session" }, 401);
    }

    if (roomData.moderator !== name) {
      return createJsonResponse(
        { error: "Only the moderator can update settings" },
        403,
      );
    }

    const providedSettings = settings as Partial<RoomData["settings"]>;
    roomData.settings = applySettingsUpdate({
      currentSettings: roomData.settings,
      settingsUpdate: providedSettings,
    });

    ctx.repository.setSettings(roomData.settings);

    ctx.broadcast({
      type: "settingsUpdated",
      settings: roomData.settings,
    });

    return createJsonResponse({
      success: true,
      settings: roomData.settings,
    });
  }

  if (url.pathname === "/jira/oauth/save" && request.method === "POST") {
    const credentials = (await request.json()) as {
      accessToken: string;
      refreshToken: string | null;
      tokenType: string;
      expiresAt: number;
      scope: string | null;
      jiraDomain: string;
      jiraCloudId: string | null;
      jiraUserId: string | null;
      jiraUserEmail: string | null;
      authorizedBy: string;
      storyPointsField?: string | null;
      sprintField?: string | null;
    };

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    ctx.repository.saveJiraOAuthCredentials({
      roomKey: roomData.key,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenType: credentials.tokenType,
      expiresAt: credentials.expiresAt,
      scope: credentials.scope,
      jiraDomain: credentials.jiraDomain,
      jiraCloudId: credentials.jiraCloudId,
      jiraUserId: credentials.jiraUserId,
      jiraUserEmail: credentials.jiraUserEmail,
      storyPointsField: credentials.storyPointsField ?? null,
      sprintField: credentials.sprintField ?? null,
      authorizedBy: credentials.authorizedBy,
    });

    ctx.broadcast({
      type: "jiraConnected",
      jiraDomain: credentials.jiraDomain,
    });

    return createJsonResponse({ success: true });
  }

  if (url.pathname === '/jira/oauth/status' && request.method === 'GET') {
    const roomKey = url.searchParams.get('roomKey');
    const userName = url.searchParams.get('userName');
    const sessionToken = url.searchParams.get('sessionToken');

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    if (!roomKey || !userName || !sessionToken) {
      return createJsonResponse(
        { error: 'Missing room key, user name, or session token' },
        400
      );
    }
    if (roomData.key !== roomKey) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }
    const isMember = roomData.users.includes(userName);
    const tokenValid = ctx.repository.validateSessionToken(
      userName,
      sessionToken
    );
    if (!isMember || !tokenValid) {
      return createJsonResponse({ error: 'Invalid session' }, 401);
    }

    const credentials = ctx.repository.getJiraOAuthCredentials(roomData.key);

    if (!credentials) {
      return createJsonResponse({
        connected: false,
      });
    }

    return createJsonResponse({
      connected: true,
      jiraDomain: credentials.jiraDomain,
      jiraUserEmail: credentials.jiraUserEmail,
      expiresAt: credentials.expiresAt,
      storyPointsField: credentials.storyPointsField,
      sprintField: credentials.sprintField,
    });
  }

  if (url.pathname === '/jira/oauth/credentials' && request.method === 'GET') {
    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    const credentials = ctx.repository.getJiraOAuthCredentials(roomData.key);

    if (!credentials) {
      return createJsonResponse({ error: 'Jira not connected' }, 404);
    }

    return createJsonResponse({ credentials });
  }

  if (url.pathname === '/jira/oauth/refresh' && request.method === 'POST') {
    const { accessToken, refreshToken, expiresAt } = (await request.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    ctx.repository.updateJiraOAuthTokens(
      roomData.key,
      accessToken,
      refreshToken,
      expiresAt
    );

    return createJsonResponse({ success: true });
  }

  if (url.pathname === '/jira/oauth/fields' && request.method === 'PUT') {
    const { storyPointsField, sprintField } = (await request.json()) as {
      storyPointsField?: string | null;
      sprintField?: string | null;
    };

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    const existing = ctx.repository.getJiraOAuthCredentials(roomData.key);

    if (!existing) {
      return createJsonResponse(
        { error: 'Jira not connected. Please connect first.' },
        400
      );
    }

    ctx.repository.saveJiraOAuthCredentials({
      roomKey: roomData.key,
      accessToken: existing.accessToken,
      refreshToken: existing.refreshToken,
      tokenType: existing.tokenType,
      expiresAt: existing.expiresAt,
      scope: existing.scope,
      jiraDomain: existing.jiraDomain,
      jiraCloudId: existing.jiraCloudId,
      jiraUserId: existing.jiraUserId,
      jiraUserEmail: existing.jiraUserEmail,
      storyPointsField:
        storyPointsField === undefined
          ? existing.storyPointsField
          : storyPointsField,
      sprintField:
        sprintField === undefined ? existing.sprintField : sprintField,
      authorizedBy: existing.authorizedBy,
    });

    ctx.broadcast({
      type: 'jiraConnected',
      jiraDomain: existing.jiraDomain,
    });

    return createJsonResponse({ success: true });
  }

  if (url.pathname === '/jira/oauth/revoke' && request.method === 'DELETE') {
    const body = (await request.json().catch(() => ({}))) as {
      roomKey?: string;
      userName?: string;
      sessionToken?: string;
    };

    const roomKey = body?.roomKey;
    const userName = body?.userName;
    const sessionToken = body?.sessionToken;

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    if (!roomKey || !userName || !sessionToken) {
      return createJsonResponse(
        { error: 'Missing room key, user name, or session token' },
        400
      );
    }
    if (roomData.key !== roomKey) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }
    const isMember = roomData.users.includes(userName);
    const tokenValid = ctx.repository.validateSessionToken(
      userName,
      sessionToken
    );
    if (!isMember || !tokenValid) {
      return createJsonResponse({ error: 'Invalid session' }, 401);
    }

    ctx.repository.deleteJiraOAuthCredentials(roomData.key);

    ctx.broadcast({
      type: 'jiraDisconnected',
    });

    return createJsonResponse({ success: true });
  }

  if (url.pathname === '/linear/oauth/save' && request.method === 'POST') {
    const credentials = (await request.json()) as {
      accessToken: string;
      refreshToken: string | null;
      tokenType: string;
      expiresAt: number;
      scope: string | null;
      linearOrganizationId: string | null;
      linearUserId: string | null;
      linearUserEmail: string | null;
      authorizedBy: string;
      estimateField?: string | null;
    };

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    ctx.repository.saveLinearOAuthCredentials({
      roomKey: roomData.key,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenType: credentials.tokenType,
      expiresAt: credentials.expiresAt,
      scope: credentials.scope,
      linearOrganizationId: credentials.linearOrganizationId,
      linearUserId: credentials.linearUserId,
      linearUserEmail: credentials.linearUserEmail,
      estimateField: credentials.estimateField ?? null,
      authorizedBy: credentials.authorizedBy,
    });

    ctx.broadcast({
      type: 'linearConnected',
      linearOrganizationId: credentials.linearOrganizationId,
    });

    return createJsonResponse({ success: true });
  }

  if (url.pathname === '/linear/oauth/status' && request.method === 'GET') {
    const roomKey = url.searchParams.get('roomKey');
    const userName = url.searchParams.get('userName');
    const sessionToken = url.searchParams.get('sessionToken');

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    if (!roomKey || !userName || !sessionToken) {
      return createJsonResponse(
        { error: 'Missing room key, user name, or session token' },
        400
      );
    }
    if (roomData.key !== roomKey) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }
    const isMember = roomData.users.includes(userName);
    const tokenValid = ctx.repository.validateSessionToken(
      userName,
      sessionToken
    );
    if (!isMember || !tokenValid) {
      return createJsonResponse({ error: 'Invalid session' }, 401);
    }

    const credentials = ctx.repository.getLinearOAuthCredentials(roomData.key);

    if (!credentials) {
      return createJsonResponse({
        connected: false,
      });
    }

    return createJsonResponse({
      connected: true,
      linearOrganizationId: credentials.linearOrganizationId,
      linearUserEmail: credentials.linearUserEmail,
      expiresAt: credentials.expiresAt,
      estimateField: credentials.estimateField,
    });
  }

  if (
    url.pathname === '/linear/oauth/credentials' &&
    request.method === 'GET'
  ) {
    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    const credentials = ctx.repository.getLinearOAuthCredentials(roomData.key);

    if (!credentials) {
      return createJsonResponse({ error: 'Linear not connected' }, 404);
    }

    return createJsonResponse({ credentials });
  }

  if (url.pathname === '/linear/oauth/refresh' && request.method === 'POST') {
    const { accessToken, refreshToken, expiresAt } = (await request.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    ctx.repository.updateLinearOAuthTokens(
      roomData.key,
      accessToken,
      refreshToken,
      expiresAt
    );

    return createJsonResponse({ success: true });
  }

  if (url.pathname === '/linear/oauth/revoke' && request.method === 'DELETE') {
    const body = (await request.json().catch(() => ({}))) as {
      roomKey?: string;
      userName?: string;
      sessionToken?: string;
    };

    const roomKey = body?.roomKey;
    const userName = body?.userName;
    const sessionToken = body?.sessionToken;

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    if (!roomKey || !userName || !sessionToken) {
      return createJsonResponse(
        { error: 'Missing room key, user name, or session token' },
        400
      );
    }
    if (roomData.key !== roomKey) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }
    const isMember = roomData.users.includes(userName);
    const tokenValid = ctx.repository.validateSessionToken(
      userName,
      sessionToken
    );
    if (!isMember || !tokenValid) {
      return createJsonResponse({ error: 'Invalid session' }, 401);
    }

    ctx.repository.deleteLinearOAuthCredentials(roomData.key);

    ctx.broadcast({
      type: 'linearDisconnected',
    });

    return createJsonResponse({ success: true });
  }

  if (url.pathname === '/metadata' && request.method === 'PUT') {
    const { name, sessionToken, workspaceId, team, persona, sprintId } =
      (await request.json()) as {
        name: string;
        sessionToken: string;
        workspaceId?: string;
        team?: string;
        persona?: string;
        sprintId?: string;
      };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    const tokenValid = ctx.repository.validateSessionToken(name, sessionToken);

    if (!tokenValid) {
      return createJsonResponse({ error: 'Invalid session' }, 401);
    }

    if (roomData.moderator !== name) {
      return createJsonResponse(
        { error: 'Only the moderator can update metadata' },
        403
      );
    }

    ctx.repository.setRoomMetadata({
      workspaceId,
      team,
      persona,
      sprintId,
    });

    roomData.workspaceId = workspaceId;
    roomData.team = team;
    roomData.persona = persona;
    roomData.sprintId = sprintId;

    ctx.broadcast({
      type: 'metadataUpdated',
      metadata: {
        workspaceId,
        team,
        persona,
        sprintId,
      },
    });

    return createJsonResponse({
      success: true,
      metadata: {
        workspaceId: roomData.workspaceId,
        team: roomData.team,
        persona: roomData.persona,
        sprintId: roomData.sprintId,
      },
    });
  }

  if (url.pathname === '/snapshots' && request.method === 'GET') {
    const roomKey = url.searchParams.get('roomKey');
    const userName = url.searchParams.get('userName');
    const sessionToken = url.searchParams.get('sessionToken');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const workspaceId = url.searchParams.get('workspaceId');
    const team = url.searchParams.get('team');
    const persona = url.searchParams.get('persona');
    const sprintId = url.searchParams.get('sprintId');

    const roomData = await ctx.getRoomData();
    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    if (!roomKey || !userName || !sessionToken) {
      return createJsonResponse(
        { error: 'Missing room key, user name, or session token' },
        400
      );
    }

    if (roomData.key !== roomKey) {
      return createJsonResponse({ error: 'Room not found' }, 404);
    }

    const isMember = roomData.users.includes(userName);
    const tokenValid = ctx.repository.validateSessionToken(
      userName,
      sessionToken
    );

    if (!isMember || !tokenValid) {
      return createJsonResponse({ error: 'Invalid session' }, 401);
    }

    const snapshots = ctx.repository.getSnapshots(roomData.key, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      workspaceId: workspaceId ?? undefined,
      team: team ?? undefined,
      persona: persona ?? undefined,
      sprintId: sprintId ?? undefined,
    });

    return createJsonResponse({
      success: true,
      snapshots,
    });
  }

  return null;
}
