import { test, expect, type Page } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

const setStoredPasskey = async (
  page: Page,
  feature: "room" | "wheel" | "standup",
  key: string,
  userName: string,
  passkey: string,
) => {
  await page.addInitScript(
    ({ feature: f, key: k, userName: u, passkey: p }) => {
      localStorage.setItem(`sprintjam_recovery_passkey_${f}_${k}_${u}`, p);
    },
    { feature, key, userName, passkey },
  );
};

test.describe("Recovery passkey notification", () => {
  test("moderator sees recovery passkey notification after joining a room", async ({
    browser,
  }) => {
    const { moderatorRoom, cleanup, roomKey, moderatorName } =
      await createRoomWithParticipant(browser);

    const page = moderatorRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, moderatorName, "TEST-PASS");

    await page.reload();
    await moderatorRoom.waitForLoaded();

    await expect(page.getByText("Save your recovery passkey")).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByText("TEST-PASS")).toBeVisible();

    await cleanup();
  });

  test("moderator can dismiss the recovery passkey notification", async ({
    browser,
  }) => {
    const { moderatorRoom, cleanup, roomKey, moderatorName } =
      await createRoomWithParticipant(browser);

    const page = moderatorRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, moderatorName, "TEST-PASS");

    await page.reload();
    await moderatorRoom.waitForLoaded();

    await expect(page.getByText("Save your recovery passkey")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Close notification" }).click();

    await expect(page.getByText("Save your recovery passkey")).not.toBeVisible({
      timeout: 5_000,
    });

    await cleanup();
  });

  test("participant does not see recovery passkey notification", async ({
    browser,
  }) => {
    const { participantRoom, cleanup, roomKey, participantName } =
      await createRoomWithParticipant(browser);

    const page = participantRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, participantName, "TEST-PASS");

    await page.reload();
    await participantRoom.waitForLoaded();

    await expect(page.getByText("Save your recovery passkey")).not.toBeVisible({
      timeout: 5_000,
    });

    await cleanup();
  });
});
