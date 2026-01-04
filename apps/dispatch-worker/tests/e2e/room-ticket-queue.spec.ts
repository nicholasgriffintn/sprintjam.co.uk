import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("Ticket Queue", () => {
  test('should show no tickets message in sidebar when queue is empty', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      // Should show "No tickets in queue" in sidebar
      await expect(page.getByTestId('queue-no-current')).toBeVisible();
      await expect(page.getByTestId('queue-no-current')).toContainText(
        'No tickets in queue'
      );
    } finally {
      await cleanup();
    }
  });

  test('should allow selecting a ticket from sidebar', async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      // Add a ticket via queue modal
      await page.getByTestId('queue-expand').click();
      await page.getByTestId('queue-toggle-add').click();
      await page.getByPlaceholder('Ticket title').fill('Test Ticket 1');
      await page.getByTestId('queue-add-confirm').click();
      await page.waitForTimeout(250);

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);

      // Should see "Select a ticket to start" in sidebar
      await expect(page.getByText('Select a ticket to start')).toBeVisible();

      // Click on the ticket in sidebar to select it
      await page.getByTestId('queue-select-ticket-1').click();
      await page.waitForTimeout(250);

      // Should now show as current ticket
      await expect(page.getByTestId('queue-ticket-id-current')).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("should reset votes when clicking Next Ticket", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      // Add two tickets
      await page.getByTestId('queue-expand').click();
      await page.getByTestId('queue-toggle-add').click();
      await page.getByPlaceholder('Ticket title').fill('Ticket 1');
      await page.getByTestId('queue-add-confirm').click();
      await page.waitForTimeout(150);

      await page.getByTestId('queue-toggle-add').click();
      await page.getByPlaceholder('Ticket title').fill('Ticket 2');
      await page.getByTestId('queue-add-confirm').click();
      await page.waitForTimeout(150);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);

      // Select first ticket from sidebar
      await page.getByTestId('queue-select-ticket-1').click();
      await page.waitForTimeout(250);

      // Cast a vote
      await moderatorRoom.castVote('5');

      // Verify vote is shown
      await moderatorRoom.expectVotePendingState();

      // Click Next Ticket
      await page.getByTestId('next-ticket-button').click();
      await page
        .getByRole('dialog', { name: 'Review before moving on' })
        .getByTestId('pre-pointing-confirm')
        .click();

      // Wait for reset
      await page.waitForTimeout(250);

      // Votes should be cleared
      await moderatorRoom.expectVotesHiddenMessage("You haven't voted yet");
    } finally {
      await cleanup();
    }
  });

  test('should allow using Start Voting button from queue modal', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      // Add a ticket via modal
      await page.getByTestId('queue-expand').click();
      await page.getByTestId('queue-toggle-add').click();
      await page.getByPlaceholder('Ticket title').fill('Test Ticket');
      await page.getByTestId('queue-add-confirm').click();
      await page.waitForTimeout(250);

      // Click Start Voting button in modal
      await page.getByTestId('queue-start-voting-1').click();
      await page.waitForTimeout(250);

      // Should now be voting on the ticket
      await expect(page.getByTestId('queue-ticket-id-current')).toBeVisible();

      // Modal should still be open, close it
      await page.keyboard.press('Escape');

      // Voting UI should be visible
      await expect(page.getByText(/your estimate/i)).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("shows summary modal with historical votes before moving to next ticket", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    } = setup;

    try {
      const page = moderatorRoom.getPage();

      await page.getByTestId("queue-expand").click();
      await page.getByTestId("queue-toggle-add").click();
      await page.getByPlaceholder("Ticket title").fill("Ticket A");
      await page.getByTestId("queue-add-confirm").click();
      await page.waitForTimeout(100);

      await page.getByTestId("queue-toggle-add").click();
      await page.getByPlaceholder("Ticket title").fill("Ticket B");
      await page.getByTestId("queue-add-confirm").click();
      await page.waitForTimeout(100);
      await page.getByTestId("queue-start-voting-1").click();
      const currentTicketId = await page
        .getByTestId("queue-ticket-id-current")
        .textContent();
      await page.keyboard.press("Escape");

      await moderatorRoom.castVote("5");
      await participantRoom.castVote("3");
      await moderatorRoom.revealVotes();

      await page.getByTestId("next-ticket-button").click();
      const summary = page.getByRole("dialog", {
        name: "Review before moving on",
      });
      await expect(summary).toBeVisible();
      await expect(summary).toContainText(currentTicketId?.trim() ?? "");
      await expect(summary).toContainText("Responded 2/2");
      await expect(summary).toContainText("Anonymous");
      await expect(summary).toContainText("5");
      await expect(summary).toContainText("3");

      await summary.getByTestId("pre-pointing-confirm").click();
      await page.waitForTimeout(250);

      await moderatorRoom.expectQueueCurrentTicketContains("Ticket B");
      await moderatorRoom.expectVotesHiddenMessage("You haven't voted yet");
    } finally {
      await cleanup();
    }
  });

  test("should not show Next Ticket button to non-moderator", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { participantRoom, cleanup } = setup;

    try {
      const page = participantRoom.getPage();

      await expect(page.getByTestId("next-ticket-button")).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });
});
