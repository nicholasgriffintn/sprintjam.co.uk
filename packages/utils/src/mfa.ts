const encoder = new TextEncoder();
import { base32Decode, base32Encode } from "./base32";

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const base32 = base32Encode(bytes).slice(0, 16);
    const formatted = base32.match(/.{1,4}/g)?.join("-") ?? base32;
    codes.push(formatted);
  }
  return codes;
}

export function generateTotpSecret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

function counterToBytes(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const high = Math.floor(counter / 2 ** 32);
  const low = counter >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return new Uint8Array(buffer);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function generateTotpCode(
  secret: string,
  timestamp = Date.now(),
  stepSeconds = 30,
  digits = 6,
): Promise<string> {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const keyData = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyData),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const counterBytes = counterToBytes(counter);
  const hmac = await crypto.subtle.sign("HMAC", key, toArrayBuffer(counterBytes));
  const bytes = new Uint8Array(hmac);
  const offset = bytes[bytes.length - 1] & 0xf;
  const code =
    ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff);
  const otp = (code % 10 ** digits).toString().padStart(digits, "0");
  return otp;
}

export async function verifyTotpCode(
  secret: string,
  code: string,
  {
    window = 1,
    stepSeconds = 30,
    digits = 6,
  }: { window?: number; stepSeconds?: number; digits?: number } = {},
): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return false;
  }

  const now = Date.now();
  for (let offset = -window; offset <= window; offset++) {
    const candidate = await generateTotpCode(
      secret,
      now + offset * stepSeconds * 1000,
      stepSeconds,
      digits,
    );
    if (candidate === trimmed) {
      return true;
    }
  }
  return false;
}

export function buildTotpUri({
  secret,
  account,
  issuer,
}: {
  secret: string;
  account: string;
  issuer: string;
}): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(account);
  const label = `${encodedIssuer}:${encodedAccount}`;
  const params = new URLSearchParams({
    secret,
    issuer,
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = normalizeRecoveryCode(code);
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
