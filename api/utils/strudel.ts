import { strudelMusicPresets } from "../lib/strudel";
import type { RoomPhase } from "./room-phase";

export function selectPresetForPhase(phase: RoomPhase) {
  type PhaseKey = keyof typeof strudelMusicPresets;
  const phaseKey = (phase in strudelMusicPresets ? phase : "lobby") as PhaseKey;
  const presets = strudelMusicPresets[phaseKey] || strudelMusicPresets.lobby;
  const preset = presets[Math.floor(Math.random() * presets.length)];

  return {
    style: preset.style,
    tempo: 120,
    complexity: preset.complexity,
    prompt: preset.prompt,
  };
}
