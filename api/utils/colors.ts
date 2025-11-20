/**
 * Generates a color based on the numeric value
 * Creates a vibrant spectrum from happy blues to warm reds
 */
export function generateColorFromValue(
  value: number,
  maxValue: number,
): string {
  if (value === 0) return "#f0f0f0";

  const normalizedValue = Math.min(value / maxValue, 1);

  const startHue = 220;
  const endHue = 15;

  const hue = startHue - normalizedValue * (startHue - endHue);

  const saturation = 65 + normalizedValue * 20;

  const lightness = 75 + normalizedValue * 10;

  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
}

/**
 * Creates a pleasing color for non-numeric string values based on the string content
 */
export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = hash % 360;
  const s = 25 + (hash % 30);
  const l = 85 + (hash % 10);

  return `hsl(${h}, ${s}%, ${l}%)`;
}
