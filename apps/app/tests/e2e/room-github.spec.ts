import { expect, test, type BrowserContext } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

const WORKSPACE_TEAM_ID = 88;

async function setupWorkspaceRoutes(context: BrowserContext) {
  await context.route("**/api/auth/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: 42,
          email: "qa@sprintjam.co.uk",
          name: "Workspace QA",
          organisationId: 7,
        },
        teams: [
          {
            id: WORKSPACE_TEAM_ID,
            name: "QA Team",
            organisationId: 7,
            ownerId: 42,
            createdAt: Date.now(),
          },
        ],
      }),
    });
  });

  await context.route("**/api/teams/88/settings", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ settings: null }),
    });
  });

  await context.route("**/api/teams/88/sessions", async (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [] }),
      });
      return;
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: 1,
          teamId: WORKSPACE_TEAM_ID,
          roomKey: "test-room",
          name: "Test session",
          createdById: 42,
          createdAt: Date.now(),
          updatedAt: null,
          completedAt: null,
          metadata: null,
        },
      }),
    });
  });

  await context.route("**/api/teams/88/integrations/*/status", (route) => {
    const provider = route.request().url().split("/").at(-2) ?? "github";
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: {
          provider,
          connected: true,
        },
      }),
    });
  });
}

test.describe("GitHub integration", () => {
  test("moderator can add and link GitHub issues through the queue", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      setupModeratorRoutes: setupWorkspaceRoutes,
    });
    const { moderatorRoom, participantRoom, cleanup, moderatorContext } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    const issueKey = "octocat/hello-world#42";
    const secondaryIssueKey = "octocat/design-system#77";
    const initialIssue = {
      key: issueKey,
      url: `https://github.com/${issueKey.replace("#", "/issues/")}`,
      summary: "Demo GitHub issue",
      description: "Ensure planning poker syncs with GitHub",
      status: "open",
      assignee: "QA Bot",
    };
    const secondaryIssue = {
      ...initialIssue,
      key: secondaryIssueKey,
      url: `https://github.com/${secondaryIssueKey.replace("#", "/issues/")}`,
      summary: "Linked GitHub issue",
    };

    await moderatorContext.route("**/api/github/repos", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          repos: [
            {
              id: "1",
              name: "hello-world",
              fullName: "octocat/hello-world",
              owner: "octocat",
            },
          ],
        }),
      });
    });

    await moderatorContext.route("**/api/github/milestones", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ milestones: [] }),
      });
    });

    await moderatorContext.route("**/api/github/issues", async (route) => {
      const payload = (await route.request().postDataJSON()) as {
        query?: string | null;
      };
      const query = payload.query;
      const matches = query && query.includes("42");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tickets: matches ? [initialIssue] : [] }),
      });
    });

    await moderatorContext.route("**/api/github/issue", async (route) => {
      const payload = (await route.request().postDataJSON()) as {
        issueId?: string | null;
      };
      const identifier = payload.issueId ?? "";
      const normalized = identifier.toLowerCase();
      const ticket =
        normalized === secondaryIssueKey.toLowerCase()
          ? secondaryIssue
          : initialIssue;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ticket }),
      });
    });

    try {
      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-enable-queue", true);
      await settingsModal.selectExternalService("github");
      await settingsModal.save();

      const page = moderatorRoom.getPage();
      await page.getByTestId("queue-expand").click();

      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-github-button").click();
      await queueDialog
        .getByTestId("queue-import-board")
        .selectOption("octocat/hello-world");
      await queueDialog.getByTestId("queue-import-search").fill("42");
      await expect(queueDialog).toContainText(initialIssue.summary);
      await queueDialog.getByText(issueKey).click();
      await queueDialog.getByTestId("queue-import-confirm").click();

      await queueDialog.getByTestId("queue-toggle-add").click();
      await queueDialog.getByPlaceholder("Ticket title").fill("Local task");
      await queueDialog.getByTestId("queue-add-confirm").click();

      const linkButtons = queueDialog.getByRole("button", {
        name: "Link GitHub",
      });
      await expect(linkButtons).toHaveCount(1);
      await linkButtons.first().click();
      await queueDialog
        .getByPlaceholder("owner/repo#123")
        .fill(secondaryIssueKey);
      await queueDialog.getByRole("button", { name: /^Fetch$/ }).click();
      await expect(queueDialog).toContainText(secondaryIssue.summary);
      await queueDialog.getByRole("button", { name: "Save Link" }).click();
      await expect(queueDialog).toContainText(secondaryIssueKey);

      await queueDialog
        .getByRole("button", { name: "Start Voting" })
        .first()
        .click();
      await queueDialog.getByLabel("Close modal").click();

      await page.getByTestId("next-ticket-button").click();
      await page
        .getByRole("dialog", { name: "Review before moving on" })
        .getByTestId("pre-pointing-confirm")
        .click();

      await moderatorRoom.castVote("5");
      await participantRoom.castVote("5");
      await moderatorRoom.revealVotes();

      await page.getByTestId("queue-expand").click();
      const reopenedDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(reopenedDialog).toBeVisible();
      await expect(reopenedDialog).toContainText(secondaryIssueKey);
      await reopenedDialog.getByTestId("queue-tab-history").click();
      await expect(
        reopenedDialog.getByTestId("queue-history-tab-panel"),
      ).toBeVisible();
      await reopenedDialog.getByRole("button", { name: "Close modal" }).click();
    } finally {
      await cleanup();
    }
  });
});
