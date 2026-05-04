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
  isNull: vi.fn(),
  lt: vi.fn(),
}));

describe("AuthRepository cleanup", () => {
  const now = 1_700_000_000_000;
  let deleteFn: ReturnType<typeof vi.fn>;
  let deleteWhere: ReturnType<typeof vi.fn>;
  let deleteReturning: ReturnType<typeof vi.fn>;
  let ltSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    ltSpy = vi.spyOn(drizzleOrm, "lt");

    deleteReturning = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
    deleteFn = vi.fn(() => ({ where: deleteWhere }));

    drizzleMock.mockReturnValue({
      delete: deleteFn,
    });
  });

  afterEach(() => {
    ltSpy.mockRestore();
    vi.useRealTimers();
  });

  it("cleans up expired magic links with a direct DELETE RETURNING", async () => {
    const repo = new AuthRepository({} as any);
    const deleted = await repo.cleanupExpiredMagicLinks();

    expect(deleted).toBe(2);
    expect(deleteFn).toHaveBeenCalledWith(magicLinks);
    expect(ltSpy).toHaveBeenCalledWith(magicLinks.expiresAt, now);
    expect(deleteReturning).toHaveBeenCalledWith({ id: magicLinks.id });
  });

  it("cleans up expired sessions with a direct DELETE RETURNING", async () => {
    deleteReturning.mockResolvedValueOnce([{ userId: 1 }, { userId: 2 }]);
    const repo = new AuthRepository({} as any);
    const deleted = await repo.cleanupExpiredSessions();

    expect(deleted).toBe(2);
    expect(deleteFn).toHaveBeenCalledWith(workspaceSessions);
    expect(ltSpy).toHaveBeenCalledWith(workspaceSessions.expiresAt, now);
    expect(deleteReturning).toHaveBeenCalledWith({
      userId: workspaceSessions.userId,
    });
  });
});

describe("AuthRepository.validateSession stale-threshold guard", () => {
  const now = 1_700_000_000_000;
  const THRESHOLD_MS = 5 * 60 * 1000;

  let get: ReturnType<typeof vi.fn>;
  let updateWhere: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  const makeSession = (lastUsedAt: number) => ({
    userId: 1,
    email: "user@test.com",
    organisationId: 1,
    workspaceRole: "member" as const,
    expiresAt: now + 60_000,
    lastUsedAt,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    updateWhere = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where: updateWhere }));
    update = vi.fn(() => ({ set }));

    // Build the SELECT chain: .select().from().innerJoin().innerJoin().where().get()
    get = vi.fn();
    const selectWhere = vi.fn(() => ({ get }));
    const innerJoin2 = vi.fn(() => ({ where: selectWhere }));
    const innerJoin1 = vi.fn(() => ({ innerJoin: innerJoin2 }));
    const from = vi.fn(() => ({ innerJoin: innerJoin1 }));
    const select = vi.fn(() => ({ from }));

    drizzleMock.mockReturnValue({ select, update });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes lastUsedAt when the stored value is stale", async () => {
    get.mockResolvedValue(makeSession(now - THRESHOLD_MS - 1));
    const repo = new AuthRepository({} as any);
    const result = await repo.validateSession("token-hash");

    expect(result).not.toBeNull();
    expect(update).toHaveBeenCalled();
    expect(updateWhere).toHaveBeenCalled();
  });

  it("skips the lastUsedAt write when the stored value is recent", async () => {
    get.mockResolvedValue(makeSession(now - THRESHOLD_MS + 1));
    const repo = new AuthRepository({} as any);
    const result = await repo.validateSession("token-hash");

    expect(result).not.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns null when the session is expired", async () => {
    get.mockResolvedValue({
      ...makeSession(now - THRESHOLD_MS - 1),
      expiresAt: now - 1,
    });
    const repo = new AuthRepository({} as any);
    const result = await repo.validateSession("token-hash");

    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns null when no session row is found", async () => {
    get.mockResolvedValue(undefined);
    const repo = new AuthRepository({} as any);
    const result = await repo.validateSession("token-hash");

    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});
