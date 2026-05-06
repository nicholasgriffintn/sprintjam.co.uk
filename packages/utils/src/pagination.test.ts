import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  buildPaginationMeta,
  isPaginationError,
  parsePagination,
} from "./pagination";

describe("parsePagination", () => {
  it("returns default values when no params provided", () => {
    const result = parsePagination(new URL("https://example.com/api"));

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });

  it("parses valid limit and offset", () => {
    const result = parsePagination(
      new URL("https://example.com/api?limit=25&offset=50"),
    );

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result).toEqual({
      limit: 25,
      offset: 50,
    });
  });

  it("uses custom default limit", () => {
    const result = parsePagination(new URL("https://example.com/api"), {
      defaultLimit: 10,
    });

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result).toEqual({
      limit: 10,
      offset: 0,
    });
  });

  it("parses custom pagination parameter names", () => {
    const result = parsePagination(
      new URL("https://example.com/api?sessionsLimit=12&sessionsOffset=24"),
      {
        defaultLimit: 10,
        limitParam: "sessionsLimit",
        offsetParam: "sessionsOffset",
      },
    );

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result).toEqual({
      limit: 12,
      offset: 24,
    });
  });

  it("returns errors for invalid pagination params", () => {
    expect(
      isPaginationError(
        parsePagination(new URL("https://example.com/api?limit=0")),
      ),
    ).toBe(true);
    expect(
      isPaginationError(
        parsePagination(new URL("https://example.com/api?limit=101")),
      ),
    ).toBe(true);
    expect(
      isPaginationError(
        parsePagination(new URL("https://example.com/api?offset=-1")),
      ),
    ).toBe(true);
    expect(
      isPaginationError(
        parsePagination(new URL("https://example.com/api?offset=xyz")),
      ),
    ).toBe(true);
  });

  it("accepts pagination boundaries", () => {
    const result = parsePagination(
      new URL(
        `https://example.com/api?limit=${MAX_PAGE_SIZE}&offset=${MIN_PAGE_SIZE}`,
      ),
    );

    if (isPaginationError(result)) {
      throw new Error("Expected pagination options");
    }

    expect(result.limit).toBe(MAX_PAGE_SIZE);
    expect(result.offset).toBe(MIN_PAGE_SIZE);
  });
});

describe("buildPaginationMeta", () => {
  it("returns the next offset when another page exists", () => {
    expect(buildPaginationMeta({ limit: 20, offset: 20 }, 45)).toEqual({
      limit: 20,
      offset: 20,
      total: 45,
      hasMore: true,
      nextOffset: 40,
    });
  });

  it("returns null next offset on the last page", () => {
    expect(buildPaginationMeta({ limit: 20, offset: 40 }, 45)).toEqual({
      limit: 20,
      offset: 40,
      total: 45,
      hasMore: false,
      nextOffset: null,
    });
  });
});
