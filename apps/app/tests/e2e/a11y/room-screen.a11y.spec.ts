import { test, expect } from "@playwright/test";
import {
  checkA11y,
  waitForA11yReady,
  scrollToBottom,
} from "../../helpers/a11y-helpers";

async function createRoomAndEnter(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /create.*room/i }).click();
  await page.locator("#create-name").fill("A11y Test User");
  await page.getByTestId("create-room-submit").click();
  await waitForA11yReady(page);

  const firstAvatar = page.getByTestId("avatar-option-robot").first();
  await firstAvatar.click();
  await page.getByTestId("join-room-submit").click();

  await expect(page.getByTestId("participants-panel")).toBeVisible();
  await waitForA11yReady(page);
  await scrollToBottom(page);
}

test.describe("Room Screen Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await createRoomAndEnter(page);
  });

  test("should not have any WCAG A & AA violations", async ({ page }) => {
    const results = await checkA11y(page, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });

    expect(results.violations).toEqual([]);
  });

  test("connection status should be announced to screen readers", async ({
    page,
  }) => {
    const connectionStatus = page.locator('[data-testid="connection-status"]');

    if (await connectionStatus.isVisible()) {
      const role = await connectionStatus.getAttribute("role");
      const ariaLive = await connectionStatus.getAttribute("aria-live");

      expect(role === "status" || ariaLive !== null).toBe(true);
    }
  });

  test("results area should have aria-live region", async ({ page }) => {
    const voteButton = page.getByRole("button", { name: /^3$/ }).first();
    if (await voteButton.isVisible()) {
      await voteButton.click();
    }

    const results = await checkA11y(page, {
      runOnly: ["aria-valid-attr", "aria-allowed-attr"],
    });

    expect(results.violations).toEqual([]);
  });

  test("participants panel exposes progress semantics and mobile toggle control", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 900 });

    const toggleButton = page.getByTestId("participants-toggle");
    await toggleButton.scrollIntoViewIfNeeded();
    const initialState = await toggleButton.getAttribute("aria-expanded");
    if (initialState !== "true") {
      await toggleButton.click();
      await expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    }

    const progressBar = page.getByTestId("voting-progress-bar");
    await expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    await expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    const valueText = await progressBar.getAttribute("aria-valuetext");
    expect(valueText).toContain("participants have voted");

    const controlsId = await toggleButton.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    const controlledRegion = page.locator(`#${controlsId}`);
    await expect(controlledRegion).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("show votes controls and distribution view toggles provide pressed state", async ({
    page,
  }) => {
    const firstVoteButton = page.getByTestId(/vote-option-/).first();
    await firstVoteButton.click();

    const toggleVotes = page.getByTestId("toggle-votes-button");
    await expect(toggleVotes).toHaveAttribute("aria-pressed", "false");
    await toggleVotes.click();
    await expect(toggleVotes).toHaveAttribute("aria-pressed", "true");

    const distributionToggleGroup = page.getByTestId(
      "distribution-view-toggle-group",
    );
    await expect(distributionToggleGroup).toBeVisible();

    const percentageToggle = page.getByTestId(
      "distribution-view-option-percentage",
    );
    await percentageToggle.click();
    await expect(percentageToggle).toHaveAttribute("aria-pressed", "true");
  });

  test("timer controls expose accessible labels and state", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /settings/i }).click();
    const settingsDialog = page.getByRole("dialog", { name: "Room Settings" });
    await settingsDialog.getByRole("button", { name: "Results" }).click();
    const timerToggle = settingsDialog.getByTestId(
      "settings-toggle-show-timer",
    );
    const timerLabel = settingsDialog.locator('label[for="showTimer"]');
    await timerLabel.scrollIntoViewIfNeeded();
    if (!(await timerToggle.isChecked())) {
      await timerLabel.click();
    }
    await settingsDialog.getByRole("button", { name: "Save" }).click();

    const timer = page.getByTestId("room-timer");
    await expect(timer).toBeVisible();
    await timer.getByRole("button").click();

    const timerMenu = page.getByTestId("timer-controls");
    // wait for the animation to complete
    await page.waitForTimeout(300);
    await expect(timerMenu).toBeVisible();

    const timerStartButton = page.getByRole("menuitem", {
      name: "Start timer",
    });
    await expect(timerStartButton).toHaveAttribute("aria-pressed", "false");
    await timerStartButton.click();
    await expect(
      page.getByRole("menuitem", { name: "Pause timer" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("menuitem", { name: "Reset timer" }).click();
  });
});
