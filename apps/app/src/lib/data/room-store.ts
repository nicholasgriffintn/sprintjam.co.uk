import type { RoomData, WebSocketMessage } from "@/types";
import { applyRoomUpdate } from "@/utils/room";
import { ensureRoomsCollectionReady, roomsCollection } from "./collections";

async function readyRoomsCollection(): Promise<void> {
  await ensureRoomsCollectionReady();
}

export async function upsertRoom(room: RoomData): Promise<void> {
  await readyRoomsCollection();
  roomsCollection.utils.writeUpsert(room);
}

const extractRoomData = (message: WebSocketMessage): RoomData | undefined => {
  if (message.type === "initialize" || message.type === "userJoined") {
    return message.roomData;
  }
  return undefined;
};

const extractRoomKey = (
  message: WebSocketMessage,
  fallbackRoomKey?: string | null,
): string | null => {
  const roomData = extractRoomData(message);
  if (roomData?.key) {
    return roomData.key;
  }
  return fallbackRoomKey ?? null;
};

export async function applyRoomMessageToCollections(
  message: WebSocketMessage,
  fallbackRoomKey?: string | null,
): Promise<RoomData | null> {
  await readyRoomsCollection();

  const candidateKey = extractRoomKey(message, fallbackRoomKey);

  const currentRoom =
    candidateKey !== null && candidateKey !== undefined
      ? (roomsCollection.get(candidateKey) ?? null)
      : null;

  const initialRoom = extractRoomData(message);
  const baseRoom = currentRoom ?? initialRoom ?? null;
  const nextRoom =
    message.type === "initialize" && initialRoom
      ? initialRoom
      : applyRoomUpdate(baseRoom, message);

  if (nextRoom && nextRoom !== currentRoom) {
    roomsCollection.utils.writeUpsert(nextRoom);
    return nextRoom;
  }

  return nextRoom ?? currentRoom;
}

export async function removeRoomFromCollection(roomKey: string): Promise<void> {
  await readyRoomsCollection();
  if (roomsCollection.has(roomKey)) {
    roomsCollection.utils.writeDelete(roomKey);
  }
}
