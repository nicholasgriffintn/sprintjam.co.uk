import { afterEach, describe, expect, it, vi } from "vitest";

import {
  secureRandomFloat,
  secureRandomInt,
  secureRandomString,
} from "./random";

const originalCrypto = crypto;

function mockRandomValues(values: number[]) {
  let index = 0;
  const getRandomValues = vi.fn((array: Uint32Array) => {
    array[0] = values[index++] ?? 0;
    return array;
  });

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues },
  });

  return getRandomValues;
}

describe("secureRandomInt", () => {
  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    });
  });

  it("returns a value below the exclusive maximum", () => {
    mockRandomValues([7]);

    expect(secureRandomInt(5)).toBe(2);
  });

  it("rejects values outside the unbiased range", () => {
    const getRandomValues = mockRandomValues([0xffffffff, 4]);

    expect(secureRandomInt(10)).toBe(4);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid maximums", () => {
    expect(() => secureRandomInt(0)).toThrow(
      "maxExclusive must be a positive safe integer",
    );
    expect(() => secureRandomInt(0.5)).toThrow(
      "maxExclusive must be a positive safe integer",
    );
    expect(() => secureRandomInt(0x100000001)).toThrow(
      "maxExclusive cannot exceed 2^32",
    );
  });
});

describe("secureRandomString", () => {
  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    });
  });

  it("builds strings from the supplied alphabet", () => {
    mockRandomValues([0, 1, 2, 3]);

    expect(secureRandomString("ABCD", 4)).toBe("ABCD");
  });

  it("rejects invalid inputs", () => {
    expect(() => secureRandomString("", 4)).toThrow("alphabet is required");
    expect(() => secureRandomString("ABC", -1)).toThrow(
      "length must be a non-negative safe integer",
    );
  });
});

describe("secureRandomFloat", () => {
  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    });
  });

  it("returns a number from zero up to but not including one", () => {
    mockRandomValues([0x80000000]);

    expect(secureRandomFloat()).toBe(0.5);
  });
});
