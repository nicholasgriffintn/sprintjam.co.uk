import type { RoomData } from "../types";
import { applySettingsUpdate } from "./room-settings";

export function normalizeRoomData(roomData: RoomData): RoomData {
  const normalized: RoomData = {
    ...roomData,
    settings: applySettingsUpdate({
      currentSettings: roomData.settings,
    }),
  };

  ensureConnectedUsers(normalized);
  ensureStructuredVotes(normalized);

  return normalized;
}

export function ensureConnectedUsers(
  roomData: RoomData,
): Record<string, boolean> {
  if (!roomData.connectedUsers) {
    roomData.connectedUsers = {};
    for (const user of roomData.users) {
      roomData.connectedUsers[user] = false;
    }
  }

  return roomData.connectedUsers;
}

export function ensureStructuredVotes(roomData: RoomData) {
  if (!roomData.structuredVotes) {
    roomData.structuredVotes = {};
  }
  return roomData.structuredVotes;
}

export function markUserConnection(
  roomData: RoomData,
  userName: string,
  isConnected: boolean,
) {
  ensureConnectedUsers(roomData);
  if (!roomData.users.includes(userName)) {
    roomData.users.push(userName);
  }

  roomData.connectedUsers![userName] = isConnected;
}

export function assignUserAvatar(
  roomData: RoomData,
  userName: string,
  avatar?: string,
) {
  if (!avatar) {
    return;
  }

  if (!roomData.userAvatars) {
    roomData.userAvatars = {};
  }

  roomData.userAvatars[userName] = avatar;
}

export function sanitizeRoomData(roomData: RoomData): RoomData {
  const { passcodeHash, ...rest } = roomData;
  return {
    ...rest,
  };
}
