import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe("Error scenarios", () => {
  test("prompts to rejoin when a stored session has expired", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup, roomKey, moderatorName } = setup;

    const authToken = await moderatorRoom
      .getPage()
      .evaluate(() => window.localStorage.getItem("sprintjam_authToken"));

    await cleanup();

    const reconnectContext = await browser.newContext();
    const reconnectPage = await reconnectContext.newPage();

    await reconnectPage.route("**/api/rooms/join", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Session expired. Please rejoin the room.",
        }),
      });
    });

    await reconnectPage.addInitScript(
      ({ savedRoomKey, savedAuthToken, savedName }) => {
        window.localStorage.setItem("sprintjam_roomKey", savedRoomKey);
        if (savedAuthToken) {
          window.localStorage.setItem("sprintjam_authToken", savedAuthToken);
        }
        window.localStorage.setItem("sprintjam_username", savedName);
      },
      { savedRoomKey: roomKey, savedAuthToken: authToken, savedName: moderatorName },
    );

    await reconnectPage.goto(`/room/${roomKey}`);
    await expect(
      reconnectPage.getByText(/Session expired.*rejoin the room/i),
    ).toBeVisible();

    await reconnectContext.close();
  });

  test("prevents settings changes from applying while disconnected", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup } = setup;
    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    try {
      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-show-timer", true);
      await settingsModal.save();

      await moderatorRoom.expectTimerVisible();
    } finally {
      await cleanup();
    }
  });
});
