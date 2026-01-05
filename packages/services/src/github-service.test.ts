import { afterEach, describe, expect, it, vi } from "vitest";
import type { GithubOAuthCredentials } from '@sprintjam/types';

import {
  escapeGithubSearchValue,
  fetchGithubRepoIssues,
} from './github-service';

const baseCredentials: GithubOAuthCredentials = {
  id: 1,
  roomKey: "room-1",
  accessToken: "token",
  refreshToken: "refresh-token",
  tokenType: "Bearer",
  expiresAt: Date.now() + 60_000,
  scope: "repo",
  authorizedBy: "alice",
  createdAt: 0,
  updatedAt: 0,
  githubLogin: "octocat",
  githubUserEmail: "octocat@test.sprintjam.co.uk",
  defaultOwner: "octo",
  defaultRepo: "repo",
};

describe("escapeGithubSearchValue", () => {
  it("escapes quotes and backslashes", () => {
    const escaped = escapeGithubSearchValue('Phase "One" \\ path');
    expect(escaped).toBe('Phase \\"One\\" \\\\ path');
  });
});

describe("fetchGithubRepoIssues search qualifiers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("escapes milestone titles inside search queries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const milestoneTitle = 'Phase "One" \\ path';
    await fetchGithubRepoIssues(baseCredentials, "octo/repo", {
      milestoneTitle,
      search: "login issue",
      limit: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    const q = url.searchParams.get("q");
    expect(q).toBe(
      `repo:octo/repo is:issue milestone:\\"${escapeGithubSearchValue(
        milestoneTitle,
      )}\\" in:title,body login issue`,
    );
  });
});
