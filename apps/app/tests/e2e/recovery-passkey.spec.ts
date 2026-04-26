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

test.describe("Recovery passkey modal", () => {
  test("moderator sees recovery passkey modal after joining a room", async ({
    browser,
  }) => {
    const { moderatorRoom, cleanup, roomKey, moderatorName } =
      await createRoomWithParticipant(browser);

    const page = moderatorRoom.getPage();

    // Inject a stored recovery passkey to simulate what the server sets
    await setStoredPasskey(page, "room", roomKey, moderatorName, "TEST-PASS");

    // Reload so the useEffect picks up the stored passkey
    await page.reload();
    await moderatorRoom.waitForLoaded();

    await expect(
      page.getByRole("dialog").getByText("Save your recovery passkey"),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("dialog").getByText("TEST-PASS")).toBeVisible();

    await cleanup();
  });

  test("moderator can dismiss the recovery passkey modal", async ({
    browser,
  }) => {
    const { moderatorRoom, cleanup, roomKey, moderatorName } =
      await createRoomWithParticipant(browser);

    const page = moderatorRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, moderatorName, "TEST-PASS");

    await page.reload();
    await moderatorRoom.waitForLoaded();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    await cleanup();
  });

  test("participant does not see recovery passkey modal", async ({
    browser,
  }) => {
    const { participantRoom, cleanup, roomKey, participantName } =
      await createRoomWithParticipant(browser);

    const page = participantRoom.getPage();

    await setStoredPasskey(page, "room", roomKey, participantName, "TEST-PASS");

    await page.reload();
    await participantRoom.waitForLoaded();

    // Modal should not appear for participants
    await expect(
      page.getByRole("dialog").getByText("Save your recovery passkey"),
    ).not.toBeVisible({ timeout: 5_000 });

    await cleanup();
  });
});

test.describe("Recovery passkey modal — wheel", () => {
  const MODERATOR_NAME = "Wheel QA";

  const setUserName = async (page: Page, name: string) => {
    await page.addInitScript((storedName) => {
      localStorage.setItem("sprintjam_username", storedName);
    }, name);
  };

  test("wheel moderator sees recovery passkey modal", async ({ page }) => {
    await setUserName(page, MODERATOR_NAME);
    await page.goto("/wheel");
    await page.waitForURL("**/wheel/**");

    const wheelKey = page.url().match(/\/wheel\/([^/]+)$/)?.[1];
    if (!wheelKey) throw new Error("Wheel key missing from URL");

    // Inject passkey and reload to trigger useEffect
    await page.evaluate(
      ({ feature, key, userName, passkey }) => {
        localStorage.setItem(
          `sprintjam_recovery_passkey_${feature}_${key}_${userName}`,
          passkey,
        );
      },
      {
        feature: "wheel",
        key: wheelKey,
        userName: MODERATOR_NAME,
        passkey: "WHLP-TEST",
      },
    );

    await page.reload();
    await page.waitForURL(`**/wheel/${wheelKey}`);

    // Wait for wheel to reconnect
    await expect(
      page.getByPlaceholder("Enter names, one per line..."),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByRole("dialog").getByText("Save your recovery passkey"),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("dialog").getByText("WHLP-TEST")).toBeVisible();
  });
});
