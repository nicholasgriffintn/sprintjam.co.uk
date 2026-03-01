import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import { WelcomePage } from "./pageObjects/welcome-page";
import { CreateRoomPage } from "./pageObjects/create-room-page";
import { JoinRoomPage } from "./pageObjects/join-room-page";
import { RoomPage } from "./pageObjects/room-page";
import { SettingsModal } from "./pageObjects/settings-modal";
import { createRoomWithParticipant } from "./helpers/room-journeys";

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

async function createRoomWithProvider(
  browser: Browser,
  provider: "jira" | "linear" | "github",
  setupRoutes?: (context: BrowserContext) => Promise<void> | void,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await setupWorkspaceRoutes(context);
  if (setupRoutes) await setupRoutes(context);

  const welcome = new WelcomePage(page);
  await welcome.gotoHome();
  await welcome.startCreateRoom();

  const createRoom = new CreateRoomPage(page);
  await createRoom.fillBasics("Queue Creator");
  await createRoom.selectWorkspaceTeam(WORKSPACE_TEAM_ID);
  await createRoom.startInstantRoom();

  const joinRoom = new JoinRoomPage(page);
  await joinRoom.selectAvatarOnlyAndJoin("avatar-option-robot");

  const room = new RoomPage(page);
  await room.waitForLoaded();

  const settingsModal = new SettingsModal(page);
  await settingsModal.open();
  await settingsModal.toggle("settings-toggle-enable-queue", true);
  await settingsModal.selectExternalService(provider);
  await settingsModal.save();

  return { context, page };
}

test.describe("Modal interactions", () => {
  test("ticket queue modal is read-only for participants", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, participantRoom, cleanup } = setup;

    try {
      const moderatorPage = moderatorRoom.getPage();
      await moderatorRoom.openQueueModal();
      await moderatorPage.getByTestId("queue-toggle-add").click();
      await moderatorPage.getByPlaceholder("Ticket title").fill("Queue Ticket");
      await moderatorPage.getByTestId("queue-add-confirm").click();
      await moderatorPage
        .getByRole("button", { name: "Start Voting" })
        .first()
        .click();
      await moderatorPage.getByRole("button", { name: "Close modal" }).click();

      await moderatorRoom.openQueueModal();
      await moderatorRoom.expectQueueManageControlsVisible(true);
      await moderatorRoom.expectQueueCurrentTicketContains("SPRINTJAM");
      await moderatorRoom
        .getPage()
        .getByRole("button", { name: "Close modal" })
        .click();

      await participantRoom.openQueueModal();
      await participantRoom.expectQueueManageControlsVisible(false);
      await participantRoom.expectQueueCurrentTicketContains("SPRINTJAM");
      await participantRoom
        .getPage()
        .getByRole("button", { name: "Close modal" })
        .click();
    } finally {
      await cleanup();
    }
  });
});

test.describe("Ticket queue provider setup on room creation", () => {
  test("Jira provider prompts setup modal and allows queueing", async ({
    browser,
  }) => {
    const jiraTicketKey = "JIRA-101";
    const jiraTicket = {
      key: jiraTicketKey,
      url: `https://jira.test.sprintjam.co.uk/browse/${jiraTicketKey}`,
      summary: "Backlog item",
      description: "Jira ticket pulled via setup modal",
      status: "To Do",
      assignee: "QA Bot",
      storyPoints: null,
    };

    const { context, page } = await createRoomWithProvider(
      browser,
      "jira",
      async (ctx) => {
        await ctx.route("**/api/jira/boards", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              boards: [{ id: "1", name: "QA Board" }],
            }),
          });
        });

        await ctx.route("**/api/jira/sprints", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ sprints: [] }),
          });
        });

        await ctx.route("**/api/jira/issues", async (route) => {
          const payload = (await route.request().postDataJSON()) as {
            query?: string | null;
          };
          const query = payload.query;
          const matches = query && query.includes(jiraTicketKey);
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ tickets: matches ? [jiraTicket] : [] }),
          });
        });
      },
    );

    try {
      const providerModal = page.getByRole("dialog", {
        name: "Connect your queue",
      });
      await expect(providerModal).toBeVisible();
      await expect(providerModal).toContainText("Configure Jira");
      await expect(providerModal).toContainText("Jira is connected");

      const openQueueButton = providerModal.getByRole("button", {
        name: "Open queue setup",
      });
      await expect(openQueueButton).toBeEnabled();
      await openQueueButton.click();

      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-jira-button").click();
      await queueDialog.getByTestId("queue-import-board").selectOption("1");
      await queueDialog.getByTestId("queue-import-search").fill(jiraTicketKey);
      await expect(queueDialog).toContainText(jiraTicket.summary);
      await queueDialog.getByText(jiraTicketKey).click();
      await queueDialog.getByTestId("queue-import-confirm").click();
      await expect(queueDialog).toContainText(jiraTicketKey);
      await expect(queueDialog).toContainText(jiraTicket.summary);

      await queueDialog.getByRole("button", { name: "Close modal" }).click();
    } finally {
      await context.close();
    }
  });

  test("Linear provider prompts setup modal and allows queueing", async ({
    browser,
  }) => {
    const linearIssueKey = "LIN-202";
    const linearIssue = {
      key: linearIssueKey,
      identifier: linearIssueKey,
      url: `https://linear.test.sprintjam.co.uk/issue/${linearIssueKey}`,
      summary: "Linear issue to sync",
      description: "Verify provider setup modal opens and queues issues",
      status: "Todo",
      assignee: "QA Bot",
      estimate: null,
    };

    const { context, page } = await createRoomWithProvider(
      browser,
      "linear",
      async (ctx) => {
        await ctx.route("**/api/linear/teams", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              teams: [{ id: "team-1", name: "QA Team", key: "QA" }],
            }),
          });
        });

        await ctx.route("**/api/linear/cycles", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ cycles: [] }),
          });
        });

        await ctx.route("**/api/linear/issues", async (route) => {
          const payload = (await route.request().postDataJSON()) as {
            query?: string | null;
          };
          const query = payload.query;
          const matches = query && query.includes(linearIssueKey);
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ tickets: matches ? [linearIssue] : [] }),
          });
        });
      },
    );

    try {
      const providerModal = page.getByRole("dialog", {
        name: "Connect your queue",
      });
      await expect(providerModal).toBeVisible();
      await expect(providerModal).toContainText("Configure Linear");
      await expect(providerModal).toContainText("Linear is connected");

      const openQueueButton = providerModal.getByRole("button", {
        name: "Open queue setup",
      });
      await expect(openQueueButton).toBeEnabled();
      await openQueueButton.click();

      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-linear-button").click();
      await queueDialog
        .getByTestId("queue-import-board")
        .selectOption("team-1");
      await queueDialog.getByTestId("queue-import-search").fill(linearIssueKey);
      await expect(queueDialog).toContainText(linearIssue.summary);
      await queueDialog.getByText(linearIssueKey).click();
      await queueDialog.getByTestId("queue-import-confirm").click();
      await expect(queueDialog).toContainText(linearIssueKey);
      await expect(queueDialog).toContainText(linearIssue.summary);

      await queueDialog.getByRole("button", { name: "Close modal" }).click();
    } finally {
      await context.close();
    }
  });
});
