import type { WheelData, WheelStateData } from "@sprintjam/types";

export function toClientWheelData(wheelData: WheelStateData): WheelData {
  const { passcodeHash: _passcodeHash, ...clientWheel } = wheelData;
  return clientWheel;
}
