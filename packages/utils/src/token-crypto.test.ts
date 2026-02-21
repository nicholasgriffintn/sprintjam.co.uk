import { describe, it, expect } from "vitest";

import { TokenCipher } from "./token-crypto";

describe("TokenCipher", () => {
  it("encrypts and decrypts round-trip values", async () => {
    const cipher = new TokenCipher("super-secret");
    const payload = await cipher.encrypt("api-token");
    expect(payload).not.toBe("api-token");

    const decrypted = await cipher.decrypt(payload);
    expect(decrypted).toBe("api-token");
  });

  it("produces unique ciphertext for identical plaintext values", async () => {
    const cipher = new TokenCipher("super-secret");
    const first = await cipher.encrypt("api-token");
    const second = await cipher.encrypt("api-token");
    expect(first).not.toBe(second);
  });

  it("rejects malformed payloads", async () => {
    const cipher = new TokenCipher("super-secret");
    await expect(cipher.decrypt("not-json")).rejects.toThrow(
      "Malformed token payload",
    );
  });

  it("rejects tampered payload metadata", async () => {
    const cipher = new TokenCipher("super-secret");
    const encrypted = await cipher.encrypt("api-token");
    const parsed = JSON.parse(encrypted) as Record<string, unknown>;
    parsed.kdf_hash = "SHA-1";

    await expect(cipher.decrypt(JSON.stringify(parsed))).rejects.toThrow(
      "Unsupported key derivation hash",
    );
  });

  it("rejects tampered ciphertext", async () => {
    const cipher = new TokenCipher("super-secret");
    const encrypted = await cipher.encrypt("api-token");
    const parsed = JSON.parse(encrypted) as Record<string, unknown>;
    parsed.data = "AAAA";

    await expect(cipher.decrypt(JSON.stringify(parsed))).rejects.toThrow(
      "Decryption failed or token integrity compromised",
    );
  });
});
