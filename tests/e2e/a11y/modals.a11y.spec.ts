import { test, expect } from "@playwright/test";
import { checkA11y, waitForA11yReady } from "../../helpers/a11y-helpers";

test.describe("Modal Dialogs Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /create.*room/i }).click();

    // Step 1: Name
    await page.locator("#create-name").fill("Modal Test User");
    await page.getByTestId("create-room-submit").click();
    await waitForA11yReady(page);

    // Step 2: Avatar
    await page.getByTestId("avatar-option-robot").first().click();
    await page.getByTestId("create-room-submit").click();
    await waitForA11yReady(page);

    // Step 3: Final create button
    const createButton = page.getByTestId("create-room-submit");
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for room to be created
    await expect(page.getByTestId("participants-panel")).toBeVisible();
    await waitForA11yReady(page);
  });

  test.describe("Share Room Modal", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Share room" }).click();
      await waitForA11yReady(page);
    });

    test("should not have WCAG violations", async ({ page }) => {
      const results = await checkA11y(page, {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      });

      expect(results.violations).toEqual([]);
    });

    test("should have proper dialog role and attributes", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const ariaModal = await dialog.getAttribute("aria-modal");
      expect(ariaModal).toBe("true");

      const ariaLabelledby = await dialog.getAttribute("aria-labelledby");
      const ariaLabel = await dialog.getAttribute("aria-label");
      expect(ariaLabelledby !== null || ariaLabel !== null).toBe(true);
    });

    test("shareable URL input should have label", async ({ page }) => {
      const results = await checkA11y(page, {
        runOnly: ["label"],
      });

      expect(results.violations).toEqual([]);
    });

    test("should trap focus within modal", async ({ page }) => {
      const dialog = page.getByRole("dialog");

      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      const focusedElement = page.locator(":focus");
      const dialogHandle = await dialog.elementHandle();
      if (dialogHandle) {
        const isWithinDialog = await focusedElement.evaluate(
          (el, dialogEl) => dialogEl!.contains(el),
          dialogHandle,
        );
        expect(isWithinDialog).toBe(true);
      }
    });

    test("should close on Escape key", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });

    test("close button should have accessible name", async ({ page }) => {
      const closeButton = page.getByRole("button", { name: /close/i });
      await expect(closeButton).toBeVisible();

      const results = await checkA11y(page, {
        runOnly: ["button-name"],
      });

      expect(results.violations).toEqual([]);
    });
  });

  test.describe("Settings Modal", () => {
    test.beforeEach(async ({ page }) => {
      const settingsButton = page.getByRole("button", {
        name: /room settings/i,
      });
      await settingsButton.click();
      await waitForA11yReady(page);
    });

    test("should not have WCAG violations", async ({ page }) => {
      const results = await checkA11y(page, {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      });

      expect(results.violations).toEqual([]);
    });

    test("should have proper dialog role and attributes", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const ariaModal = await dialog.getAttribute("aria-modal");
      expect(ariaModal).toBe("true");
    });

    test("form controls should have labels", async ({ page }) => {
      const results = await checkA11y(page, {
        runOnly: ["label", "form-field-multiple-labels"],
      });

      expect(results.violations).toEqual([]);
    });

    test("buttons should have accessible names", async ({ page }) => {
      const results = await checkA11y(page, {
        runOnly: ["button-name"],
      });

      expect(results.violations).toEqual([]);
    });

    test("should trap focus within modal", async ({ page }) => {
      const dialog = page.getByRole("dialog");

      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      const focusedElement = page.locator(":focus");
      const dialogHandle = await dialog.elementHandle();
      if (dialogHandle) {
        const isWithinDialog = await focusedElement.evaluate(
          (el, dialogEl) => dialogEl!.contains(el),
          dialogHandle,
        );
        expect(isWithinDialog).toBe(true);
      }
    });

    test("should close on Escape key", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  });
});
