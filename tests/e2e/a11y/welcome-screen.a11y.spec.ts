import { test, expect } from '@playwright/test';
import { checkA11y, waitForA11yReady } from '../../helpers/a11y-helpers';

test.describe('Welcome Screen Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForA11yReady(page);
  });

  test('should not have any automatically detectable WCAG A & AA violations', async ({
    page,
  }) => {
    const results = await checkA11y(page, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    expect(results.violations).toEqual([]);
  });
});
