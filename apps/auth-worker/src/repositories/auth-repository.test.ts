import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { magicLinks, workspaceSessions } from "@sprintjam/db";
import * as drizzleOrm from "drizzle-orm";

import { AuthRepository } from "./auth-repository";

const drizzleMock = vi.hoisted(() => vi.fn());

vi.mock("drizzle-orm/d1", () => ({
  drizzle: drizzleMock,
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  lt: vi.fn(),
}));

describe("AuthRepository cleanup", () => {
  const now = 1_700_000_000_000;
  let select: ReturnType<typeof vi.fn>;
  let deleteFn: ReturnType<typeof vi.fn>;
  let deleteWhere: ReturnType<typeof vi.fn>;
  let selectWhere: ReturnType<typeof vi.fn>;
  let ltSpy: ReturnType<typeof vi.spyOn>;
  let inArraySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    ltSpy = vi.spyOn(drizzleOrm, "lt");
    inArraySpy = vi.spyOn(drizzleOrm, "inArray");

    deleteWhere = vi.fn().mockResolvedValue(undefined);
    deleteFn = vi.fn(() => ({ where: deleteWhere }));

    selectWhere = vi.fn(() => ({
      all: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    }));
    const from = vi.fn(() => ({ where: selectWhere }));
    select = vi.fn(() => ({ from }));

    drizzleMock.mockReturnValue({
      select,
      delete: deleteFn,
    });
  });

  afterEach(() => {
    ltSpy.mockRestore();
    inArraySpy.mockRestore();
    vi.useRealTimers();
  });

  it("cleans up expired magic links using lt", async () => {
    const repo = new AuthRepository({} as any);
    const deleted = await repo.cleanupExpiredMagicLinks();

    expect(deleted).toBe(2);
    expect(ltSpy).toHaveBeenCalledWith(magicLinks.expiresAt, now);
    expect(select).toHaveBeenCalledWith({ id: magicLinks.id });
    expect(deleteFn).toHaveBeenCalledWith(magicLinks);
    expect(inArraySpy).toHaveBeenCalledWith(magicLinks.id, [1, 2]);
    expect(deleteWhere).toHaveBeenCalled();
  });

  it("cleans up expired sessions using lt", async () => {
    selectWhere.mockReturnValueOnce({
      all: vi
        .fn()
        .mockResolvedValue([
          { tokenHash: "token-a" },
          { tokenHash: "token-b" },
        ]),
    });
    const repo = new AuthRepository({} as any);
    const deleted = await repo.cleanupExpiredSessions();

    expect(deleted).toBe(2);
    expect(ltSpy).toHaveBeenCalledWith(workspaceSessions.expiresAt, now);
    expect(select).toHaveBeenCalledWith({
      tokenHash: workspaceSessions.tokenHash,
    });
    expect(deleteFn).toHaveBeenCalledWith(workspaceSessions);
    expect(inArraySpy).toHaveBeenCalledWith(workspaceSessions.tokenHash, [
      "token-a",
      "token-b",
    ]);
    expect(deleteWhere).toHaveBeenCalled();
  });
});
