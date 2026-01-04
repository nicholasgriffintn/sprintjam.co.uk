import { expect, test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe("Linear integration", () => {
  test("moderator can add and link Linear issues through the queue", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup, moderatorContext } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    const issueKey = "LIN-123";
    const secondaryIssueKey = "LIN-456";
    const linearOAuthStatus = {
      connected: true,
      linearOrganizationId: "eng",
      linearUserEmail: "qa@test.sprintjam.co.uk",
      estimateField: "storyPoints",
    };
    const initialIssue = {
      key: issueKey,
      identifier: issueKey,
      url: `https://linear.test.sprintjam.co.uk/issue/${issueKey}`,
      summary: "Demo Linear issue",
      description: "Ensure planning poker syncs with Linear",
      status: "In Progress",
      assignee: "QA Bot",
      estimate: null,
    };
    const secondaryIssue = {
      ...initialIssue,
      key: secondaryIssueKey,
      identifier: secondaryIssueKey,
      summary: "Linked Linear issue",
    };

    await moderatorContext.route("**/api/linear/issue?**", (route) => {
      const url = new URL(route.request().url());
      const key = url.searchParams.get("issueId");
      const ticket =
        key && key.toUpperCase() === secondaryIssueKey
          ? secondaryIssue
          : initialIssue;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ticket }),
      });
    });

    await moderatorContext.route("**/api/linear/oauth/status?**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(linearOAuthStatus),
      });
    });

    await moderatorContext.route("**/api/linear/teams?**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          teams: [{ id: "team-1", name: "QA Team", key: "QA" }],
        }),
      });
    });

    await moderatorContext.route("**/api/linear/cycles?**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ cycles: [] }),
      });
    });

    await moderatorContext.route("**/api/linear/issues?**", (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get("query");
      const matches = query && query.includes(issueKey);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tickets: matches ? [initialIssue] : [] }),
      });
    });

    try {
      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-enable-queue", true);
      await settingsModal.selectExternalService("linear");
      await settingsModal.waitForLinearConnection();
      await settingsModal.save();

      const page = moderatorRoom.getPage();
      // The queue setup modal appears automatically when a provider is selected and queue is empty
      const setupModal = page.getByRole("dialog", {
        name: "Connect your queue",
      });
      await expect(setupModal).toBeVisible();
      await setupModal
        .getByRole("button", { name: "Open queue setup" })
        .click();

      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId("queue-add-linear-button").click();
      await queueDialog
        .getByTestId("queue-import-board")
        .selectOption("team-1");
      await queueDialog.getByTestId("queue-import-search").fill(issueKey);
      await expect(queueDialog).toContainText(initialIssue.summary);
      await queueDialog.getByText(issueKey).click();
      await queueDialog.getByTestId("queue-import-confirm").click();

      await queueDialog.getByTestId("queue-toggle-add").click();
      await queueDialog.getByPlaceholder("Ticket title").fill("Local task");
      await queueDialog.getByTestId("queue-add-confirm").click();

      const linkButtons = queueDialog.getByRole("button", {
        name: "Link Linear",
      });
      await expect(linkButtons).toHaveCount(1);
      await linkButtons.first().click();
      await queueDialog.getByPlaceholder("TEAM-123").fill(secondaryIssueKey);
      await queueDialog.getByRole("button", { name: /^Fetch$/ }).click();
      await expect(queueDialog).toContainText(secondaryIssue.summary);
      await queueDialog.getByRole("button", { name: "Save Link" }).click();
      await expect(queueDialog).toContainText(secondaryIssueKey);

      await queueDialog.getByRole("button", { name: "Start Voting" }).first().click();
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
