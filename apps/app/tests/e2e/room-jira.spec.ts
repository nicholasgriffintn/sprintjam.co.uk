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
    const provider = route.request().url().split("/").at(-2) ?? "jira";
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

test.describe("Jira integration", () => {
  test("moderator can add and link Jira tickets through the queue", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      setupModeratorRoutes: setupWorkspaceRoutes,
    });
    const { moderatorRoom, participantRoom, cleanup, moderatorContext } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    const ticketKey = "TEST-123";
    const secondaryTicketKey = "TEST-456";
    const jiraFields = [
      { id: "customfield_10016", name: "Story Points", type: "number" },
      { id: "customfield_10017", name: "Sprint", type: "string" },
    ];
    const initialTicket = {
      key: ticketKey,
      url: `https://jira.test.sprintjam.co.uk/browse/${ticketKey}`,
      summary: "Demo integration ticket",
      description: "Ensure planning poker syncs with Jira",
      status: "In Progress",
      assignee: "QA Bot",
      storyPoints: null,
    };
    const secondaryTicket = {
      ...initialTicket,
      key: secondaryTicketKey,
      url: `https://jira.test.sprintjam.co.uk/browse/${secondaryTicketKey}`,
      summary: "Linked ticket",
    };
    let storyPointsUpdated = false;

    await moderatorContext.route("**/api/jira/ticket", async (route) => {
      const payload = (await route.request().postDataJSON()) as {
        ticketId?: string | null;
      };
      const key = payload.ticketId;
      const ticket =
        key && key.toUpperCase() === secondaryTicketKey
          ? secondaryTicket
          : initialTicket;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ticket }),
      });
    });

    await moderatorContext.route("**/api/jira/boards", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          boards: [{ id: "board-1", name: "QA Board" }],
        }),
      });
    });

    await moderatorContext.route("**/api/jira/sprints", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sprints: [] }),
      });
    });

    await moderatorContext.route("**/api/jira/issues", async (route) => {
      const payload = (await route.request().postDataJSON()) as {
        query?: string | null;
      };
      const query = payload.query;
      const matches = query && query.includes(ticketKey);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tickets: matches ? [initialTicket] : [] }),
      });
    });

    await moderatorContext.route("**/api/jira/oauth/fields", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fields: jiraFields,
          storyPointsField: jiraFields[0]?.id,
          sprintField: jiraFields[1]?.id,
        }),
      });
    });

    await moderatorContext.route(
      "**/api/jira/ticket/**/storyPoints",
      (route) => {
        storyPointsUpdated = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ticket: { ...initialTicket, storyPoints: 5 },
          }),
        });
      },
    );

    try {
      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-enable-queue", true);
      await settingsModal.selectExternalService("jira");
      await settingsModal.save();

      const page = moderatorRoom.getPage();
      await page.getByTestId("queue-expand").click();

      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-jira-button").click();
      await queueDialog
        .getByTestId("queue-import-board")
        .selectOption("board-1");
      await queueDialog.getByTestId("queue-import-search").fill(ticketKey);
      await expect(queueDialog).toContainText(initialTicket.summary);
      await queueDialog.getByText(ticketKey).click();
      await queueDialog.getByTestId("queue-import-confirm").click();

      await queueDialog.getByTestId("queue-toggle-add").click();
      await queueDialog.getByPlaceholder("Ticket title").fill("Local task");
      await queueDialog.getByTestId("queue-add-confirm").click();

      const linkButtons = queueDialog.getByRole("button", {
        name: "Link Jira",
      });
      await expect(linkButtons).toHaveCount(1);
      await linkButtons.first().click();
      await queueDialog
        .getByPlaceholder("PROJECT-123")
        .fill(secondaryTicketKey);
      await queueDialog.getByRole("button", { name: /^Fetch$/ }).click();
      await expect(queueDialog).toContainText(secondaryTicket.summary);
      await queueDialog.getByRole("button", { name: "Save Link" }).click();
      await expect(queueDialog).toContainText(secondaryTicketKey);

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

      await expect
        .poll(() => storyPointsUpdated, { timeout: 5000 })
        .toBeTruthy();

      await page.getByTestId("queue-expand").click();
      const reopenedDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(reopenedDialog).toBeVisible();
      await expect(reopenedDialog).toContainText(secondaryTicketKey);
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
