export function normaliseSessionRoomKeys(roomKeys: string[]) {
  return Array.from(
    new Set(
      roomKeys
        .map((roomKey) => roomKey.trim())
        .filter((roomKey) => roomKey.length > 0),
    ),
  ).sort();
}
