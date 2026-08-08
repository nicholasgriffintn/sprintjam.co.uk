import { isRecord } from "@sprintjam/utils";

const AUTH_CHALLENGE_KINDS = [
  "custom",
  "email_otp",
  "email_verification",
  "mfa_selection",
  "mfa_setup",
  "new_password",
  "password",
  "password_reset",
  "sms_mfa",
  "sms_otp",
  "software_token_mfa",
  "unsupported",
  "webauthn",
] as const;

export type AuthUiChallengeKind = (typeof AUTH_CHALLENGE_KINDS)[number];

export type SupportedAuthUiRequest =
  | {
      readonly action: "request_magic_link";
      readonly values: Readonly<{ email: string }>;
    }
  | {
      readonly action: "continue";
      readonly continuationToken: string;
      readonly kind: AuthUiChallengeKind;
      readonly values: Readonly<Record<string, string>>;
    };

export function readAuthUiRequest(
  value: unknown,
): SupportedAuthUiRequest | undefined {
  if (!isRecord(value)) return undefined;
  if (
    value.action === "request_magic_link" &&
    isRecord(value.values) &&
    typeof value.values.email === "string"
  ) {
    return {
      action: value.action,
      values: { email: value.values.email },
    };
  }
  if (
    value.action === "continue" &&
    typeof value.continuationToken === "string" &&
    isAuthChallengeKind(value.kind) &&
    isStringRecord(value.values)
  ) {
    return {
      action: value.action,
      continuationToken: value.continuationToken,
      kind: value.kind,
      values: value.values,
    };
  }
  return undefined;
}

export function controllerRequest(
  request: Request,
  body: Readonly<Record<string, unknown>>,
): Request {
  return new Request(request.url, {
    body: JSON.stringify(body),
    headers: request.headers,
    method: "POST",
  });
}

export function readCredential(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function isAuthChallengeKind(
  value: unknown,
): value is AuthUiChallengeKind {
  return (
    typeof value === "string" &&
    AUTH_CHALLENGE_KINDS.some((kind) => kind === value)
  );
}
