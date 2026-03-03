import { HttpError } from "@/lib/errors";

const WORKSPACE_ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed:
    "Your email domain is not authorized for workspace access. Please contact your administrator.",
  invalid_verification_code: "Invalid verification code",
  verification_code_expired: "Verification code has expired",
  verification_code_used: "Verification code has already been used",
  verification_code_locked:
    "Too many failed attempts. Please request a new code.",
  workspace_membership_pending_approval:
    "Your workspace membership is pending approval",
};

function readString(
  value: Record<string, unknown> | null,
  key: "code" | "error" | "message",
) {
  const candidate = value?.[key];
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : null;
}

export function getWorkspaceErrorCode(
  value: Record<string, unknown> | null,
): string | undefined {
  const explicitCode = readString(value, "code");
  if (explicitCode) {
    return explicitCode;
  }

  const legacyError = readString(value, "error");
  const message = readString(value, "message");
  if (legacyError && message && legacyError !== message) {
    return legacyError;
  }

  return undefined;
}

export function getWorkspaceErrorMessage(
  value: Record<string, unknown> | null,
  fallbackMessage: string,
): string {
  const code = getWorkspaceErrorCode(value);
  if (code && WORKSPACE_ERROR_MESSAGES[code]) {
    return WORKSPACE_ERROR_MESSAGES[code];
  }

  return (
    readString(value, "message") ??
    readString(value, "error") ??
    fallbackMessage
  );
}

export function isUnauthorizedWorkspaceError(error: unknown) {
  return (
    error instanceof HttpError &&
    (error.status === 401 ||
      error.code === "unauthorized" ||
      error.code === "invalid_session" ||
      error.code === "session_expired")
  );
}
