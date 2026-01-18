import { describe, it, expect } from "vitest";

import { base32Decode, base32Encode } from "./base32";

describe("base32", () => {
  it("encodes and decodes base32 values", () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    const encoded = base32Encode(bytes);
    expect(encoded).toBe("JBSWY3DP");
    expect(base32Decode(encoded)).toEqual(bytes);
  });

  it("decodes base32 values with padding and whitespace", () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    const encoded = "JBSW Y3DP\n====";
    expect(base32Decode(encoded)).toEqual(bytes);
  });
});
