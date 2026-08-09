import { AuthError } from "@ngriffin_uk/auth-core";
import type { AuthFlowResult } from "@ngriffin_uk/auth-protocol";

import type { SprintJamAuthUser } from "./shared-auth";
import { jsonError } from "./response";

export type MfaMode = "setup" | "verify";

export function readChallengeUserId(
  payload: Readonly<Record<string, unknown>>,
): string {
  return readChallengeString(payload, "userId");
}

export function readChallengeEmail(
  payload: Readonly<Record<string, unknown>>,
): string {
  return readChallengeString(payload, "email");
}

export function requireChallengeMode(
  payload: Readonly<Record<string, unknown>>,
  mode: MfaMode,
): void {
  if (payload["mode"] !== mode) {
    throw new AuthError("challenge_mismatch");
  }
}

export function attachSelectionToken(
  result: AuthFlowResult<SprintJamAuthUser>,
  selectionToken: string,
) {
  if (
    result.status !== "mfa_setup_required" &&
    result.status !== "webauthn_challenge_required"
  ) {
    throw new AuthError("unsupported_operation");
  }
  return {
    ...result,
    challenge: {
      ...result.challenge,
      parameters: {
        ...result.challenge.parameters,
        selectionToken,
      },
    },
  };
}

export function createAuthChallengeErrorResponse(error: unknown): Response {
  if (!(error instanceof AuthError)) throw error;
  const expired = error.code === "challenge_expired";
  return jsonError(
    expired ? "Authentication challenge expired" : error.message,
    expired ? 401 : 400,
    error.code,
  );
}

function readChallengeString(
  payload: Readonly<Record<string, unknown>>,
  field: "userId" | "email",
): string {
  const value = payload[field];
  if (typeof value !== "string") {
    throw new AuthError("challenge_mismatch");
  }
  return value;
}
