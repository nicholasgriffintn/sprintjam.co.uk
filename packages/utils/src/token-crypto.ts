const encoder = new TextEncoder();
const decoder = new TextDecoder();

const VERSION = 1;
const ALGO = "AES-GCM";
const KDF = "HKDF";
const HKDF_INFO = "token-encryption";
const KDF_HASH = "SHA-256";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBuffer(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class TokenCipher {
  private readonly secret: string;

  constructor(secret: string) {
    const secretValue = secret?.trim();
    if (!secretValue) {
      console.warn(
        "TOKEN_ENCRYPTION_SECRET is empty, falling back to insecure cipher.",
      );
      this.secret = "insecure-default-secret";
      return;
    }
    this.secret = secretValue;
  }

  private async deriveKey(salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.secret),
      KDF,
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: KDF,
        salt,
        info: encoder.encode(HKDF_INFO),
        hash: KDF_HASH,
      },
      keyMaterial,
      { name: ALGO, length: KEY_LENGTH },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async encrypt(value: string): Promise<string> {
    const saltBuffer = new ArrayBuffer(SALT_LENGTH);
    const salt = new Uint8Array(saltBuffer);
    crypto.getRandomValues(salt);
    const ivBuffer = new ArrayBuffer(IV_LENGTH);
    const iv = new Uint8Array(ivBuffer);
    crypto.getRandomValues(iv);
    const key = await this.deriveKey(salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGO, iv },
      key,
      encoder.encode(value),
    );
    const payload = {
      v: VERSION,
      algo: ALGO,
      kdf: KDF,
      kdf_hash: KDF_HASH,
      kdf_info: HKDF_INFO,
      iv: bufferToBase64(iv),
      salt: bufferToBase64(salt),
      data: bufferToBase64(encrypted),
    };
    return JSON.stringify(payload);
  }

  async decrypt(payload: string): Promise<string> {
    let decoded: any;
    try {
      decoded = JSON.parse(payload);
    } catch (err) {
      throw new Error("Malformed token payload");
    }
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.iv ||
      !decoded.salt ||
      !decoded.data
    ) {
      throw new Error("Invalid token structure");
    }
    if (decoded.v !== VERSION) {
      throw new Error("Unsupported token version");
    }
    if (decoded.kdf && decoded.kdf !== KDF) {
      throw new Error("Unsupported key derivation");
    }
    const iv = base64ToBuffer(decoded.iv);
    const salt = base64ToBuffer(decoded.salt);
    const cipherBytes = base64ToBuffer(decoded.data);
    const key = await this.deriveKey(salt);
    let decrypted: ArrayBuffer;
    try {
      decrypted = await crypto.subtle.decrypt(
        { name: ALGO, iv },
        key,
        cipherBytes,
      );
    } catch (err) {
      throw new Error("Decryption failed or token integrity compromised");
    }
    return decoder.decode(decrypted);
  }
}
