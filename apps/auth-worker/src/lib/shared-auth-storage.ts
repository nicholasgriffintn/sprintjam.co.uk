import type {
  AuthChallengeRecord,
  AuthSessionRecord,
} from "@ngriffin_uk/auth-core";
import type { AuthChallengeKind } from "@ngriffin_uk/auth-protocol";
import { isRecord, TokenCipher } from "@sprintjam/utils";

const AUTH_CHALLENGE_KINDS = new Set<unknown>([
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
] satisfies readonly AuthChallengeKind[]);

type ChallengeMetadata = Pick<
  AuthChallengeRecord,
  "tokenHash" | "provider" | "kind" | "createdAt" | "expiresAt"
>;

export interface StoredSprintJamChallenge {
  readonly tokenHash: string;
  readonly provider: string;
  readonly kind: string;
  readonly payload: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly attempts: number;
}

export class SprintJamChallengePayloadCipher {
  readonly #cipher: TokenCipher;

  constructor(secret: string) {
    this.#cipher = new TokenCipher(secret);
  }

  encrypt(record: AuthChallengeRecord): Promise<string> {
    return this.#cipher.encrypt(
      JSON.stringify(record.payload),
      challengeContext(record),
    );
  }

  async decrypt(
    metadata: ChallengeMetadata,
    encryptedPayload: string,
  ): Promise<Readonly<Record<string, unknown>>> {
    const payload: unknown = JSON.parse(
      await this.#cipher.decrypt(encryptedPayload, challengeContext(metadata)),
    );
    if (!isRecord(payload)) {
      throw new TypeError(
        "Stored authentication challenge payload is invalid.",
      );
    }
    return payload;
  }
}

export function mapSprintJamSessionRecord(row: {
  readonly tokenHash: string;
  readonly userId: number;
  readonly createdAt: number;
  readonly expiresAt: number;
}): AuthSessionRecord {
  return {
    tokenHash: row.tokenHash,
    userId: String(row.userId),
    createdAt: new Date(row.createdAt),
    expiresAt: new Date(row.expiresAt),
  };
}

export async function mapSprintJamChallengeRecord(
  row: StoredSprintJamChallenge,
  cipher: SprintJamChallengePayloadCipher,
): Promise<AuthChallengeRecord> {
  if (!isAuthChallengeKind(row.kind)) {
    throw new TypeError("Stored authentication challenge kind is invalid.");
  }
  const metadata = {
    tokenHash: row.tokenHash,
    provider: row.provider,
    kind: row.kind,
    createdAt: new Date(row.createdAt),
    expiresAt: new Date(row.expiresAt),
    attempts: row.attempts,
  };
  return {
    ...metadata,
    payload: await cipher.decrypt(metadata, row.payload),
  };
}

function challengeContext(record: ChallengeMetadata): string {
  return JSON.stringify([
    1,
    "authentication-challenge",
    record.tokenHash,
    record.provider,
    record.kind,
    record.createdAt.toISOString(),
    record.expiresAt.toISOString(),
  ]);
}

function isAuthChallengeKind(value: string): value is AuthChallengeKind {
  return AUTH_CHALLENGE_KINDS.has(value);
}
