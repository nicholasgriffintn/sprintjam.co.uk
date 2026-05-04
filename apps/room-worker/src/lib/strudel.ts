import { secureRandomInt } from "@sprintjam/utils";

import { strudelMusicPresets } from "../config/strudel";

export function selectPresetForPhase(phase: string) {
  type PhaseKey = keyof typeof strudelMusicPresets;
  const phaseKey = (phase in strudelMusicPresets ? phase : "lobby") as PhaseKey;
  const presets = strudelMusicPresets[phaseKey] || strudelMusicPresets.lobby;
  const preset = presets[secureRandomInt(presets.length)];

  return {
    style: preset.style,
    tempo: 120,
    complexity: preset.complexity,
    prompt: preset.prompt,
  };
}
