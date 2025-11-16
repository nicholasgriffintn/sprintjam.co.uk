import { Env } from '../types';

export function generateRoomKey() {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 6)
    .toUpperCase();
}

export function getRoomId(roomKey: string) {
  return `room-${roomKey.toLowerCase()}`;
}

export function getRoomStub(env: Env, roomKey: string) {
  const roomId = getRoomId(roomKey);
  return env.PLANNING_ROOM.get(env.PLANNING_ROOM.idFromName(roomId));
}
