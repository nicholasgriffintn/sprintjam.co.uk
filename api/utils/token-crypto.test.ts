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
});
