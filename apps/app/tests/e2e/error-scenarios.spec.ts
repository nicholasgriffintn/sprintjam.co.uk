import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";
import { JoinRoomPage } from "./pageObjects/join-room-page";

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
      {
        savedRoomKey: roomKey,
        savedAuthToken: authToken,
        savedName: moderatorName,
      },
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

  test("redirects to join screen when visiting room URL without saved name", async ({
    page,
  }) => {
    await page.goto("/room/ABC123");

    await expect(page.locator("#join-name")).toBeVisible();
    await expect(page.locator("#join-room-key")).toHaveValue("ABC123");
  });

  test("can join existing room after being redirected to join screen", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { roomKey, cleanup } = setup;

    try {
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();

      await newPage.goto(`/room/${roomKey}`);

      await expect(newPage.locator("#join-name")).toBeVisible();
      await expect(newPage.locator("#join-room-key")).toHaveValue(roomKey);

      const joinRoomPage = new JoinRoomPage(newPage);
      await joinRoomPage.completeParticipantDetails({
        name: "New User",
      });
      await joinRoomPage.selectAvatarAndJoin();

      await expect(newPage.getByTestId("participants-panel")).toBeVisible();
      await expect(newPage.getByTestId("room-key-value")).toContainText(
        roomKey,
      );

      await newContext.close();
    } finally {
      await cleanup();
    }
  });

  test("redirects to home with error when visiting non-existent room URL", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("sprintjam_username", "Test User");
    });

    await page.goto("/room/XXXXXX");

    await expect(page.getByText(/Room not found/i)).toBeVisible();
    await expect(page).toHaveURL("/");
  });
});
