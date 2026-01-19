import { describe, expect, it } from "vitest";
import type { Request as CfRequest } from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";

import {
  createRoomController,
  getRoomSettingsController,
  joinRoomController,
  updateRoomSettingsController,
} from "./room/rooms-controller";
import {
  getJiraTicketController,
  getJiraBoardsController,
  getJiraSprintsController,
  getJiraIssuesController,
  updateJiraStoryPointsController,
} from "./external/jira-controller";
import {
  initiateJiraOAuthController,
  handleJiraOAuthCallbackController,
  getJiraOAuthStatusController,
  getJiraFieldsController,
  updateJiraFieldsController,
  revokeJiraOAuthController,
} from "./external/jira-oauth-controller";
import {
  getLinearIssueController,
  getLinearTeamsController,
  getLinearCyclesController,
  getLinearIssuesController,
  updateLinearEstimateController,
} from "./external/linear-controller";
import {
  initiateLinearOAuthController,
  handleLinearOAuthCallbackController,
  getLinearOAuthStatusController,
  revokeLinearOAuthController,
} from "./external/linear-oauth-controller";
import {
  getGithubIssueController,
  getGithubReposController,
  getGithubMilestonesController,
  getGithubIssuesController,
  updateGithubEstimateController,
} from "./external/github-controller";
import {
  initiateGithubOAuthController,
  handleGithubOAuthCallbackController,
  getGithubOAuthStatusController,
  revokeGithubOAuthController,
} from "./external/github-oauth-controller";
import { submitFeedbackController } from "./external/feedback-controller";

