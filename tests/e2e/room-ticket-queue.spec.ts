import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("Ticket Queue E2E", () => {
  test("should create auto-increment ticket on first Next Ticket click", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      // Click Next Ticket
      await page.getByTestId("next-ticket-button").click();
      const summary = page.getByRole("dialog", {
        name: "Review before moving on",
      });
      await summary.getByTestId("pre-pointing-confirm").click();

      // Wait for WebSocket update
      await page.waitForTimeout(500);

      // We start with auto-created SPRINTJAM-001 in progress; after Next Ticket we expect SPRINTJAM-002
      await expect(page.getByTestId("queue-ticket-id-current")).toContainText(
        "SPRINTJAM-002",
      );
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
      // Cast a vote
      await moderatorRoom.castVote("5");

      // Verify vote is shown
      await moderatorRoom.expectVotePendingState();

      // Click Next Ticket
      const page = moderatorRoom.getPage();
      await page.getByTestId("next-ticket-button").click();
      await page
        .getByRole("dialog", { name: "Review before moving on" })
        .getByTestId("pre-pointing-confirm")
        .click();

      // Wait for reset
      await page.waitForTimeout(500);

      // Votes should be cleared
      await moderatorRoom.expectVotesHiddenMessage("No votes yet");
    } finally {
      await cleanup();
    }
  });

  test("should increment ticket IDs sequentially", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      // Create first ticket
      await page.getByTestId("next-ticket-button").click();
      await page
        .getByRole("dialog", { name: "Review before moving on" })
        .getByTestId("pre-pointing-confirm")
        .click();
      await page.waitForTimeout(300);

      // Create second ticket
      await page.getByTestId("next-ticket-button").click();
      await page
        .getByRole("dialog", { name: "Review before moving on" })
        .getByTestId("pre-pointing-confirm")
        .click();
      await page.waitForTimeout(300);

      await expect(page.getByTestId("queue-ticket-id-current")).toContainText(
        "SPRINTJAM-003",
      );
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
