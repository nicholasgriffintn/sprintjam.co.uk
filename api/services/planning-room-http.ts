import type { Response as CfResponse } from "@cloudflare/workers-types";

import type { BroadcastMessage, RoomData, RoomSettings } from "../types";
import { createInitialRoomData, getServerDefaults } from "../utils/defaults";
import {
  assignUserAvatar,
  markUserConnection,
  normalizeRoomData,
} from "../utils/room-data";
import { applySettingsUpdate } from "../utils/room-settings";
import { createJsonResponse } from "../utils/http";
import type { PlanningRoomRepository } from "../repositories/planning-room";

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

    let roomData = await ctx.getRoomData();

    if (!roomData) {
      // Initialization when room data not present; continue with default flow
    } else if (roomData.key) {
      return createJsonResponse({ error: "Room already exists" }, 400);
    }

    roomData = createInitialRoomData({
      key: roomKey,
      users: [moderator],
      moderator,
      connectedUsers: { [moderator]: true },
    });

    if (settings) {
      roomData.settings = {
        ...roomData.settings,
        ...settings,
      };
    }

    if (passcode && passcode.trim()) {
      roomData.passcode = passcode.trim();
    }

    assignUserAvatar(roomData, moderator, avatar);

    await ctx.putRoomData(roomData);

    const defaults = getServerDefaults();

    return createJsonResponse({
      success: true,
      room: roomData,
      defaults,
    });
  }

  if (url.pathname === "/join" && request.method === "POST") {
    const { name, passcode, avatar } = (await request.json()) as {
      name: string;
      passcode?: string;
      avatar?: string;
    };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    if (roomData.passcode && roomData.passcode.trim()) {
      if (!passcode || passcode.trim() !== roomData.passcode.trim()) {
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

    const defaults = getServerDefaults();

    return createJsonResponse({
      success: true,
      room: updatedRoomData,
      defaults,
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
      room: roomData,
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
      room: roomData,
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
      room: roomData,
    });
  }

  if (url.pathname === "/settings" && request.method === "GET") {
    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
    }

    return createJsonResponse({
      success: true,
      settings: roomData.settings,
    });
  }

  if (url.pathname === "/settings" && request.method === "PUT") {
    const { name, settings } = (await request.json()) as {
      name: string;
      settings: RoomData["settings"];
    };

    const roomData = await ctx.getRoomData();

    if (!roomData || !roomData.key) {
      return createJsonResponse({ error: "Room not found" }, 404);
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

  return null;
}
