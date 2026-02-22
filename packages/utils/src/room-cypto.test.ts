import { describe, test, expect } from "vitest";

import {
  hashPasscode,
  parsePasscodeHash,
  serializePasscodeHash,
  signState,
  verifyPasscode,
  verifyState,
  generateSessionToken,
} from './room-cypto';
import { escapeHtml } from './escape';

describe("Security Utils", () => {
  const secret = "test-secret";
  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  test("hashPasscode and verifyPasscode roundtrip with provided salt/iterations", async () => {
    const salt = new Uint8Array(16).fill(1);
    const iterations = 10_000; // keep tests fast while exercising path

    const hashed = await hashPasscode("secret-pass", salt, iterations);

    expect(hashed.salt).toBe(toHex(salt));
    expect(hashed.iterations).toBe(iterations);
    // 256-bit output -> 64 hex chars
    expect(hashed.hash).toMatch(/^[a-f0-9]{64}$/);

    const isValid = await verifyPasscode("secret-pass", hashed);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPasscode("wrong-pass", hashed);
    expect(isInvalid).toBe(false);
  });

  test("hashPasscode rejects too-short or too-long passcodes", async () => {
    await expect(hashPasscode("abc")).rejects.toThrow(
      /cannot be less than 4 characters/i,
    );
    const tooLong = "x".repeat(129);
    await expect(hashPasscode(tooLong)).rejects.toThrow(/too long/i);
  });

  test("serialize/parse passcode hash payload roundtrips", async () => {
    const payload = await hashPasscode(
      "another-pass",
      new Uint8Array(16),
      1234,
    );
    const serialized = serializePasscodeHash(payload);
    expect(serialized).toBeTruthy();
    const parsed = parsePasscodeHash(serialized);
    expect(parsed).toEqual(payload);
    expect(parsePasscodeHash(null)).toBeNull();
    expect(parsePasscodeHash("not-json")).toBeNull();
  });

  test("generateSessionToken returns url-safe base64 without padding", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes -> 43/44 chars without padding
  });

  test("signState and verifyState should work correctly", async () => {
    const data = { foo: "bar" };
    const signed = await signState(data, secret);
    const verified = await verifyState(signed, secret);
    expect(verified).toEqual(data);
  });

  test("verifyState should fail with wrong secret", async () => {
    const data = { foo: "bar" };
    const signed = await signState(data, secret);
    await expect(verifyState(signed, "wrong-secret")).rejects.toThrow(
      "Invalid state",
    );
  });

  test("verifyState should fail with tampered data", async () => {
    const data = { foo: "bar" };
    const signed = await signState(data, secret);
    const decoded = JSON.parse(atob(signed));
    decoded.data.foo = "baz";
    const tampered = btoa(JSON.stringify(decoded));
    await expect(verifyState(tampered, secret)).rejects.toThrow(
      "Invalid state",
    );
  });

  test("escapeHtml should escape special characters", () => {
    const input = '<script>alert("xss")</script>';
    const expected = "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });
});
