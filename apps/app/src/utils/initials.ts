export function getInitials(value: string | null | undefined): string {
  const words = value
    ?.trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words?.length) {
    return "";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
