import { test, expect } from "@playwright/test";

import { CreateRoomPage } from "./pageObjects/create-room-page";
import { WelcomePage } from "./pageObjects/welcome-page";

test.describe("Room party games", () => {
  test("moderator can play a game and keep the outcome in the session summary", async ({
    page,
  }) => {
    const welcome = new WelcomePage(page);
    await welcome.gotoHome();
    await welcome.startCreateRoom();

    const createRoom = new CreateRoomPage(page);
    await createRoom.fillBasics("Party Games QA");
    await createRoom.startInstantRoom();

    const joinWithAvatarButton = page.getByRole("button", {
      name: "Create & join",
    });
    await expect(joinWithAvatarButton).toBeVisible({ timeout: 10_000 });
    await joinWithAvatarButton.click();

    await expect(page.getByTestId("participants-panel")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Party games" }).click();
    await page.getByRole("button", { name: "Start Emoji Story" }).click();

    await expect(page.getByText("Party game live")).toBeVisible();
    await page.getByPlaceholder("Drop 1-6 emojis").fill("🚀");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByText("No moves played yet.")).toHaveCount(0);

    await page.getByRole("button", { name: "End game" }).click();
    await page.getByTestId("complete-session-button").click();
    await page.getByRole("button", { name: "Complete session" }).click();

    await expect(page.getByText("Game recap")).toBeVisible();
    await expect(page.getByText("Emoji Story").first()).toBeVisible();
  });
});
