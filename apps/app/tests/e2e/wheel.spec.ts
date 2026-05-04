import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const MODERATOR_NAME = "Wheel QA";
const GUEST_NAME = "Guest QA";

const setUserName = async (target: Page | BrowserContext, name: string) => {
  await target.addInitScript((storedName) => {
    localStorage.setItem("sprintjam_username", storedName);
  }, name);
};

const getWheelKeyFromUrl = (url: string) => {
  const match = url.match(/\/wheel\/([^/]+)$/);
  return match?.[1];
};

const waitForWheelReady = async (page: Page) => {
  const entriesInput = page.getByPlaceholder("Enter names, one per line...");
  await expect(entriesInput).toBeVisible({ timeout: 15_000 });
  await expect(entriesInput).toBeEnabled();
  return entriesInput;
};

test.describe("Wheel journey", () => {
  test("moderator can add entries and spin", async ({ page }) => {
    await setUserName(page, MODERATOR_NAME);

    await page.goto("/wheel");
    await page.waitForURL("**/wheel/**");

    const entriesInput = await waitForWheelReady(page);
    await expect(entriesInput).toHaveValue(/Ada/);
    await expect(page.getByText("6 entries on wheel")).toBeVisible({
      timeout: 15_000,
    });

    await entriesInput.fill("Alpha\nBeta\nGamma");

    await expect(page.getByText("3 entries on wheel")).toBeVisible({
      timeout: 15_000,
    });

    await page.keyboard.press("ControlOrMeta+Enter");

    await page.getByRole("button", { name: "Results" }).click();
    await expect(page.getByText("1 total")).toBeVisible({ timeout: 15_000 });
  });

  test("participant sees entries read-only", async ({ page, browser }) => {
    await setUserName(page, MODERATOR_NAME);

    await page.goto("/wheel");
    await page.waitForURL("**/wheel/**");

    const entriesInput = await waitForWheelReady(page);
    await entriesInput.fill("Alpha\nBeta");
    await expect(page.getByText("2 entries on wheel")).toBeVisible({
      timeout: 15_000,
    });

    const wheelKey = getWheelKeyFromUrl(page.url());
    if (!wheelKey) {
      throw new Error("Wheel key missing from URL");
    }

    const guestContext = await browser.newContext();
    await setUserName(guestContext, GUEST_NAME);
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`/wheel/${wheelKey}`);

    await expect(
      guestPage.getByPlaceholder("Enter names, one per line..."),
    ).toHaveCount(0);

    const entriesList = guestPage.getByRole("list").first();
    await expect(entriesList.getByText("Alpha")).toBeVisible({
      timeout: 15_000,
    });
    await expect(entriesList.getByText("Beta")).toBeVisible();

    await guestContext.close();
  });

  test("passcode-protected wheel requires the code before joining", async ({
    page,
    browser,
  }) => {
    await setUserName(page, MODERATOR_NAME);

    await page.goto("/wheel");
    await page.waitForURL("**/wheel/**");
    await waitForWheelReady(page);

    const wheelKey = getWheelKeyFromUrl(page.url());
    if (!wheelKey) {
      throw new Error("Wheel key missing from URL");
    }

    await page.getByRole("button", { name: "Share wheel" }).click();
    await page
      .getByRole("dialog", { name: "Share Wheel" })
      .getByRole("switch")
      .click();
    const passcodeInput = page.locator("#wheel-passcode-input");
    await expect(passcodeInput).toBeVisible();
    const passcode = await passcodeInput.inputValue();
    await page.getByRole("button", { name: "Close modal" }).click();

    const guestContext = await browser.newContext();
    await setUserName(guestContext, GUEST_NAME);
    const guestPage = await guestContext.newPage();

    try {
      await guestPage.goto(`/wheel/${wheelKey}`);
      await expect(guestPage.getByText("Wheel requires a passcode")).toBeVisible();
      await guestPage.locator("#wheel-passcode").fill(passcode);
      await guestPage.getByRole("button", { name: "Join wheel" }).click();
      await expect(guestPage.getByText("Wheel control")).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await guestContext.close();
    }
  });

  test("moderator can recover an active wheel session with a recovery passkey", async ({
    page,
    browser,
  }) => {
    await setUserName(page, MODERATOR_NAME);

    await page.goto("/wheel");
    await page.waitForURL("**/wheel/**");
    await waitForWheelReady(page);

    const wheelKey = getWheelKeyFromUrl(page.url());
    if (!wheelKey) {
      throw new Error("Wheel key missing from URL");
    }

    const recoveryPasskey = await page.evaluate(
      ({ key, name }) =>
        localStorage.getItem(
          `sprintjam_recovery_wheel_${key.toLowerCase()}_${name.toLowerCase()}`,
        ),
      { key: wheelKey, name: MODERATOR_NAME },
    );
    if (!recoveryPasskey) {
      throw new Error("Recovery passkey missing from localStorage");
    }

    const recoveryContext = await browser.newContext();
    await setUserName(recoveryContext, MODERATOR_NAME);
    const recoveryPage = await recoveryContext.newPage();

    try {
      await recoveryPage.goto(`/wheel/${wheelKey}`);
      await expect(recoveryPage.getByText("Name already connected")).toBeVisible();
      await recoveryPage.locator("#wheel-recovery-passkey").fill(recoveryPasskey);
      await recoveryPage.getByRole("button", { name: "Recover session" }).click();
      await expect(recoveryPage.getByText("Wheel control")).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await recoveryContext.close();
    }
  });
});
