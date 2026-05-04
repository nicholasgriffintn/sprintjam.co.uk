export function boundedRecord(
  value: unknown,
  maxSerializedLength: number,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > maxSerializedLength) {
    return {};
  }

  return value as Record<string, unknown>;
}
