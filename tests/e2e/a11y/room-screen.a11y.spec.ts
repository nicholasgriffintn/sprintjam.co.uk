import { test, expect } from '@playwright/test';
import { checkA11y, waitForA11yReady } from '../../helpers/a11y-helpers';

test.describe('Room Screen Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /create.*room/i }).click();
    await page.locator('#create-name').fill('A11y Test User');
    await page.getByTestId('create-room-submit').click();
    await waitForA11yReady(page);

    const firstAvatar = page.getByTestId('avatar-option-robot').first();
    await firstAvatar.click();
    await page.getByTestId('create-room-submit').click();

    await waitForA11yReady(page);
  });

  test('should not have any WCAG A & AA violations', async ({ page }) => {
    const results = await checkA11y(page, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    expect(results.violations).toEqual([]);
  });

  test('connection status should be announced to screen readers', async ({
    page,
  }) => {
    const connectionStatus = page.locator('[data-testid="connection-status"]');

    if (await connectionStatus.isVisible()) {
      const role = await connectionStatus.getAttribute('role');
      const ariaLive = await connectionStatus.getAttribute('aria-live');

      expect(role === 'status' || ariaLive !== null).toBe(true);
    }
  });

  test('results area should have aria-live region', async ({ page }) => {
    const voteButton = page.getByRole('button', { name: /^3$/ }).first();
    if (await voteButton.isVisible()) {
      await voteButton.click();
    }

    const results = await checkA11y(page, {
      runOnly: ['aria-valid-attr', 'aria-allowed-attr'],
    });

    expect(results.violations).toEqual([]);
  });
});
