export const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

export function formatDateInputValue(timestamp?: number | null): string {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

export function parseDateInputValue(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}
