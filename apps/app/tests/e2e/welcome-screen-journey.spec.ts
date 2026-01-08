import { test, expect } from "@playwright/test";

import { WelcomePage } from "./pageObjects/welcome-page";
import { CreateRoomPage } from "./pageObjects/create-room-page";
import { JoinRoomPage } from "./pageObjects/join-room-page";
import { RoomPage } from "./pageObjects/room-page";

test.describe("Welcome screen journey", () => {
  test("visitor can start create flow and land in a room", async ({ page }) => {
    const welcome = new WelcomePage(page);
    await welcome.gotoHome();

    await expect(
      page.getByRole("heading", {
        name: /Effortless team estimations/i,
      }),
    ).toBeVisible();

    await welcome.startCreateRoom();

    const createRoom = new CreateRoomPage(page);
    await createRoom.fillBasics("Welcome QA");
    await createRoom.enableStructuredVoting();
    await createRoom.startInstantRoom();

    const joinRoom = new JoinRoomPage(page);
    await joinRoom.selectAvatarOnlyAndJoin("avatar-option-robot");

    const room = new RoomPage(page);
    await room.waitForLoaded();
    await room.expectParticipantVisible("Welcome QA");
    await room.expectStructuredPanelVisible();
  });

  test("visitor can jump into the join flow from welcome", async ({ page }) => {
    const welcome = new WelcomePage(page);
    await welcome.gotoHome();
    await welcome.startJoinRoom();

    const joinRoom = new JoinRoomPage(page);
    await joinRoom.completeParticipantDetails({
      name: "Join QA",
      roomKey: "ABC123",
    });

    await expect(page.getByTestId("join-room-submit")).toBeEnabled();
    await page.getByTestId("join-room-submit").click();
    await expect(page.getByText(/Select Your Avatar/i)).toBeVisible();
    await page.getByTestId("join-room-back").click();
    await expect(page.locator("#join-room-key")).toHaveValue("ABC123");
    await expect(page.locator("#join-name")).toHaveValue("Join QA");
  });
});
