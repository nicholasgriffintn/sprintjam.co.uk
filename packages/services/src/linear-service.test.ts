import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LinearOAuthCredentials } from '@sprintjam/types';

import {
  fetchLinearIssue,
  getLinearOrganization,
  getLinearViewer,
  updateLinearEstimate,
} from './linear-service';

const baseCredentials: LinearOAuthCredentials = {
  id: 1,
  roomKey: "room-1",
  accessToken: "old-token",
  refreshToken: "refresh-token",
  tokenType: "Bearer",
  expiresAt: Date.now() + 60_000,
  scope: "read:linear",
  linearOrganizationId: "org-1",
  linearUserId: "user-1",
  linearUserEmail: "user@test.sprintjam.co.uk",
  estimateField: "estimate",
  authorizedBy: "alice",
  createdAt: 0,
  updatedAt: 0,
};

const issuePayload = {
  data: {
    issue: {
      id: "iss-1",
      identifier: "LIN-1",
      title: "Linear issue",
      description: "Hello world",
      estimate: 5,
      url: "https://linear.app/issue/LIN-1",
      state: { name: "Todo" },
      assignee: { name: "Bob" },
    },
  },
};

describe("linear-service token refresh and queries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refreshes expiring tokens before fetching an issue", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "new-access",
            refresh_token: "new-refresh",
            expires_in: 7200,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(issuePayload), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const onTokenRefresh = vi.fn();
    const ticket = await fetchLinearIssue(
      { ...baseCredentials, expiresAt: Date.now() + 2 * 60_000 },
      "iss-1",
      onTokenRefresh,
      "client-id",
      "client-secret",
    );

    expect(onTokenRefresh).toHaveBeenCalledWith(
      "new-access",
      "new-refresh",
      Date.now() + 7200 * 1000,
    );
    expect(ticket.key).toBe("LIN-1");
    expect(ticket.storyPoints).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("propagates GraphQL errors from fetchLinearIssue", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ errors: [{ message: "API down" }] }), {
          status: 200,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const attempt = fetchLinearIssue(
      {
        ...baseCredentials,
        refreshToken: null,
        expiresAt: Date.now() + 10 * 60_000,
      },
      "iss-2",
      vi.fn(),
      "client",
      "secret",
    );

    await expect(attempt).rejects.toThrow(/API down/);
  });

  it("falls back to identifier lookup when id query returns no issue", async () => {
    const fetchMock = vi
      .fn()
      // ID lookup returns null issue
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { issue: null } }), {
          status: 200,
        }),
      )
      // Identifier lookup returns the issue
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { issues: { nodes: [issuePayload.data.issue] } },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const ticket = await fetchLinearIssue(
      { ...baseCredentials, refreshToken: null },
      "LIN-99",
      vi.fn(),
      "client",
      "secret",
    );

    expect(ticket.key).toBe("LIN-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, fallbackInit] = fetchMock.mock.calls[1];
    expect(JSON.parse(fallbackInit?.body as string).query).toContain(
      "IssueByNumber",
    );
  });
});

describe("linear-service mutations and lookups", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rounds estimates when updating and returns merged ticket data", async () => {
    const fetchMock = vi
      .fn()
      // Resolve issue before update
      .mockResolvedValueOnce(
        new Response(JSON.stringify(issuePayload), { status: 200 }),
      )
      // Mutation call
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              issueUpdate: {
                success: true,
                issue: issuePayload.data.issue,
              },
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const updated = await updateLinearEstimate(
      {
        ...baseCredentials,
        expiresAt: Date.now() + 10 * 60_000,
        refreshToken: null,
      },
      "iss-1",
      3.6,
      vi.fn(),
      "client-id",
      "client-secret",
    );

    expect(updated.storyPoints).toBe(5);
    const [, mutationInit] = fetchMock.mock.calls[1];
    const parsed = JSON.parse(mutationInit?.body as string);
    expect(parsed.variables.estimate).toBe(4);
    expect(parsed.variables.issueId).toBe("iss-1");
  });

  it("returns organization info for the viewer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { organization: { id: "org-1", name: "Sprintjam" } },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const org = await getLinearOrganization("token-123");
    expect(org).toEqual({ id: "org-1", name: "Sprintjam" });
  });

  it("throws when getLinearViewer receives an unauthorized response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 401, statusText: "Unauthorized" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLinearViewer("bad-token")).rejects.toThrow(/401/i);
  });

  it("resolves identifiers before updating estimates", async () => {
    const fetchMock = vi
      .fn()
      // ID lookup returns null
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { issue: null } }), {
          status: 200,
        }),
      )
      // Identifier lookup returns an issue
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { issues: { nodes: [issuePayload.data.issue] } },
          }),
          { status: 200 },
        ),
      )
      // Mutation request
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              issueUpdate: {
                success: true,
                issue: issuePayload.data.issue,
              },
            },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const updated = await updateLinearEstimate(
      { ...baseCredentials, refreshToken: null },
      "LIN-42",
      8,
      vi.fn(),
      "client",
      "secret",
    );

    expect(updated.key).toBe("LIN-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const mutationInit = fetchMock.mock.calls[2]?.[1];
    const parsed = JSON.parse(mutationInit?.body as string);
    expect(parsed.variables.issueId).toBe("iss-1");
  });
});
