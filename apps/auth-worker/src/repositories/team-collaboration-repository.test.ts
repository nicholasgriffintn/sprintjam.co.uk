import { beforeEach, describe, expect, it, vi } from "vitest";

import { teamCollaborationInstallations } from "@sprintjam/db";

import { TeamsContextAlreadyLinkedError } from "../lib/collaboration";
import { TeamCollaborationRepository } from "./team-collaboration-repository";

const drizzleMock = vi.hoisted(() => vi.fn());

vi.mock("drizzle-orm/d1", () => ({
  drizzle: drizzleMock,
}));

describe("TeamCollaborationRepository", () => {
  let insert: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    get = vi.fn().mockResolvedValue({
      id: 3,
      teamId: 8,
      platform: "teams",
      contextKey: "tenant-1:channel:channel-1",
      tenantId: "tenant-1",
      externalTeamId: null,
      externalChannelId: "channel-1",
      externalChatId: null,
      externalMeetingId: null,
      externalUserId: "user-1",
      displayName: "Planning",
      installedById: 2,
      metadata: "{}",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    });
    const where = vi.fn(() => ({ get }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));

    insert = vi.fn();
    update = vi.fn();
    drizzleMock.mockReturnValue({ select, insert, update });
  });

  it("does not reassign an existing Teams context to another team", async () => {
    const repo = new TeamCollaborationRepository({} as any);

    await expect(
      repo.saveTeamsInstallation({
        teamId: 7,
        installedById: 1,
        input: {
          tenantId: "tenant-1",
          externalChannelId: "channel-1",
          externalUserId: "user-1",
        },
      }),
    ).rejects.toBeInstanceOf(TeamsContextAlreadyLinkedError);

    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("updates an existing Teams context only when it belongs to the same team", async () => {
    get
      .mockResolvedValueOnce({
        id: 3,
        teamId: 7,
        platform: "teams",
        contextKey: "tenant-1:channel:channel-1",
        tenantId: "tenant-1",
        externalTeamId: null,
        externalChannelId: "channel-1",
        externalChatId: null,
        externalMeetingId: null,
        externalUserId: "user-1",
        displayName: "Planning",
        installedById: 2,
        metadata: "{}",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      })
      .mockResolvedValueOnce({
        id: 3,
        teamId: 7,
        platform: "teams",
        contextKey: "tenant-1:channel:channel-1",
        tenantId: "tenant-1",
        externalTeamId: null,
        externalChannelId: "channel-1",
        externalChatId: null,
        externalMeetingId: null,
        externalUserId: "user-1",
        displayName: "Updated planning",
        installedById: 1,
        metadata: "{}",
        createdAt: 1700000000000,
        updatedAt: 1700000000001,
      });
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where: updateWhere }));
    update.mockReturnValue({ set });

    const repo = new TeamCollaborationRepository({} as any);
    const result = await repo.saveTeamsInstallation({
      teamId: 7,
      installedById: 1,
      input: {
        tenantId: "tenant-1",
        externalChannelId: "channel-1",
        externalUserId: "user-1",
        displayName: "Updated planning",
      },
    });

    expect(update).toHaveBeenCalledWith(teamCollaborationInstallations);
    expect(insert).not.toHaveBeenCalled();
    expect(result.teamId).toBe(7);
    expect(result.displayName).toBe("Updated planning");
  });
});
