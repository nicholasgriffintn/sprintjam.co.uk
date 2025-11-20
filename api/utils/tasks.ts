import type { TaskSize } from "../types";

/**
 * Map numeric values to task sizes using a logarithmic scale
 * This ensures appropriate task size categorization for any scale
 */
export function getTaskSize(value: string | number): TaskSize | null {
  if (typeof value === "string" && isNaN(Number(value))) {
    return null;
  }

  const numValue = Number(value);

  if (numValue === 0) return "xs";
  if (numValue <= 1) return "xs";
  if (numValue <= 2) return "sm";
  if (numValue <= 4) return "md";
  if (numValue <= 8) return "lg";
  return "xl";
}
