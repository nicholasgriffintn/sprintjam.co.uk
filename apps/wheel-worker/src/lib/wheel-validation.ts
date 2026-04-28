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
