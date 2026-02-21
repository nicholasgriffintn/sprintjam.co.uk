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
      await moderatorRoom.getPage().getByTestId("queue-toggle-add").click();
      await moderatorRoom
        .getPage()
        .getByPlaceholder("Ticket title")
        .fill("Persisted Ticket");
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

  test("stores room session cookie and username in localStorage", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup, roomKey, moderatorContext } = setup;

    try {
      const storage = await moderatorRoom.getPage().evaluate(() => ({
        username: window.localStorage.getItem("sprintjam_username"),
        pathname: window.location.pathname,
      }));
      const cookies = await moderatorContext.cookies();
      const sessionCookie = cookies.find(
        (cookie) => cookie.name === "room_session",
      );

      expect(sessionCookie?.value).toBeTruthy();
      expect(storage.username).toBeTruthy();
      expect(storage.pathname).toBe(`/room/${roomKey}`);
    } finally {
      await cleanup();
    }
  });

  test("auto-rejoins a room after disconnect using stored credentials", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup, roomKey, moderatorName, moderatorContext } =
      setup;

    const cookies = await moderatorContext.cookies();
    const sessionCookie = cookies.find(
      (cookie) => cookie.name === "room_session",
    );
    expect(sessionCookie?.value).toBeTruthy();

    await cleanup();

    const reconnectContext = await browser.newContext();
    if (sessionCookie) {
      await reconnectContext.addCookies([sessionCookie]);
    }
    await reconnectContext.addInitScript(
      ({ savedName }) => {
        window.localStorage.setItem("sprintjam_username", savedName);
      },
      { savedName: moderatorName },
    );

    const reconnectPage = await reconnectContext.newPage();
    await reconnectPage.goto(`/room/${roomKey}`);
    await expect(reconnectPage.getByTestId("participants-panel")).toBeVisible();

    await reconnectContext.close();
  });
});
