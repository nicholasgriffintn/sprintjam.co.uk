import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("Results", () => {
  test("complete session opens a read-only summary with history active", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      await page.getByTestId("complete-session-button").click();
      const dialog = page.getByRole("dialog", { name: "Complete session" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId("queue-history-tab-panel")).toBeVisible();

      await dialog.getByTestId("queue-tab-queue").click();
      await expect(dialog.getByTestId("queue-toggle-add")).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });
});
