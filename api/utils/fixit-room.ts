import type { Env } from "../types";

export function getFixitRoomStub(env: Env, fixitId: string) {
  if (!env.FIXIT_ROOM) {
    throw new Error("FixitRoom namespace is not configured");
  }

  const normalized = fixitId.toLowerCase();
  const objectId = env.FIXIT_ROOM.idFromName(`fixit-${normalized}`);
  return env.FIXIT_ROOM.get(objectId);
}
