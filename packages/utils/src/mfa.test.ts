import { describe, it, expect, vi } from "vitest";

import {
  generateRecoveryCodes,
  generateTotpCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotpCode,
} from "./mfa";

describe("mfa", () => {
  it("generates and verifies TOTP codes for the current window", async () => {
    const secret = "JBSWY3DPEHPK3PXP"; // base32 for "Hello!1234"
    const timestamp = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(timestamp);
    const code = await generateTotpCode(secret, timestamp);
    const isValid = await verifyTotpCode(secret, code, {
      window: 0,
      stepSeconds: 30,
    });
    expect(isValid).toBe(true);
    vi.useRealTimers();
  });

  it("normalises recovery codes consistently", () => {
    expect(normalizeRecoveryCode("abcd-1234 ef")).toBe("ABCD1234EF");
  });

  it("hashes recovery codes deterministically", async () => {
    const hashA = await hashRecoveryCode("abcd-1234");
    const hashB = await hashRecoveryCode("ABCD1234");
    expect(hashA).toBe(hashB);
  });

  it("generates formatted recovery codes", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-7]{4}(?:-[A-Z2-7]{4}){3}$/);
    }
  });
});