const jsonRequest = (
  body: Record<string, unknown>,
  method: "POST" | "PUT" = "POST",
) =>
  new Request("https://test.sprintjam.co.uk", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as CfRequest;

const makeUrl = (path: string) =>
  new URL(`https://test.sprintjam.co.uk${path}`);
const expectJsonError = async (
  response: Response,
  message: string,
  status = 400,
) => {
  const payload = (await response.json()) as { error: string };
  expect(response.status).toBe(status);
  expect(payload.error).toBe(message);
};

const env = {
  FEEDBACK_GITHUB_TOKEN: "token",
  FEEDBACK_RATE_LIMITER: {
    limit: async () => ({ success: true }),
  },
} as unknown as RoomWorkerEnv;

describe("rooms controller validation", () => {
  it("requires a name when creating a room", async () => {
    const response = (await createRoomController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Name is required");
  });

  it("requires name and room key when joining", async () => {
    const response = (await joinRoomController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Name and room key are required");
  });

  it("requires room key when reading settings", async () => {
    const response = (await getRoomSettingsController(
      makeUrl("/api/rooms/settings"),
      env,
    )) as Response;

    await expectJsonError(response, "Room key is required");
  });

  it("requires name, room key, and settings when updating settings", async () => {
    const response = (await updateRoomSettingsController(
      jsonRequest({}, "PUT"),
      env,
    )) as Response;

    await expectJsonError(
      response,
      "Name, room key, and settings are required",
    );
  });
});

describe("jira controller validation", () => {
  it("requires a ticket id when fetching Jira tickets", async () => {
    const response = (await getJiraTicketController(
      jsonRequest({ roomKey: "123", userName: "test" }),
      env,
    )) as Response;

    await expectJsonError(response, "Ticket ID is required");
  });

  it("requires room and user when fetching Jira tickets", async () => {
    const response = (await getJiraTicketController(
      jsonRequest({ ticketId: "ABC-1" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires story points when updating Jira tickets", async () => {
    const response = (await updateJiraStoryPointsController(
      "ABC-1",
      jsonRequest({ roomKey: "room-1", userName: "alice" }, "PUT"),
      env,
    )) as Response;

    await expectJsonError(response, "Ticket ID and story points are required");
  });

  it("requires room and user when updating Jira tickets", async () => {
    const response = (await updateJiraStoryPointsController(
      "ABC-1",
      jsonRequest({ storyPoints: 5 }, "PUT"),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires room and user when fetching Jira boards", async () => {
    const response = (await getJiraBoardsController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires board id when fetching Jira sprints", async () => {
    const response = (await getJiraSprintsController(
      jsonRequest({ roomKey: "room", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Board ID is required");
  });

  it("requires room and user when fetching Jira sprints", async () => {
    const response = (await getJiraSprintsController(
      jsonRequest({ boardId: "1" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires board id when fetching Jira issues", async () => {
    const response = (await getJiraIssuesController(
      jsonRequest({ roomKey: "room", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Board ID is required");
  });

  it("requires room and user when fetching Jira issues", async () => {
    const response = (await getJiraIssuesController(
      jsonRequest({ boardId: "1" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });
});

describe("feedback controller validation", () => {
  it("requires a title", async () => {
    const response = (await submitFeedbackController(
      jsonRequest({ description: "Example feedback", labels: ["feedback"] }),
      env,
    )) as Response;

    await expectJsonError(response, "Title is required");
  });

  it("requires a description", async () => {
    const response = (await submitFeedbackController(
      jsonRequest({ title: "Short title", labels: ["feedback"] }),
      env,
    )) as Response;

    await expectJsonError(response, "Description is required");
  });

  it("requires at least one allowed label", async () => {
    const response = (await submitFeedbackController(
      jsonRequest({
        title: "Label-less feedback",
        description: "Details here",
        labels: [],
      }),
      env,
    )) as Response;

    await expectJsonError(response, "At least one valid label is required");
  });
});

describe("jira oauth validation", () => {
  it("requires room and user when initiating Jira OAuth", async () => {
    const response = (await initiateJiraOAuthController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("returns an html error when callback is missing code or state", async () => {
    const response = (await handleJiraOAuthCallbackController(
      makeUrl("/api/jira/oauth/callback"),
      env,
    )) as Response;

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Missing code or state");
  });

  it("requires room and user when reading Jira OAuth status", async () => {
    const response = (await getJiraOAuthStatusController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires room and user when fetching Jira fields", async () => {
    const response = (await getJiraFieldsController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires updates when changing Jira fields", async () => {
    const response = (await updateJiraFieldsController(
      jsonRequest({ roomKey: "room-1", userName: "alice" }, "PUT"),
      env,
    )) as Response;

    await expectJsonError(response, "No field updates provided");
  });

  it("requires room and user when revoking Jira OAuth", async () => {
    const response = (await revokeJiraOAuthController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });
});

describe("linear controller validation", () => {
  it("requires an issue id when fetching Linear issues", async () => {
    const response = (await getLinearIssueController(
      jsonRequest({ roomKey: "room-1", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Issue ID is required");
  });

  it("requires room and user when fetching Linear issues", async () => {
    const response = (await getLinearIssueController(
      jsonRequest({ issueId: "LIN-1" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires estimate when updating Linear issues", async () => {
    const response = (await updateLinearEstimateController(
      "LIN-1",
      jsonRequest({ roomKey: "room-1", userName: "alice" }, "PUT"),
      env,
    )) as Response;

    await expectJsonError(response, "Issue ID and estimate are required");
  });

  it("requires room and user when updating Linear issues", async () => {
    const response = (await updateLinearEstimateController(
      "LIN-1",
      jsonRequest({ estimate: 3 }, "PUT"),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires room and user when fetching Linear teams", async () => {
    const response = (await getLinearTeamsController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires team id when fetching Linear cycles", async () => {
    const response = (await getLinearCyclesController(
      jsonRequest({ roomKey: "room-1", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Team ID is required");
  });

  it("requires room and user when fetching Linear cycles", async () => {
    const response = (await getLinearCyclesController(
      jsonRequest({ teamId: "team-1" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires team id when fetching Linear issues list", async () => {
    const response = (await getLinearIssuesController(
      jsonRequest({ roomKey: "room-1", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Team ID is required");
  });

  it("requires room and user when fetching Linear issues list", async () => {
    const response = (await getLinearIssuesController(
      jsonRequest({ teamId: "team-1" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });
});

describe("linear oauth validation", () => {
  it("requires room and user when initiating Linear OAuth", async () => {
    const response = (await initiateLinearOAuthController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("returns an html error when linear callback is missing code or state", async () => {
    const response = (await handleLinearOAuthCallbackController(
      makeUrl("/api/linear/oauth/callback"),
      env,
    )) as Response;

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Missing code or state");
  });

  it("requires room and user when reading Linear OAuth status", async () => {
    const response = (await getLinearOAuthStatusController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires room and user when revoking Linear OAuth", async () => {
    const response = (await revokeLinearOAuthController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });
});

describe("github controller validation", () => {
  it("requires an issue id when fetching GitHub issues", async () => {
    const response = (await getGithubIssueController(
      jsonRequest({ roomKey: "room-1", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Issue identifier is required");
  });

  it("requires room and user when fetching GitHub issues", async () => {
    const response = (await getGithubIssueController(
      jsonRequest({ issueId: "owner/repo#1" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires estimate when updating GitHub issues", async () => {
    const response = (await updateGithubEstimateController(
      "owner/repo#1",
      jsonRequest({ roomKey: "room-1", userName: "alice" }, "PUT"),
      env,
    )) as Response;

    await expectJsonError(
      response,
      "Issue identifier and estimate are required",
    );
  });

  it("requires room and user when updating GitHub issues", async () => {
    const response = (await updateGithubEstimateController(
      "owner/repo#1",
      jsonRequest({ estimate: 5 }, "PUT"),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires room and user when fetching GitHub repos", async () => {
    const response = (await getGithubReposController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires repository when fetching GitHub milestones", async () => {
    const response = (await getGithubMilestonesController(
      jsonRequest({ roomKey: "room-1", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Repository is required");
  });

  it("requires room and user when fetching GitHub milestones", async () => {
    const response = (await getGithubMilestonesController(
      jsonRequest({ repo: "owner/repo" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires repository when fetching GitHub issues list", async () => {
    const response = (await getGithubIssuesController(
      jsonRequest({ roomKey: "room-1", userName: "alice" }),
      env,
    )) as Response;

    await expectJsonError(response, "Repository is required");
  });

  it("requires room and user when fetching GitHub issues list", async () => {
    const response = (await getGithubIssuesController(
      jsonRequest({ repo: "owner/repo" }),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });
});

describe("github oauth validation", () => {
  it("requires room and user when initiating GitHub OAuth", async () => {
    const response = (await initiateGithubOAuthController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("returns an html error when GitHub callback is missing code or state", async () => {
    const response = (await handleGithubOAuthCallbackController(
      makeUrl("/api/github/oauth/callback"),
      env,
    )) as Response;

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Missing code or state");
  });

  it("requires room and user when reading GitHub OAuth status", async () => {
    const response = (await getGithubOAuthStatusController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });

  it("requires room and user when revoking GitHub OAuth", async () => {
    const response = (await revokeGithubOAuthController(
      jsonRequest({}),
      env,
    )) as Response;

    await expectJsonError(response, "Room key and user name are required");
  });
});
