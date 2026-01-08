type RGB = { r: number; g: number; b: number };

const toLinear = (value: number) =>
  value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const parseColor = (color: string): RGB | null => {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const [r, g, b] = hex.split("").map((v) => parseInt(v + v, 16));
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
  }

  const rgbMatch = color.match(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i,
  );
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    return { r, g, b };
  }

  return null;
};

export const getContrastingTextColor = (
  background: string,
  {
    lightText = "#f8fafc",
    darkText = "#0f172a",
    threshold = 0.45,
  }: { lightText?: string; darkText?: string; threshold?: number } = {},
) => {
  const parsed = parseColor(background);
  if (!parsed) return darkText;

  const { r, g, b } = parsed;
  const luminance =
    0.2126 * toLinear(r / 255) +
    0.7152 * toLinear(g / 255) +
    0.0722 * toLinear(b / 255);

  return luminance > threshold ? darkText : lightText;
};
