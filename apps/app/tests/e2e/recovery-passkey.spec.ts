import { test, expect, type Page } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

const getRecoveryPasskeyStorageKey = (
  feature: "room" | "wheel" | "standup",
  sessionKey: string,
  userName: string,
) =>
  `sprintjam_recovery_${feature}_${sessionKey.toLowerCase()}_${userName.toLowerCase()}`;

const setStoredPasskey = async (
  page: Page,
  feature: "room" | "wheel" | "standup",
  key: string,
  userName: string,
  passkey: string,
) => {
  const storageKey = getRecoveryPasskeyStorageKey(feature, key, userName);

  await page.addInitScript(
    ({ storageKey: s, passkey: p }) => {
      localStorage.setItem(s, p);
    },
    { storageKey, passkey },
  );
};

const disableAutoHandover = async (moderatorRoom: { getPage: () => Page }) => {
  const modal = new SettingsModal(moderatorRoom.getPage());
  await modal.open();
  await modal.toggle("settings-toggle-handover-moderator", false);
  await modal.save();
};

test.describe("Recovery passkey notification", () => {
  test("moderator sees recovery passkey notification after joining a room", async ({
    browser,
  }) => {
    const { moderatorRoom, cleanup, roomKey, moderatorName } =
      await createRoomWithParticipant(browser);

    await disableAutoHandover(moderatorRoom);

    const page = moderatorRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, moderatorName, "TEST-PASS");

    await page.reload();
    await moderatorRoom.waitForLoaded();

    await expect(page.getByText("Save your recovery passkey")).toBeVisible();

    await expect(page.getByText("TEST-PASS")).toBeVisible();

    await cleanup();
  });

  test("moderator can dismiss the recovery passkey notification", async ({
    browser,
  }) => {
    const { moderatorRoom, cleanup, roomKey, moderatorName } =
      await createRoomWithParticipant(browser);

    await disableAutoHandover(moderatorRoom);

    const page = moderatorRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, moderatorName, "TEST-PASS");

    await page.reload();
    await moderatorRoom.waitForLoaded();

    await expect(page.getByText("Save your recovery passkey")).toBeVisible();

    await page.getByLabel("Close notification").click();

    await expect(
      page.getByText("Save your recovery passkey"),
    ).not.toBeVisible();

    await cleanup();
  });

  test("participant does not see recovery passkey notification", async ({
    browser,
  }) => {
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      roomKey,
      participantName,
    } = await createRoomWithParticipant(browser);

    await disableAutoHandover(moderatorRoom);

    const page = participantRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, participantName, "TEST-PASS");

    await page.reload();
    await participantRoom.waitForLoaded();

    await expect(
      page.getByText("Save your recovery passkey"),
    ).not.toBeVisible();

    await cleanup();
  });
});
