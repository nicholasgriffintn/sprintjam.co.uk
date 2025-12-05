import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { WelcomePage } from "./pageObjects/welcome-page";
import { CreateRoomPage } from "./pageObjects/create-room-page";
import { RoomPage } from "./pageObjects/room-page";
import { createRoomWithParticipant } from './helpers/room-journeys';

async function createRoomWithProvider(
  browser: Browser,
  provider: 'jira' | 'linear',
  setupRoutes?: (context: BrowserContext) => Promise<void> | void
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  if (setupRoutes) {
    await setupRoutes(context);
  }

  const welcome = new WelcomePage(page);
  await welcome.gotoHome();
  await welcome.startCreateRoom();

  const createRoom = new CreateRoomPage(page);
  await createRoom.completeNameStep('Queue Creator');
  await createRoom.selectAvatar('avatar-option-robot');
  await createRoom.configureRoomDetails({
    enableTicketQueue: true,
    externalService: provider,
  });
  await createRoom.finishCreation();

  const room = new RoomPage(page);
  await room.waitForLoaded();

  return { context, page };
}

test.describe('Modal interactions', () => {
  test('ticket queue modal is read-only for participants', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, participantRoom, cleanup } = setup;

    try {
      const moderatorPage = moderatorRoom.getPage();
      await moderatorPage.getByTestId('next-ticket-button').click();
      await moderatorPage
        .getByRole('dialog', { name: 'Review before moving on' })
        .getByTestId('pre-pointing-confirm')
        .click();

      await moderatorRoom.openQueueModal();
      await moderatorRoom.expectQueueManageControlsVisible(true);
      await moderatorRoom.expectQueueCurrentTicketContains('SPRINTJAM');
      await moderatorRoom
        .getPage()
        .getByRole('button', { name: 'Close modal' })
        .click();

      await participantRoom.openQueueModal();
      await participantRoom.expectQueueManageControlsVisible(false);
      await participantRoom.expectQueueCurrentTicketContains('SPRINTJAM');
      await participantRoom
        .getPage()
        .getByRole('button', { name: 'Close modal' })
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
      summary: 'Backlog item',
      description: 'Jira ticket pulled via setup modal',
      status: 'To Do',
      assignee: 'QA Bot',
      storyPoints: null,
    };

    const { context, page } = await createRoomWithProvider(
      browser,
      "jira",
      async (ctx) => {
        await ctx.route("**/api/jira/oauth/status?**", (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              connected: true,
              jiraDomain: 'jira.test.sprintjam.co.uk',
              jiraUserEmail: 'qa@test.sprintjam.co.uk',
            }),
          });
        });

        await ctx.route("**/api/jira/oauth/fields?**", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              fields: [
                { id: "customfield_10016", name: "Story Points", type: "number" },
              ],
              storyPointsField: "customfield_10016",
            }),
          });
        });

        await ctx.route("**/api/jira/ticket?**", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ticket: jiraTicket }),
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

      const openQueueButton = providerModal.getByRole("button", {
        name: "Open queue setup",
      });
      await expect(openQueueButton).toBeEnabled();
      await openQueueButton.click();

      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-jira-button").click();
      await queueDialog.getByTestId("queue-jira-input").fill(jiraTicketKey);
      await queueDialog.getByTestId("queue-jira-fetch").click();
      await expect(queueDialog).toContainText(jiraTicket.summary);
      await queueDialog.getByTestId("queue-jira-add").click();
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
      summary: 'Linear issue to sync',
      description: 'Verify provider setup modal opens and queues issues',
      status: 'Todo',
      assignee: 'QA Bot',
      estimate: null,
    };

    const { context, page } = await createRoomWithProvider(
      browser,
      "linear",
      async (ctx) => {
        await ctx.route("**/api/linear/oauth/status?**", (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              connected: true,
              linearOrganizationId: 'eng',
              linearUserEmail: 'qa@test.sprintjam.co.uk',
              estimateField: 'storyPoints',
            }),
          });
        });

        await ctx.route("**/api/linear/issue?**", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ticket: linearIssue }),
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

      const openQueueButton = providerModal.getByRole("button", {
        name: "Open queue setup",
      });
      await expect(openQueueButton).toBeEnabled();
      await openQueueButton.click();

      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-linear-button").click();
      await queueDialog.getByTestId("queue-linear-input").fill(linearIssueKey);
      await queueDialog.getByTestId("queue-linear-fetch").click();
      await expect(queueDialog).toContainText(linearIssue.summary);
      await queueDialog.getByTestId("queue-linear-add").click();
      await expect(queueDialog).toContainText(linearIssueKey);
      await expect(queueDialog).toContainText(linearIssue.summary);

      await queueDialog.getByRole("button", { name: "Close modal" }).click();
    } finally {
      await context.close();
    }
  });
});
