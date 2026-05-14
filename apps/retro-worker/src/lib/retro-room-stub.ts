import type { RetroWorkerEnv } from "@sprintjam/types";

export function getRetroStub(env: RetroWorkerEnv, retroKey: string) {
  const id = env.RETRO_ROOM.idFromName(retroKey);
  return env.RETRO_ROOM.get(id);
}
