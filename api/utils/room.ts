export function generateRoomKey() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getRoomId(roomKey: string) {
  return `room-${roomKey.toLowerCase()}`;
}