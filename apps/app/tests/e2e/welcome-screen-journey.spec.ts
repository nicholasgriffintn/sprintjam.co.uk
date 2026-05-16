import { test, expect } from "@playwright/test";

import { WelcomePage } from "./pageObjects/welcome-page";
import { CreateRoomPage } from "./pageObjects/create-room-page";
import { JoinRoomPage } from "./pageObjects/join-room-page";
import { RoomPage } from "./pageObjects/room-page";
import { enterTextField } from "./helpers/form-fields";
import {
  delayPostResponse,
  expectButtonLoading,
  roomResponse,
} from "./helpers/loading-states";

test.describe("Welcome screen journey", () => {
  test("visitor can start create flow and land in a room", async ({ page }) => {
    const welcome = new WelcomePage(page);
    await welcome.gotoHome();

    await expect(
      page.getByRole("heading", {
        name: /Fast, real-time planning poker for distributed teams/i,
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

  test("planning create and join submits show loading while requests are pending", async ({
    page,
  }) => {
    await page.goto("/create");
    await enterTextField(page.locator("#create-name"), "Planning Host");
    await page.getByTestId("create-room-submit").click();
    await page.getByTestId("avatar-option-robot").first().click();

    const releaseCreate = await delayPostResponse(
      page,
      "**/api/rooms",
      roomResponse("PLAN01", "Planning Host"),
    );
    const createSubmit = page.getByTestId("join-room-submit");
    await createSubmit.click();
    await expectButtonLoading(createSubmit);
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/rooms") &&
        !response.url().includes("/join") &&
        response.request().method() === "POST",
    );
    releaseCreate();
    await createResponse;

    const joinPage = await page.context().newPage();
    await joinPage.goto("/join");
    await expect(joinPage.locator("#join-name")).toBeVisible();
    await expect(async () => {
      await joinPage.locator("#join-room-key").fill("PLAN01");
      await expect(joinPage.locator("#join-room-key")).toHaveValue("PLAN01");
    }).toPass({ timeout: 10_000 });
    await joinPage.getByTestId("join-room-submit").click();
    await joinPage.getByTestId("avatar-option-bird").first().click();

    const releaseJoin = await delayPostResponse(
      joinPage,
      "**/api/rooms/join",
      roomResponse("PLAN01", "Planning Host"),
    );
    const joinSubmit = joinPage.getByTestId("join-room-submit");
    await joinSubmit.click();
    await expectButtonLoading(joinSubmit);
    releaseJoin();
  });

  test("visitor can move into wheel and standup from sprint flow cards", async ({
    page,
  }) => {
    const welcome = new WelcomePage(page);
    await welcome.gotoHome();

    await welcome.openWheelFromSprintFlow();
    await expect(page).toHaveURL(/\/wheel(?:\/[A-Z0-9]+)?$/);

    await page.goto("/");
    await welcome.openStandupFromSprintFlow();
    await expect(page).toHaveURL(/\/standup$/);
    await expect(
      page.getByRole("heading", {
        name: /Daily standups for distributed teams/i,
      }),
    ).toBeVisible();
  });
});
