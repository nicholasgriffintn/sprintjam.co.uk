import type { D1Database } from "@cloudflare/workers-types";
import { decodeBase64Url, encodeBase64Url } from "@ngriffin_uk/auth-encoding";
import type { OtpStore } from "@ngriffin_uk/auth-otp";
import type {
  WebAuthnAlgorithm,
  WebAuthnCredential,
  WebAuthnStore,
} from "@ngriffin_uk/auth-webauthn";
import { mfaCredentials, mfaRecoveryCodes } from "@sprintjam/db";
import { isRecord, TokenCipher } from "@sprintjam/utils";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

export function createSprintJamOtpStore(
  d1: D1Database,
  encryptionSecret: string,
): OtpStore {
  const db = drizzle(d1);
  const cipher = new TokenCipher(encryptionSecret);

  return {
    async saveCredential(input) {
      const userId = Number(input.userId);
      const now = Date.now();
      const encryptedSecret = await cipher.encrypt(
        encodeBase64Url(input.secret),
      );
      const recoveryCodes = input.recoveryCodeHashes.map((codeHash) => ({
        userId,
        codeHash,
        createdAt: now,
      }));
      await db.batch([
        db
          .delete(mfaCredentials)
          .where(
            and(
              eq(mfaCredentials.userId, userId),
              eq(mfaCredentials.type, "totp"),
            ),
          ),
        db
          .delete(mfaRecoveryCodes)
          .where(eq(mfaRecoveryCodes.userId, userId)),
        db.insert(mfaCredentials).values({
          userId,
          type: "totp",
          secretEncrypted: encryptedSecret,
          counter: safeStep(input.lastAcceptedStep),
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(mfaRecoveryCodes).values(recoveryCodes),
      ]);
    },
    async findCredential(userId) {
      const row = await db
        .select({
          secretEncrypted: mfaCredentials.secretEncrypted,
          counter: mfaCredentials.counter,
        })
        .from(mfaCredentials)
        .where(
          and(
            eq(mfaCredentials.userId, Number(userId)),
            eq(mfaCredentials.type, "totp"),
          ),
        )
        .orderBy(desc(mfaCredentials.createdAt))
        .get();
      if (!row?.secretEncrypted) return null;
      return {
        secret: decodeBase64Url(await cipher.decrypt(row.secretEncrypted)),
        lastAcceptedStep: BigInt(row.counter),
      };
    },
    async advanceStep(userId, step) {
      const nextStep = safeStep(step);
      const updated = await db
        .update(mfaCredentials)
        .set({ counter: nextStep, updatedAt: Date.now() })
        .where(
          and(
            eq(mfaCredentials.userId, Number(userId)),
            eq(mfaCredentials.type, "totp"),
            lt(mfaCredentials.counter, nextStep),
          ),
        )
        .returning({ id: mfaCredentials.id })
        .get();
      return Boolean(updated);
    },
    async consumeRecoveryCode(userId, codeHash) {
      const updated = await db
        .update(mfaRecoveryCodes)
        .set({ usedAt: Date.now() })
        .where(
          and(
            eq(mfaRecoveryCodes.userId, Number(userId)),
            eq(mfaRecoveryCodes.codeHash, codeHash),
            isNull(mfaRecoveryCodes.usedAt),
          ),
        )
        .returning({ id: mfaRecoveryCodes.id })
        .get();
      return Boolean(updated);
    },
  };
}

export function createSprintJamWebAuthnStore(d1: D1Database): WebAuthnStore {
  const db = drizzle(d1);

  return {
    async saveCredential(credential) {
      const now = Date.now();
      await db.insert(mfaCredentials).values({
        userId: Number(credential.userId),
        type: "webauthn",
        credentialId: credential.id,
        publicKey: serializeCredential(credential),
        counter: credential.signCount,
        createdAt: now,
        updatedAt: now,
      });
    },
    async findCredential(credentialId) {
      const row = await findWebAuthnRow(db, credentialId);
      return row ? mapWebAuthnCredential(row) : null;
    },
    async listCredentials(userId) {
      const rows = await db
        .select({
          credentialId: mfaCredentials.credentialId,
          userId: mfaCredentials.userId,
          publicKey: mfaCredentials.publicKey,
          counter: mfaCredentials.counter,
          createdAt: mfaCredentials.createdAt,
          updatedAt: mfaCredentials.updatedAt,
        })
        .from(mfaCredentials)
        .where(
          and(
            eq(mfaCredentials.userId, Number(userId)),
            eq(mfaCredentials.type, "webauthn"),
          ),
        );
      return rows.map(mapWebAuthnCredential);
    },
    async updateSignCount(input) {
      const current = await findWebAuthnRow(db, input.credentialId);
      if (!current?.publicKey) return false;
      const stored = readStoredWebAuthnKey(current.publicKey);
      const updated = await db
        .update(mfaCredentials)
        .set({
          counter: input.signCount,
          publicKey: JSON.stringify({ ...stored, backedUp: input.backedUp }),
          updatedAt: Date.now(),
        })
        .where(
          and(
            eq(mfaCredentials.credentialId, input.credentialId),
            eq(mfaCredentials.type, "webauthn"),
            eq(mfaCredentials.counter, input.previousSignCount),
          ),
        )
        .returning({ id: mfaCredentials.id })
        .get();
      return Boolean(updated);
    },
  };
}

type AuthDatabase = ReturnType<typeof drizzle>;

async function findWebAuthnRow(
  db: AuthDatabase,
  credentialId: string,
) {
  return db
    .select({
      credentialId: mfaCredentials.credentialId,
      userId: mfaCredentials.userId,
      publicKey: mfaCredentials.publicKey,
      counter: mfaCredentials.counter,
      createdAt: mfaCredentials.createdAt,
      updatedAt: mfaCredentials.updatedAt,
    })
    .from(mfaCredentials)
    .where(
      and(
        eq(mfaCredentials.credentialId, credentialId),
        eq(mfaCredentials.type, "webauthn"),
      ),
    )
    .get();
}

function mapWebAuthnCredential(row: {
  readonly credentialId: string | null;
  readonly userId: number;
  readonly publicKey: string | null;
  readonly counter: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}): WebAuthnCredential {
  if (!row.credentialId || !row.publicKey) {
    throw new TypeError("Stored passkey is incomplete.");
  }
  const stored = readStoredWebAuthnKey(row.publicKey);
  return {
    id: row.credentialId,
    userId: String(row.userId),
    publicKeyJwk: stored.publicKeyJwk,
    algorithm: stored.algorithm,
    signCount: row.counter,
    ...(stored.transports ? { transports: stored.transports } : {}),
    backupEligible: stored.backupEligible,
    backedUp: stored.backedUp,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function serializeCredential(credential: WebAuthnCredential): string {
  return JSON.stringify({
    publicKeyJwk: credential.publicKeyJwk,
    algorithm: credential.algorithm,
    transports: credential.transports,
    backupEligible: credential.backupEligible,
    backedUp: credential.backedUp,
  } satisfies StoredWebAuthnKey);
}

function readStoredWebAuthnKey(value: string): StoredWebAuthnKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new TypeError("Stored passkey public key is invalid.");
  }
  if (
    !isRecord(parsed) ||
    !isJsonWebKey(parsed.publicKeyJwk) ||
    !isWebAuthnAlgorithm(parsed.algorithm) ||
    typeof parsed.backupEligible !== "boolean" ||
    typeof parsed.backedUp !== "boolean"
  ) {
    throw new TypeError("Stored passkey public key is invalid.");
  }
  return {
    publicKeyJwk: parsed.publicKeyJwk,
    algorithm: parsed.algorithm,
    backupEligible: parsed.backupEligible,
    backedUp: parsed.backedUp,
    ...(isTransportArray(parsed.transports)
      ? { transports: parsed.transports }
      : {}),
  };
}

function safeStep(step: bigint): number {
  const value = Number(step);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("TOTP step cannot be stored safely.");
  }
  return value;
}

function isWebAuthnAlgorithm(value: unknown): value is WebAuthnAlgorithm {
  return value === "ES256" || value === "RS256";
}

function isTransportArray(
  value: unknown,
): value is NonNullable<WebAuthnCredential["transports"]> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item === "ble" ||
        item === "cable" ||
        item === "hybrid" ||
        item === "internal" ||
        item === "nfc" ||
        item === "smart-card" ||
        item === "usb",
    )
  );
}

function isJsonWebKey(value: unknown): value is JsonWebKey {
  return (
    isRecord(value) &&
    (value["kty"] === "EC" || value["kty"] === "RSA") &&
    typeof value["alg"] === "string"
  );
}

interface StoredWebAuthnKey {
  readonly publicKeyJwk: JsonWebKey;
  readonly algorithm: WebAuthnAlgorithm;
  readonly transports?: WebAuthnCredential["transports"];
  readonly backupEligible: boolean;
  readonly backedUp: boolean;
}
