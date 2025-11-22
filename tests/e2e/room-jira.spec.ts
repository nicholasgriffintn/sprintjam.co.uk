import { expect, test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe("SprintJam Jira integration journeys", () => {
  test("moderator can add and link Jira tickets through the queue", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup, moderatorContext } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    const ticketKey = "TEST-123";
    const secondaryTicketKey = "TEST-456";
    const jiraOAuthStatus = {
      connected: true,
      jiraDomain: "jira.example.com",
      jiraUserEmail: "qa@example.com",
      storyPointsField: "customfield_10016",
      sprintField: "customfield_10017",
    };
    const jiraFields = [
      { id: "customfield_10016", name: "Story Points", type: "number" },
      { id: "customfield_10017", name: "Sprint", type: "string" },
    ];
    const initialTicket = {
      key: ticketKey,
      url: `https://jira.example.com/browse/${ticketKey}`,
      summary: "Demo integration ticket",
      description: "Ensure planning poker syncs with Jira",
      status: "In Progress",
      assignee: "QA Bot",
      storyPoints: null,
    };
    const secondaryTicket = {
      ...initialTicket,
      key: secondaryTicketKey,
      url: `https://jira.example.com/browse/${secondaryTicketKey}`,
      summary: "Linked ticket",
    };
    let storyPointsUpdated = false;

    await moderatorContext.route("**/api/jira/ticket?**", (route) => {
      const url = new URL(route.request().url());
      const key = url.searchParams.get("ticketId");
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

    await moderatorContext.route("**/api/jira/oauth/status?**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(jiraOAuthStatus),
      });
    });

    await moderatorContext.route("**/api/jira/oauth/fields?**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fields: jiraFields,
          storyPointsField: jiraOAuthStatus.storyPointsField,
          sprintField: jiraOAuthStatus.sprintField,
        }),
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

      route.fallback();
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
      await settingsModal.waitForJiraConnection();
      await settingsModal.toggle("settings-toggle-jira-auto", true);
      await settingsModal.save();

      const page = moderatorRoom.getPage();
      await page.getByTestId("queue-expand").click();
      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-jira-button").click();
      await queueDialog.getByTestId("queue-jira-input").fill(ticketKey);
      await queueDialog.getByTestId("queue-jira-fetch").click();
      await expect(queueDialog).toContainText(initialTicket.summary);
      await queueDialog.getByTestId("queue-jira-add").click();

      await queueDialog.getByTestId("queue-toggle-add").click();
      await queueDialog.getByPlaceholder("Ticket title").fill("Local task");
      await queueDialog.getByTestId("queue-add-confirm").click();

      const linkButtons = queueDialog.getByRole("button", {
        name: "Link Jira",
      });
      await expect(linkButtons).toHaveCount(2);
      await linkButtons.nth(1).click();
      await queueDialog
        .getByPlaceholder("PROJECT-123")
        .fill(secondaryTicketKey);
      await queueDialog.getByRole("button", { name: /^Fetch$/ }).click();
      await expect(queueDialog).toContainText(secondaryTicket.summary);
      await queueDialog.getByRole("button", { name: "Save Link" }).click();
      await expect(queueDialog).toContainText(secondaryTicketKey);

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
      await expect(reopenedDialog).toContainText(ticketKey);
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
