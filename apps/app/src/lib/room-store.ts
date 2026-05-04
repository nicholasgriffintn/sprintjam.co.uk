import { useMemo, useSyncExternalStore } from "react";

import type { RoomData, WebSocketMessage } from "@/types";
import { createKeyedStore } from "@/lib/keyed-store";
import { applyRoomUpdate } from "@/utils/room";

const roomStore = createKeyedStore<RoomData, string>((room) => room.key);

const noopSubscribe = () => () => {};

export async function upsertRoom(room: RoomData): Promise<void> {
  roomStore.upsert(room);
}

export function getRoom(roomKey: string): RoomData | null {
  return roomStore.get(roomKey) ?? null;
}

export function useRoomData(roomKey: string | null): RoomData | null {
  const subscribe = useMemo(
    () => (onChange: () => void) => {
      const subscription = roomStore.subscribe(onChange, {
        includeInitialState: true,
      });
      return () => subscription.unsubscribe();
    },
    [],
  );

  const getSnapshot = () => (roomKey ? getRoom(roomKey) : null);

  return useSyncExternalStore(
    roomKey ? subscribe : noopSubscribe,
    getSnapshot,
    getSnapshot,
  );
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

export async function applyRoomMessageToStore(
  message: WebSocketMessage,
  fallbackRoomKey?: string | null,
): Promise<RoomData | null> {
  const candidateKey = extractRoomKey(message, fallbackRoomKey);

  const currentRoom =
    candidateKey !== null && candidateKey !== undefined
      ? getRoom(candidateKey)
      : null;

  const initialRoom = extractRoomData(message);
  const baseRoom = currentRoom ?? initialRoom ?? null;
  const nextRoom =
    message.type === "initialize" && initialRoom
      ? initialRoom
      : applyRoomUpdate(baseRoom, message);

  if (nextRoom && nextRoom !== currentRoom) {
    roomStore.upsert(nextRoom);
    return nextRoom;
  }

  return nextRoom ?? currentRoom;
}

export async function removeRoomFromStore(roomKey: string): Promise<void> {
  if (roomStore.has(roomKey)) {
    roomStore.remove(roomKey);
  }
}
