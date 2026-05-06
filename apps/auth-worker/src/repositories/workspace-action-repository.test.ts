import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { workspaceActionEvents, workspaceActionItems } from "@sprintjam/db";

import { WorkspaceActionRepository } from "./workspace-action-repository";

const drizzleMock = vi.hoisted(() => vi.fn());

vi.mock("drizzle-orm/d1", () => ({
  drizzle: drizzleMock,
}));

describe("WorkspaceActionRepository.upsertAction", () => {
  let insert: ReturnType<typeof vi.fn>;
  let onConflictDoUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);

    const actionReturning = vi.fn().mockResolvedValue([{ id: 31 }]);
    onConflictDoUpdate = vi.fn(() => ({ returning: actionReturning }));
    const actionValues = vi.fn(() => ({ onConflictDoUpdate }));

    const eventReturning = vi.fn().mockResolvedValue([{ id: 41 }]);
    const eventValues = vi.fn(() => ({ returning: eventReturning }));

    insert = vi.fn((table) => {
      if (table === workspaceActionItems) {
        return { values: actionValues };
      }
      if (table === workspaceActionEvents) {
        return { values: eventValues };
      }
      throw new Error("Unexpected insert table");
    });

    drizzleMock.mockReturnValue({ insert });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves existing status fields when duplicate source records are refreshed", async () => {
    const repo = new WorkspaceActionRepository({} as never);

    await repo.upsertAction({
      teamId: 10,
      source: "wheel",
      sourceSessionId: 21,
      sourceRef: "wheel-outcome-21-decision",
      title: "Decision: Ship",
      createdById: 1,
    });

    const updateSet = onConflictDoUpdate.mock.calls[0][0].set;
    expect(updateSet).not.toHaveProperty("status");
    expect(updateSet).not.toHaveProperty("resolvedById");
    expect(updateSet).not.toHaveProperty("resolvedAt");
  });

  it("updates status fields when an explicit status is supplied", async () => {
    const repo = new WorkspaceActionRepository({} as never);

    await repo.upsertAction({
      teamId: 10,
      source: "manual",
      sourceRef: "manual-1",
      title: "Review dependency",
      status: "resolved",
      resolvedById: 2,
      createdById: 1,
    });

    const updateSet = onConflictDoUpdate.mock.calls[0][0].set;
    expect(updateSet).toMatchObject({
      status: "resolved",
      resolvedById: 2,
      resolvedAt: 1_700_000_000_000,
    });
  });
});
