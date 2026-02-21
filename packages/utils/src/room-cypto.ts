import type { PasscodeHashPayload } from "@sprintjam/types";
import { bytesToBase64Url } from "./base64";

const encoder = new TextEncoder();

export const PASSCODE_PBKDF2_ITERATIONS = 100_000;
const PASSCODE_SALT_BYTES = 16;
export const PASSCODE_MIN_LENGTH = 4;
export const PASSCODE_MAX_LENGTH = 128;
export const SESSION_TOKEN_TTL_MS = 1000 * 60 * 60 * 6;

function bufferToHex(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error("Invalid hex string");
    }
    bytes[i] = byte;
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPasscode(
  passcode: string,
  salt?: Uint8Array<ArrayBuffer>,
  iterations: number = PASSCODE_PBKDF2_ITERATIONS,
): Promise<PasscodeHashPayload> {
  if (passcode.length > PASSCODE_MAX_LENGTH) {
    throw new Error("Passcode too long");
  }
  if (passcode.trim().length < PASSCODE_MIN_LENGTH) {
    throw new Error(
      `Passcode cannot be less than ${PASSCODE_MIN_LENGTH} characters`,
    );
  }

  const encoded = encoder.encode(passcode.trim());

  const actualSalt =
    salt ??
    (() => {
      const buffer = new ArrayBuffer(PASSCODE_SALT_BYTES);
      const bytes = new Uint8Array(buffer);
      crypto.getRandomValues(bytes);
      return bytes;
    })();

  const key = await crypto.subtle.importKey("raw", encoded, "PBKDF2", false, [
    "deriveBits",
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: actualSalt,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: bufferToHex(actualSalt),
    iterations,
  };
}

export async function verifyPasscode(
  passcode: string,
  stored: PasscodeHashPayload,
): Promise<boolean> {
  const saltBytes = hexToBytes(stored.salt);
  const iterations = stored.iterations ?? PASSCODE_PBKDF2_ITERATIONS;
  const computed = await hashPasscode(passcode, saltBytes, iterations);

  const expectedHashBytes = hexToBytes(stored.hash);
  const actualHashBytes = hexToBytes(computed.hash);

  const iterationsMatch = iterations === computed.iterations;
  return (
    iterationsMatch && constantTimeEqual(expectedHashBytes, actualHashBytes)
  );
}

export function serializePasscodeHash(
  value: PasscodeHashPayload | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  return JSON.stringify(value);
}

export function parsePasscodeHash(
  value: string | null | undefined,
): PasscodeHashPayload | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed.hash === "string" &&
      typeof parsed.salt === "string" &&
      typeof parsed.iterations === "number"
    ) {
      return parsed as PasscodeHashPayload;
    }
  } catch {
    return null;
  }
  return null;
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

type SignedStatePayload<T> = {
  data: T;
  signature: string;
};

export async function signState<T>(
  data: T,
  secret: string,
): Promise<string> {
  const json = JSON.stringify(data);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(json));
  const signatureHex = bufferToHex(signature);
  return btoa(JSON.stringify({ data, signature: signatureHex }));
}

export async function verifyState<T>(
  state: string,
  secret: string,
): Promise<T> {
  try {
    const parsed = JSON.parse(atob(state)) as unknown;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid state payload");
    }

    const candidate = parsed as Partial<SignedStatePayload<T>>;
    if (!("data" in candidate) || typeof candidate.signature !== "string") {
      throw new Error("Invalid state payload");
    }

    const data = candidate.data as T;
    const signature = candidate.signature;
    const json = JSON.stringify(data);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const computedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(json),
    );
    const sigBytes = hexToBytes(signature);
    const computedSignatureBytes = new Uint8Array(computedSignature);

    if (!constantTimeEqual(sigBytes, computedSignatureBytes)) {
      throw new Error("Invalid state signature");
    }
    return data;
  } catch {
    throw new Error("Invalid state");
  }
}

export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
