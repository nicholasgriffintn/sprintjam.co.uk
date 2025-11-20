import type { RoomData, WebSocketMessage } from '../../types';
import { applyRoomUpdate } from '../../utils/room';
import {
  ensureRoomsCollectionReady,
  roomsCollection,
} from './collections';

/**
 * Ensure the room collection is synchronised before performing writes.
 */
async function readyRoomsCollection(): Promise<void> {
  await ensureRoomsCollectionReady();
}

/**
 * Upsert a full room snapshot into the rooms collection.
 */
export async function upsertRoom(room: RoomData): Promise<void> {
  await readyRoomsCollection();
  roomsCollection.utils.writeUpsert(room);
}

/**
 * Apply a WebSocket message to the rooms collection, returning the resulting room if available.
 */
export async function applyRoomMessageToCollections(
  message: WebSocketMessage,
  fallbackRoomKey?: string | null
): Promise<RoomData | null> {
  await readyRoomsCollection();

  const candidateKey =
    message.roomData?.key ?? (fallbackRoomKey ? fallbackRoomKey : null);

  const currentRoom =
    candidateKey !== null && candidateKey !== undefined
      ? roomsCollection.get(candidateKey) ?? null
      : null;

  const baseRoom = currentRoom ?? message.roomData ?? null;
  const nextRoom =
    message.type === 'initialize' && message.roomData
      ? message.roomData
      : applyRoomUpdate(baseRoom, message);

  if (nextRoom && nextRoom !== currentRoom) {
    roomsCollection.utils.writeUpsert(nextRoom);
    return nextRoom;
  }

  return nextRoom ?? currentRoom;
}

/**
 * Remove a room from the local collection.
 */
export async function removeRoomFromCollection(roomKey: string): Promise<void> {
  await readyRoomsCollection();
  if (roomsCollection.has(roomKey)) {
    roomsCollection.utils.writeDelete(roomKey);
  }
}
