import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(64, "Name is too long");

export const roomKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{4,6}$/, "Room key must be 4-6 characters");

export const passcodeSchema = z
  .string()
  .trim()
  .max(64, "Passcode must be 64 characters or less")
  .optional();

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const buildResult = (parsed: {
  success: boolean;
  error?: string;
}): ValidationResult =>
  parsed.success ? { ok: true } : { ok: false, error: parsed.error };

export const validateName = (value: string): ValidationResult => {
  const result = nameSchema.safeParse(value);
  return buildResult({
    success: result.success,
    error: result.success ? undefined : result.error.issues[0]?.message,
  });
};

export const validateRoomKey = (value: string): ValidationResult => {
  const result = roomKeySchema.safeParse(value);
  return buildResult({
    success: result.success,
    error: result.success ? undefined : result.error.issues[0]?.message,
  });
};

export const validatePasscode = (value: string): ValidationResult => {
  if (!value) {
    return { ok: true };
  }
  const result = passcodeSchema.safeParse(value);
  return buildResult({
    success: result.success,
    error: result.success ? undefined : result.error.issues[0]?.message,
  });
};

export const validators = {
  required: (value: string) => validateName(value).ok,
  roomKey: (value: string) => validateRoomKey(value).ok,
  passcode: (value: string) => validatePasscode(value).ok,
};

export const formatRoomKey = (value: string): string =>
  value.replace(/\s+/g, "").toUpperCase();
