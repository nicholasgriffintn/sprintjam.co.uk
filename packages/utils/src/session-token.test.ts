import { describe, expect, it } from "vitest";

import { isSessionTokenExpired, isSessionTokenValid } from "./session-token";

describe("isSessionTokenExpired", () => {
  it("returns true when token age exceeds TTL", () => {
    expect(isSessionTokenExpired(100, 1000, 100)).toBe(true);
  });

  it("returns false when token age is within TTL", () => {
    expect(isSessionTokenExpired(100, 180, 100)).toBe(false);
  });

  it("returns false when createdAt is missing", () => {
    expect(isSessionTokenExpired(undefined, 1000, 100)).toBe(false);
  });
});

describe("isSessionTokenValid", () => {
  it("returns false when provided token is missing", () => {
    expect(
      isSessionTokenValid({
        storedToken: "abc",
        providedToken: null,
        createdAt: 100,
        now: 150,
        ttlMs: 1000,
      }),
    ).toBe(false);
  });

  it("returns false when stored token is missing", () => {
    expect(
      isSessionTokenValid({
        storedToken: null,
        providedToken: "abc",
        createdAt: 100,
        now: 150,
        ttlMs: 1000,
      }),
    ).toBe(false);
  });

  it("returns false when token is expired", () => {
    expect(
      isSessionTokenValid({
        storedToken: "abc",
        providedToken: "abc",
        createdAt: 100,
        now: 1000,
        ttlMs: 100,
      }),
    ).toBe(false);
  });

  it("returns true when token matches and is not expired", () => {
    expect(
      isSessionTokenValid({
        storedToken: "abc",
        providedToken: "abc",
        createdAt: 100,
        now: 150,
        ttlMs: 1000,
      }),
    ).toBe(true);
  });

  it("matches behaviour for records without createdAt", () => {
    expect(
      isSessionTokenValid({
        storedToken: "abc",
        providedToken: "abc",
        createdAt: undefined,
        now: 150,
        ttlMs: 1,
      }),
    ).toBe(true);
  });
});
