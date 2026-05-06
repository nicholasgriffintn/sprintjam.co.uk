import {
  isRecord,
  normaliseOptionalString,
  safeJsonParse,
} from "@sprintjam/utils";

export function parseOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { error: `${fieldName} must be a number` };
  }

  return value;
}

export function parseOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number,
) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = normaliseOptionalString(value);
  if (!parsed) {
    return null;
  }

  if (parsed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or less` };
  }

  return parsed;
}

export function parseTeamSessionMetadata(
  value: string | null,
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  const parsed = safeJsonParse<unknown>(value, { silent: true });
  return isRecord(parsed) ? parsed : null;
}
