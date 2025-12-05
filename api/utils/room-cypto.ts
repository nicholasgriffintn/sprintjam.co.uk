import type { PasscodeHashPayload } from '../types';

const encoder = new TextEncoder();

export const PASSCODE_PBKDF2_ITERATIONS = 600_000;
const PASSCODE_SALT_BYTES = 16;
export const SESSION_TOKEN_TTL_MS = 1000 * 60 * 60 * 6;

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function bufferToHex(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('Invalid hex string');
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
  salt?: Uint8Array,
  iterations: number = PASSCODE_PBKDF2_ITERATIONS
): Promise<PasscodeHashPayload> {
  if (passcode.length > 128) {
    throw new Error('Passcode too long');
  }
  if (passcode.trim().length < 4) {
    throw new Error('Passcode cannot be less than 4 characters');
  }

  const encoded = encoder.encode(passcode.trim());

  const actualSalt =
    salt ?? crypto.getRandomValues(new Uint8Array(PASSCODE_SALT_BYTES));

  const key = await crypto.subtle.importKey('raw', encoded, 'PBKDF2', false, [
    'deriveBits',
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: actualSalt,
      iterations,
      hash: 'SHA-256',
    },
    key,
    256
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: bufferToHex(actualSalt),
    iterations,
  };
}

export async function verifyPasscode(
  passcode: string,
  stored: PasscodeHashPayload
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
  value: PasscodeHashPayload | null | undefined
): string | null {
  if (!value) {
    return null;
  }
  return JSON.stringify(value);
}

export function parsePasscodeHash(
  value: string | null | undefined
): PasscodeHashPayload | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed.hash === 'string' &&
      typeof parsed.salt === 'string' &&
      typeof parsed.iterations === 'number'
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
  return bytesToBase64(bytes);
}

export async function signState(data: any, secret: string): Promise<string> {
  const json = JSON.stringify(data);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(json));
  const signatureHex = bufferToHex(signature);
  return btoa(JSON.stringify({ data, signature: signatureHex }));
}

export async function verifyState(state: string, secret: string): Promise<any> {
  try {
    const { data, signature } = JSON.parse(atob(state));
    const json = JSON.stringify(data);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const computedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(json)
    );
    const sigBytes = hexToBytes(signature);
    const computedSignatureBytes = new Uint8Array(computedSignature);

    if (!constantTimeEqual(sigBytes, computedSignatureBytes)) {
      throw new Error('Invalid state signature');
    }
    return data;
  } catch (e) {
    throw new Error('Invalid state');
  }
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
