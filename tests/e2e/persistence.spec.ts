import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("Data persistence", () => {
  test("retains room state after reload", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, participantRoom, cleanup } = setup;

    try {
      await moderatorRoom.castVote("5");
      await participantRoom.castVote("3");
      await moderatorRoom.revealVotes();

      await moderatorRoom.getPage().getByTestId("queue-expand").click();
      await moderatorRoom
        .getPage()
        .getByTestId("queue-toggle-add")
        .click();
      await moderatorRoom.getPage().getByPlaceholder("Ticket title").fill("Persisted Ticket");
      await moderatorRoom.getPage().getByTestId("queue-add-confirm").click();
      await moderatorRoom.getPage().getByTestId("queue-start-voting-1").click();
      await moderatorRoom.getPage().keyboard.press("Escape");

      await moderatorRoom.reload();
      await moderatorRoom.waitForParticipants(2);
      await moderatorRoom.expectQueueCurrentTicketContains("Persisted Ticket");
      await expect(
        moderatorRoom.getPage().getByTestId("votes-hidden-panel"),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("stores room and auth tokens in localStorage", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup, roomKey } = setup;

    try {
      const storage = await moderatorRoom.getPage().evaluate(() => ({
        roomKey: window.localStorage.getItem("sprintjam_roomKey"),
        auth: window.localStorage.getItem("sprintjam_authToken"),
        username: window.localStorage.getItem("sprintjam_username"),
      }));

      expect(storage.roomKey).toBe(roomKey);
      expect(storage.auth).toBeTruthy();
      expect(storage.username).toBeTruthy();
    } finally {
      await cleanup();
    }
  });

  test("auto-rejoins a room after disconnect using stored credentials", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup, roomKey, moderatorName } = setup;

    const { authToken } = await moderatorRoom.getPage().evaluate(() => ({
      authToken: window.localStorage.getItem("sprintjam_authToken"),
    }));

    await cleanup();

    const reconnectContext = await browser.newContext();
    await reconnectContext.addInitScript(
      ({ savedRoomKey, savedAuthToken, savedName }) => {
        window.localStorage.setItem("sprintjam_roomKey", savedRoomKey);
        if (savedAuthToken) {
          window.localStorage.setItem("sprintjam_authToken", savedAuthToken);
        }
        window.localStorage.setItem("sprintjam_username", savedName);
      },
      { savedRoomKey: roomKey, savedAuthToken: authToken, savedName: moderatorName },
    );

    const reconnectPage = await reconnectContext.newPage();
    await reconnectPage.goto("/");
    await expect(reconnectPage.getByTestId("participants-panel")).toBeVisible();

    await reconnectContext.close();
  });
});
