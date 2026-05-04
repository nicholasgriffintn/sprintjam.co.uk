import { describe, expect, it } from "vitest";

import { buildTeamsContextKey } from "./collaboration";

describe("buildTeamsContextKey", () => {
  it("scopes personal Teams contexts by user inside the tenant", () => {
    expect(
      buildTeamsContextKey({
        tenantId: "tenant-1",
        externalTeamId: null,
        externalChannelId: null,
        externalChatId: null,
        externalMeetingId: null,
        externalUserId: "user-1",
      }),
    ).toBe("tenant-1:personal:user-1");

    expect(
      buildTeamsContextKey({
        tenantId: "tenant-1",
        externalTeamId: null,
        externalChannelId: null,
        externalChatId: null,
        externalMeetingId: null,
        externalUserId: "user-2",
      }),
    ).toBe("tenant-1:personal:user-2");
  });
});
