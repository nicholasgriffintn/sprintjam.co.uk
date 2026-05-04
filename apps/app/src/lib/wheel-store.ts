import type { WheelData } from "@sprintjam/types";

import { createKeyedStore } from "@/lib/keyed-store";

const wheelStore = createKeyedStore<WheelData, string>((wheel) => wheel.key);

export function getWheel(wheelKey: string): WheelData | null {
  return wheelStore.get(wheelKey) ?? null;
}

export function upsertWheel(wheel: WheelData) {
  wheelStore.upsert(wheel);
}
