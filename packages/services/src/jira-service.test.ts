import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  JiraFieldDefinition,
  JiraOAuthCredentials,
} from '@sprintjam/types';

import {
  fetchJiraFields,
  fetchJiraTicket,
  findDefaultSprintField,
  findDefaultStoryPointsField,
  updateJiraStoryPoints,
} from './jira-service';

const baseCredentials: JiraOAuthCredentials = {
  id: 1,
  roomKey: "room-1",
  accessToken: "old-token",
  refreshToken: "refresh-token",
  tokenType: "Bearer",
  expiresAt: Date.now() + 60_000,
  scope: "read:jira",
  jiraDomain: "example.atlassian.net",
  jiraCloudId: "cloud-id",
  jiraUserId: "user-id",
  jiraUserEmail: "user@test.sprintjam.co.uk",
  storyPointsField: "customfield_100",
  sprintField: null,
  authorizedBy: "alice",
  createdAt: 0,
  updatedAt: 0,
};

const issueResponse = {
  id: "1",
  key: "ISS-1",
  fields: {
    summary: "Issue title",
    description: {
      content: [{ content: [{ text: "First line" }] }, { text: "Second" }],
    },
    status: { name: "To Do" },
    assignee: { displayName: "Bob" },
    customfield_100: 8,
  },
};

describe("jira-service token flow", () => {
  const refreshResponse = {
    access_token: "new-access",
    refresh_token: "new-refresh",
    expires_in: 3600,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refreshes expiring tokens before fetching a ticket", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(refreshResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(issueResponse), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const onTokenRefresh = vi.fn();

    const ticket = await fetchJiraTicket(
      { ...baseCredentials, expiresAt: Date.now() + 2 * 60_000 },
      "ISS-1",
      onTokenRefresh,
      "client-id",
      "client-secret",
    );

    expect(onTokenRefresh).toHaveBeenCalledWith(
      "new-access",
      "new-refresh",
      Date.now() + refreshResponse.expires_in * 1000,
    );
    expect(ticket.description).toBe("First line\nSecond");
    expect(ticket.storyPoints).toBe(8);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/issue/ISS-1"),
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
  });

  it("throws on unauthorized ticket fetch when no refresh is available", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const attempt = fetchJiraTicket(
      {
        ...baseCredentials,
        refreshToken: null,
        expiresAt: Date.now() + 10 * 60_000,
      },
      "ISS-2",
      vi.fn(),
      "client-id",
      "client-secret",
    );

    await expect(attempt).rejects.toThrow(/401/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("jira-service field helpers", () => {
  it("prefers known story point field names, then partial, then numeric", () => {
    const fields: JiraFieldDefinition[] = [
      { id: "1", name: "Other", schema: { type: "string" } },
      { id: "2", name: "Story Points Estimate", schema: { type: "number" } },
      { id: "3", name: "Some Number", schema: { type: "number" } },
    ];
    expect(findDefaultStoryPointsField(fields)).toBe("2");

    const partial = [
      { id: "4", name: "Custom story point total", schema: { type: "string" } },
    ];
    expect(findDefaultStoryPointsField(partial)).toBe("4");

    const numericFallback = [
      { id: "5", name: "Unrelated", schema: { type: "string" } },
      { id: "6", name: "Number Field", schema: { type: "number" } },
    ];
    expect(findDefaultStoryPointsField(numericFallback)).toBe("6");
  });

  it("selects sprint field when present", () => {
    const fields: JiraFieldDefinition[] = [
      { id: "11", name: "Sprint", schema: { type: "string" } },
      { id: "12", name: "Other", schema: { type: "string" } },
    ];
    expect(findDefaultSprintField(fields)).toBe("11");

    const partial = [
      { id: "13", name: "Next Sprint Choice", schema: { type: "string" } },
    ];
    expect(findDefaultSprintField(partial)).toBe("13");
  });
});

describe("jira-service field and update operations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects fetchJiraFields when cloud id is missing", async () => {
    const attempt = fetchJiraFields(
      { ...baseCredentials, jiraCloudId: undefined as any },
      vi.fn(),
      "client",
      "secret",
    );

    await expect(attempt).rejects.toThrow(/cloud ID missing/i);
  });

  it("returns fields when request succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            { id: "sp", name: "Story Points", schema: { type: "number" } },
          ]),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const fields = await fetchJiraFields(
      baseCredentials,
      vi.fn(),
      "client-id",
      "client-secret",
    );

    expect(fields[0].id).toBe("sp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("updates story points using configured field and merges ticket", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const currentTicket = {
      id: "1",
      key: "ISS-1",
      summary: "Issue title",
      description: "",
      status: "To Do",
      assignee: null,
      storyPoints: null,
      url: "https://example.atlassian.net/browse/ISS-1",
    };

    const updated = await updateJiraStoryPoints(
      baseCredentials,
      "ISS-1",
      13,
      currentTicket,
      vi.fn(),
      "client-id",
      "client-secret",
    );

    expect(updated.storyPoints).toBe(13);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PUT");
    expect(
      JSON.parse(init?.body as string).fields[
        baseCredentials.storyPointsField!
      ],
    ).toBe(13);
  });

  it("throws when story points field is not configured", async () => {
    const attempt = updateJiraStoryPoints(
      { ...baseCredentials, storyPointsField: null },
      "ISS-2",
      3,
      undefined,
      vi.fn(),
      "client-id",
      "client-secret",
    );

    await expect(attempt).rejects.toThrow(/story points field not configured/i);
  });
});
