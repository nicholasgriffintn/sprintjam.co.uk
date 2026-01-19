import { describe, it, expect } from "vitest";

import {
  parsePagination,
  isPaginationError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "./pagination";

describe("parsePagination", () => {
  it("returns default values when no params provided", () => {
    const url = new URL("https://example.com/api");
    const result = parsePagination(url);

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });

  it("parses valid limit and offset", () => {
    const url = new URL("https://example.com/api?limit=25&offset=50");
    const result = parsePagination(url);

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result).toEqual({
      limit: 25,
      offset: 50,
    });
  });

  it("uses custom default limit", () => {
    const url = new URL("https://example.com/api");
    const result = parsePagination(url, { defaultLimit: 10 });

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result).toEqual({
      limit: 10,
      offset: 0,
    });
  });

  it("returns error when limit is below minimum", () => {
    const url = new URL("https://example.com/api?limit=0");
    const result = parsePagination(url);

    expect(isPaginationError(result)).toBe(true);
    if (isPaginationError(result)) {
      expect(result.error).toContain("must be between");
    }
  });

  it("returns error when limit exceeds maximum", () => {
    const url = new URL("https://example.com/api?limit=101");
    const result = parsePagination(url);

    expect(isPaginationError(result)).toBe(true);
    if (isPaginationError(result)) {
      expect(result.error).toContain("must be between");
    }
  });

  it("returns error when limit is NaN", () => {
    const url = new URL("https://example.com/api?limit=abc");
    const result = parsePagination(url);

    expect(isPaginationError(result)).toBe(true);
    if (isPaginationError(result)) {
      expect(result.error).toContain("must be between");
    }
  });

  it("returns error when offset is negative", () => {
    const url = new URL("https://example.com/api?offset=-1");
    const result = parsePagination(url);

    expect(isPaginationError(result)).toBe(true);
    if (isPaginationError(result)) {
      expect(result.error).toContain("non-negative");
    }
  });

  it("returns error when offset is NaN", () => {
    const url = new URL("https://example.com/api?offset=xyz");
    const result = parsePagination(url);

    expect(isPaginationError(result)).toBe(true);
    if (isPaginationError(result)) {
      expect(result.error).toContain("non-negative");
    }
  });

  it("accepts limit at minimum boundary", () => {
    const url = new URL(`https://example.com/api?limit=${MIN_PAGE_SIZE}`);
    const result = parsePagination(url);

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result.limit).toBe(MIN_PAGE_SIZE);
  });

  it("accepts limit at maximum boundary", () => {
    const url = new URL(`https://example.com/api?limit=${MAX_PAGE_SIZE}`);
    const result = parsePagination(url);

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result.limit).toBe(MAX_PAGE_SIZE);
  });

  it("accepts offset at zero boundary", () => {
    const url = new URL("https://example.com/api?offset=0");
    const result = parsePagination(url);

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result.offset).toBe(0);
  });
});

describe("isPaginationError", () => {
  it("returns true for error objects", () => {
    const error = { error: "Something went wrong" };
    expect(isPaginationError(error)).toBe(true);
  });

  it("returns false for valid pagination options", () => {
    const options = { limit: 50, offset: 0 };
    expect(isPaginationError(options)).toBe(false);
  });
});
