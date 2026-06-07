import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamIntegrationRepository } from "./team-integration-repository";

const drizzleMock = vi.hoisted(() => vi.fn());

vi.mock("drizzle-orm/d1", () => ({
  drizzle: drizzleMock,
}));

vi.mock("@sprintjam/utils", async () => {
  const actual = await vi.importActual<typeof import("@sprintjam/utils")>("@sprintjam/utils");
  return {
    ...actual,
    TokenCipher: class {
      async encrypt(value: string | null) {
        return value;
      }

      async decrypt(value: string | null) {
        return value;
      }
    },
  };
});

describe("TeamIntegrationRepository", () => {
  let where: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    where = vi.fn();
    from = vi.fn(() => ({ where }));
    select = vi.fn(() => ({ from }));

    drizzleMock.mockReturnValue({ select });
  });

  it("marks token-expired integrations as disconnected in list output", async () => {
    const now = Date.now();
    where.mockResolvedValue([
      {
        provider: "jira",
        authorizedBy: "owner@example.com",
        expiresAt: now + 60_000,
        metadata: JSON.stringify({ linearOrganizationId: "linear-org" }),
      },
      {
        provider: "linear",
        authorizedBy: "owner@example.com",
        expiresAt: now - 1,
        metadata: "{}",
      },
    ]);

    const repo = new TeamIntegrationRepository({} as any, "secret");
    const statuses = await repo.listIntegrationStatuses(7);

    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toMatchObject({
      provider: "jira",
      connected: true,
    });
    expect(statuses[1]).toMatchObject({
      provider: "linear",
      connected: false,
    });
  });

  it("returns empty metadata when stored metadata is malformed", async () => {
    where.mockResolvedValue([
      {
        provider: "github",
        authorizedBy: "owner@example.com",
        expiresAt: Date.now() + 60_000,
        metadata: "not-json",
      },
    ]);

    const repo = new TeamIntegrationRepository({} as any, "secret");
    const statuses = await repo.listIntegrationStatuses(7);

    expect(statuses[0]!.metadata).toEqual({});
  });
});

