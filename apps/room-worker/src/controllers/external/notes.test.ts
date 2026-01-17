import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request as CfRequest } from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";

import {
  updateJiraStoryPointsController,
} from "./jira-controller";
import { updateLinearEstimateController } from "./linear-controller";
import { updateGithubEstimateController } from "./github-controller";

vi.mock("@sprintjam/services", () => ({
  fetchJiraTicket: vi.fn(),
  updateJiraStoryPoints: vi.fn(),
  addJiraComment: vi.fn(),
  fetchLinearIssue: vi.fn(),
  updateLinearEstimate: vi.fn(),
  addLinearComment: vi.fn(),
  updateGithubEstimate: vi.fn(),
  addGithubComment: vi.fn(),
}));

vi.mock("@sprintjam/utils", async () => {
  const actual = await vi.importActual<typeof import("@sprintjam/utils")>(
    "@sprintjam/utils",
  );
  return {
    ...actual,
    getRoomStub: vi.fn(),
  };
});

import {
  addJiraComment,
  fetchJiraTicket,
  updateJiraStoryPoints,
  addLinearComment,
  fetchLinearIssue,
  updateLinearEstimate,
  addGithubComment,
  updateGithubEstimate,
} from "@sprintjam/services";
import { getRoomStub } from "@sprintjam/utils";

const makeRequest = (body: Record<string, unknown>) =>
  new Request("https://test.sprintjam.co.uk", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as CfRequest;

const makeRoomStub = (credentials: Record<string, unknown>) => ({
  fetch: vi.fn(async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname === "/session/validate") {
      return new Response(null, { status: 200 });
    }
    if (url.pathname.includes("/oauth/credentials")) {
      return new Response(JSON.stringify({ credentials }), { status: 200 });
    }
    if (url.pathname.includes("/oauth/refresh")) {
      return new Response(null, { status: 200 });
    }
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
    });
  }),
});

describe("external controllers note handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds Jira comment when note provided and story points unchanged", async () => {
    const credentials = {
      jiraCloudId: "cloud",
      storyPointsField: "customfield_100",
      accessToken: "token",
      refreshToken: "refresh",
    };
    vi.mocked(getRoomStub).mockReturnValue(makeRoomStub(credentials) as any);
    vi.mocked(fetchJiraTicket).mockResolvedValue({
      id: "1",
      key: "ISS-1",
      storyPoints: 3,
    } as any);

    const env = {
      JIRA_OAUTH_CLIENT_ID: "id",
      JIRA_OAUTH_CLIENT_SECRET: "secret",
    } as unknown as RoomWorkerEnv;

    const response = (await updateJiraStoryPointsController(
      "ISS-1",
      makeRequest({
        storyPoints: 3,
        roomKey: "room-1",
        userName: "alice",
        sessionToken: "token",
        note: "Decision note",
      }),
      env,
    )) as Response;

    expect(response.status).toBe(200);
    expect(updateJiraStoryPoints).not.toHaveBeenCalled();
    expect(addJiraComment).toHaveBeenCalledWith(
      expect.objectContaining({ jiraCloudId: "cloud" }),
      "ISS-1",
      "SprintJam decision note: Decision note",
      expect.any(Function),
      "id",
      "secret",
    );
  });

  it("adds Linear comment when note provided and estimate unchanged", async () => {
    const credentials = {
      accessToken: "token",
      refreshToken: "refresh",
    };
    vi.mocked(getRoomStub).mockReturnValue(makeRoomStub(credentials) as any);
    vi.mocked(fetchLinearIssue).mockResolvedValue({
      storyPoints: 5,
    } as any);

    const env = {
      LINEAR_OAUTH_CLIENT_ID: "id",
      LINEAR_OAUTH_CLIENT_SECRET: "secret",
    } as unknown as RoomWorkerEnv;

    const response = (await updateLinearEstimateController(
      "LIN-1",
      makeRequest({
        estimate: 5,
        roomKey: "room-1",
        userName: "alice",
        sessionToken: "token",
        note: "Need more detail",
      }),
      env,
    )) as Response;

    expect(response.status).toBe(200);
    expect(updateLinearEstimate).not.toHaveBeenCalled();
    expect(addLinearComment).toHaveBeenCalledWith(
      expect.anything(),
      "LIN-1",
      "SprintJam decision note: Need more detail",
      expect.any(Function),
      "id",
      "secret",
    );
  });

  it("adds GitHub comment when note provided", async () => {
    const credentials = {
      accessToken: "token",
      githubLogin: "octocat",
      defaultOwner: "octo",
      defaultRepo: "repo",
    };
    vi.mocked(getRoomStub).mockReturnValue(makeRoomStub(credentials) as any);
    vi.mocked(updateGithubEstimate).mockResolvedValue({} as any);

    const env = {
      GITHUB_OAUTH_CLIENT_ID: "id",
      GITHUB_OAUTH_CLIENT_SECRET: "secret",
    } as unknown as RoomWorkerEnv;

    const response = (await updateGithubEstimateController(
      "octo/repo#12",
      makeRequest({
        estimate: 8,
        roomKey: "room-1",
        userName: "alice",
        sessionToken: "token",
        note: "Split suggested",
      }),
      env,
    )) as Response;

    expect(response.status).toBe(200);
    expect(addGithubComment).toHaveBeenCalledWith(
      expect.anything(),
      "octo/repo#12",
      "SprintJam decision note: Split suggested",
    );
  });
});
