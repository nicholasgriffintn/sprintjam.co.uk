import type { TaskSize } from "@sprintjam/types";

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
