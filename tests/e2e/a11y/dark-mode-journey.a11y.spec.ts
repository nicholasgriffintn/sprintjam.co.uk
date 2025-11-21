import { test, expect } from "@playwright/test";
import {
  checkA11y,
  waitForA11yReady,
  scrollToBottom,
} from '../../helpers/a11y-helpers';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('Dark Mode Accessibility Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('sprintjam_theme', 'dark');
    });
  });

  test.afterEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('sprintjam_theme');
    });
  });

  test('full journey stays accessible in dark mode with the results panel open', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForA11yReady(page);
    await scrollToBottom(page);

    const rootClass = await page.locator('html').getAttribute('class');
    expect(rootClass).toContain('dark');

    const welcomeResults = await checkA11y(page, {
      runOnly: wcagTags,
    });
    expect(welcomeResults.violations).toEqual([]);

    await page.getByTestId('create-room-button').click();
    await waitForA11yReady(page);
    await scrollToBottom(page);

    await page.locator('#create-name').fill('Dark Mode Explorer');
    await page.getByTestId('create-room-submit').click();
    await waitForA11yReady(page);
    await scrollToBottom(page);

    await page.getByTestId('avatar-option-robot').first().click();
    await page.getByTestId('create-room-submit').click();
    await waitForA11yReady(page);
    await scrollToBottom(page);

    const structuredCheckbox = page.locator('#enable-structured-voting');
    if (
      (await structuredCheckbox.isVisible()) &&
      !(await structuredCheckbox.isChecked())
    ) {
      await structuredCheckbox.check();
    }

    const createResults = await checkA11y(page, {
      runOnly: wcagTags,
    });
    expect(createResults.violations).toEqual([]);

    await page.getByTestId('create-room-submit').click();
    await waitForA11yReady(page);
    await scrollToBottom(page);

    const structuredPanel = page.getByTestId('structured-voting-panel');
    await expect(structuredPanel).toBeVisible();

    const complexityButton = page
      .getByTestId('structured-score-complexity-2')
      .first();
    await complexityButton.click();

    const scoringInfoToggle = page.getByRole('button', {
      name: /scoring info/i,
    });
    await scoringInfoToggle.click();
    await waitForA11yReady(page);
    await scrollToBottom(page);

    const resultsToggle = page.getByTestId('toggle-votes-button');
    await resultsToggle.click();
    await page
      .getByTestId('results-panel')
      .waitFor({ state: 'visible', timeout: 5000 });
    await waitForA11yReady(page);
    await scrollToBottom(page);
    // Wait for any animations to settle
    await page.waitForTimeout(2000);

    const roomResults = await checkA11y(page, {
      runOnly: wcagTags,
    });
    expect(roomResults.violations).toEqual([]);
  });
});
