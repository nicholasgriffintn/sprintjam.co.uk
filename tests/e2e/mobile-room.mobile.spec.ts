import { test, expect } from "@playwright/test";

import { SettingsModal } from "./pageObjects/settings-modal";
import { RoomPage } from "./pageObjects/room-page";

test.describe("Mobile experience", () => {
  test.skip(true, 'Skipping as flaky on CI');

  test("supports touch interactions for queue and participant panels", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-room-button").tap();
    await page.locator("#create-name").fill("Mobile QA");
    await page.getByTestId("create-room-submit").tap();
    await page.getByTestId("avatar-option-robot").tap();
    await page.getByTestId("join-room-submit").tap();

    const room = new RoomPage(page);
    await room.waitForLoaded();

    const settingsModal = new SettingsModal(page);
    await settingsModal.open();
    await settingsModal.toggle("settings-toggle-enable-queue", true);
    await settingsModal.save();

    await page.getByTestId("queue-expand").tap();
    await page.getByTestId("queue-toggle-add").tap();
    await page.getByPlaceholder("Ticket title").fill("Mobile Ticket");
    await page.getByTestId("queue-add-confirm").tap();
    await page.getByTestId("queue-start-voting-1").tap();
    await page.keyboard.press("Escape");

    const participantsContent = page
      .getByTestId("participants-panel")
      .locator('[data-testid="participant-row"]')
      .first();
    await expect(participantsContent).toBeVisible();
    await page.getByTestId("participants-toggle").tap();
    await expect(participantsContent).toBeHidden();
    await page.getByTestId("participants-toggle").tap();

    await page.getByTestId("vote-option-3").tap();
    await expect(page.getByTestId("votes-hidden-panel")).toBeVisible();
    await room.expectQueueCurrentTicketContains("Mobile Ticket");
  });
});
