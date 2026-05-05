import type { WheelSettings } from "@sprintjam/types";
import {
  DEFAULT_WHEEL_SETTINGS,
  isWheelMode,
  WHEEL_SPIN_DURATION_MAX,
  WHEEL_SPIN_DURATION_MIN,
} from "@sprintjam/types";

export const WHEEL_ENTRY_NAME_MAX = 64;
export const WHEEL_ENTRY_COUNT_MAX = 200;
export const WHEEL_SOCKET_MESSAGE_MAX_CHARS = 12_000;

export function validateWheelEntryName(name: string): string | null {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "Entry name is required";
  }

  if (trimmedName.length > WHEEL_ENTRY_NAME_MAX) {
    return `Entry name must be ${WHEEL_ENTRY_NAME_MAX} characters or less`;
  }

  return null;
}

export function normalizeWheelEntryNames(names: string[]): string[] {
  const validNames: string[] = [];

  for (const name of names) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      continue;
    }
    if (trimmedName.length > WHEEL_ENTRY_NAME_MAX) {
      continue;
    }
    validNames.push(trimmedName);
  }

  return validNames;
}

export function normalizeWheelSettings(
  currentSettings: WheelSettings = DEFAULT_WHEEL_SETTINGS,
  settings?: Partial<WheelSettings> | Record<string, unknown>,
): WheelSettings {
  const nextSettings: WheelSettings = { ...currentSettings };

  if (typeof settings?.mode === "string" && isWheelMode(settings.mode)) {
    nextSettings.mode = settings.mode;
  }

  if (typeof settings?.removeWinnerAfterSpin === "boolean") {
    nextSettings.removeWinnerAfterSpin = settings.removeWinnerAfterSpin;
  }

  if (typeof settings?.showConfetti === "boolean") {
    nextSettings.showConfetti = settings.showConfetti;
  }

  if (typeof settings?.playSounds === "boolean") {
    nextSettings.playSounds = settings.playSounds;
  }

  if (
    typeof settings?.spinDurationMs === "number" &&
    Number.isFinite(settings.spinDurationMs)
  ) {
    nextSettings.spinDurationMs = Math.max(
      WHEEL_SPIN_DURATION_MIN,
      Math.min(WHEEL_SPIN_DURATION_MAX, settings.spinDurationMs),
    );
  }

  return nextSettings;
}
