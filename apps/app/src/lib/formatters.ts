export function formatVelocity(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v >= 10) return `${Math.round(v)}/hr`;
  return `${v.toFixed(1)}/hr`;
}
