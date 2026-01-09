import { test, expect, type Page } from "@playwright/test";
import {
  checkA11y,
  waitForA11yReady,
  scrollToBottom,
} from "../../helpers/a11y-helpers";

async function createRoomAndEnableStructured(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /create.*room/i }).click();
  await page.locator("#create-name").fill("Structured A11y User");
  await page.getByTestId("create-room-submit").click();
  await waitForA11yReady(page);

  await page.getByTestId("avatar-option-robot").first().click();
  await page.getByTestId("join-room-submit").click();
  await waitForA11yReady(page);

  await page.getByRole("button", { name: /settings/i }).click();
  const dialog = page.getByRole("dialog", { name: "Room Settings" });
  const structuredToggle = dialog.getByTestId(
    "settings-toggle-structured-voting",
  );
  await structuredToggle.check({ force: true });
  await dialog.getByRole("button", { name: "Save" }).click();
  await waitForA11yReady(page);
}

test.describe("Structured Voting Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await createRoomAndEnableStructured(page);
    await expect(page.getByTestId("structured-voting-panel")).toBeVisible();
    await scrollToBottom(page);
  });

  test("structured voting panel has no WCAG violations", async ({ page }) => {
    const results = await checkA11y(page, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });

    expect(results.violations).toEqual([]);
  });

  test("score buttons expose aria-pressed state", async ({ page }) => {
    const scoreButton = page
      .locator('[data-testid^="structured-score-"]')
      .first();

    await scoreButton.click();
    await expect(scoreButton).toHaveAttribute("aria-pressed", "true");
  });

  test("structured summary is announced to assistive tech", async ({
    page,
  }) => {
    const summary = page.getByTestId("structured-summary");

    await expect(summary).toHaveAttribute("role", "status");
    await expect(summary).toHaveAttribute("aria-live", "polite");
    await expect(summary).toHaveAttribute("aria-atomic", "true");
  });
});
