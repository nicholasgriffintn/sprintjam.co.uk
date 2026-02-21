import { test, expect } from "@playwright/test";
import { checkA11y, waitForA11yReady } from "../../helpers/a11y-helpers";

async function createAndOpenAvatarStep(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /create.*room/i }).click();
  await waitForA11yReady(page);
}

async function proceedToAvatar(page) {
  await page.getByTestId("create-room-submit").click();
  await waitForA11yReady(page);
}

test.describe("Room Creation Flow Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await createAndOpenAvatarStep(page);
  });

  test("should not have any WCAG A & AA violations on create room screen", async ({
    page,
  }) => {
    const results = await checkA11y(page, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });

    expect(results.violations).toEqual([]);
  });

  test("avatar selector should be accessible", async ({ page }) => {
    await page.locator("#create-name").fill("Test User");
    await proceedToAvatar(page);

    const results = await checkA11y(page, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });

    expect(results.violations).toEqual([]);
  });

  test("keyboard navigation through create room form", async ({ page }) => {
    // Should be able to navigate to name input
    const nameInput = page.locator("#create-name");
    await nameInput.focus();
    const isFocused = await nameInput.evaluate(
      (el) => el === document.activeElement,
    );
    expect(isFocused).toBe(true);

    // Should be able to type
    await nameInput.fill("Test User");

    // Navigate to submit button and continue
    await proceedToAvatar(page);

    // Should navigate to avatar selection (join flow)
    await expect(page.getByRole("heading", { name: /avatar/i })).toBeVisible();
  });

  test("custom emoji picker exposes aria-expanded and controls", async ({
    page,
  }) => {
    await page.locator("#create-name").fill("Accessibility Test");
    await proceedToAvatar(page);

    await expect(page.getByRole("heading", { name: /avatar/i })).toBeVisible();

    const toggle = page.getByTestId("avatar-emoji-toggle");
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const controlsId = await toggle.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const emojiPanel = controlsId
      ? page.locator(`#${controlsId}`)
      : page.getByTestId("avatar-emoji-panel");
    await expect(emojiPanel).toBeVisible();
  });
});
