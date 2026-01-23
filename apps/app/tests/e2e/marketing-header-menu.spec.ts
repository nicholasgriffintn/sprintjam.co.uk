import { test, expect } from '@playwright/test';

import { WelcomePage } from './pageObjects/welcome-page';

test.describe('Marketing Header Menu', () => {
  let welcomePage: WelcomePage;

  test.beforeEach(async ({ page }) => {
    welcomePage = new WelcomePage(page);
    await welcomePage.gotoHome();
  });

  test('menu button opens and closes the dropdown', async ({ page }) => {
    // Initially menu should be closed
    await expect(page.getByTestId('marketing-menu-button')).toBeVisible();
    await expect(page.getByRole('menu')).not.toBeVisible();

    // Open menu
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByText('Explore SprintJam')).toBeVisible();
    await expect(page.getByText('Jump to the essentials.')).toBeVisible();

    // Close menu by clicking the button again
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).not.toBeVisible();
  });

  test('menu closes when clicking outside', async ({ page }) => {
    // Open menu
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).toBeVisible();

    // Click outside the menu
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('menu')).not.toBeVisible();
  });

  test('menu closes when pressing Escape key', async ({ page }) => {
    // Open menu
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).not.toBeVisible();
  });

  test('menu shows all navigation links', async ({ page }) => {
    // Open menu
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).toBeVisible();

    // Check all expected links are present
    const expectedLinks = ['Integrations', 'FAQ', 'Guides', 'Changelog'];
    for (const link of expectedLinks) {
      await expect(page.getByRole('menuitem', { name: link })).toBeVisible();
    }
  });

  test('navigation links work correctly', async ({ page }) => {
    // Open menu
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).toBeVisible();

    // Click Integrations link
    await page.getByRole('menuitem', { name: 'Integrations' }).click();

    // Menu should close and we should navigate to integrations
    await expect(page.getByRole('menu')).not.toBeVisible();
    // Just check that we're no longer on home page
    await expect(page.getByTestId('create-room-button')).not.toBeVisible();
  });

  test('action buttons work correctly', async ({ page }) => {
    // Open menu
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).toBeVisible();

    // Test Create a room button
    await page.getByRole('menuitem', { name: 'Create a room' }).click();
    await expect(page.getByRole('menu')).not.toBeVisible();
    await expect(page.getByTestId('create-room-submit')).toBeVisible();

    // Go back to home to test join button
    await welcomePage.gotoHome();
    await page.getByTestId('marketing-menu-button').click();

    // Test Join a session button
    await page.getByRole('menuitem', { name: 'Join a session' }).click();
    await expect(page.getByRole('menu')).not.toBeVisible();
    await expect(page.getByTestId('join-room-submit')).toBeVisible();
  });

  test('menu button shows correct text state', async ({ page }) => {
    const menuButton = page.getByTestId('marketing-menu-button');

    // Menu text should be visible initially
    await expect(menuButton.getByText('Menu')).toBeVisible();

    // Button should be clickable and toggle state
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Should still be visible with same text
    await expect(menuButton.getByText('Menu')).toBeVisible();
  });

  test('menu is accessible via keyboard', async ({ page }) => {
    // Focus the menu button
    await page.getByTestId('marketing-menu-button').focus();
    await expect(page.getByTestId('marketing-menu-button')).toBeFocused();

    // Open with Enter key
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();

    // Menu items should be present for keyboard navigation
    await expect(page.getByRole('menuitem')).toHaveCount(6); // 4 links + 2 buttons

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).not.toBeVisible();
  });

  test('menu has proper ARIA attributes', async ({ page }) => {
    const menuButton = page.getByTestId('marketing-menu-button');

    // Check initial ARIA state
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');

    // Open menu and check ARIA state
    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const menuButtonId = (await menuButton.getAttribute('id')) || '';
    await expect(page.getByRole('menu')).toHaveAttribute(
      'aria-labelledby',
      menuButtonId,
    );

    // Close menu and check ARIA state
    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('menu works on mobile viewport', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await welcomePage.gotoHome();

    // Menu button should be visible and functional
    const menuButton = page.getByTestId('marketing-menu-button');
    await expect(menuButton).toBeVisible();

    // Menu text should be visible (the expandOnHover functionality shows it)
    await expect(menuButton.getByText('Menu')).toBeVisible();

    // Open menu
    await menuButton.click();
    await expect(page.getByRole('menu')).toBeVisible();

    // All links should still be present
    const expectedLinks = ['Integrations', 'FAQ', 'Guides', 'Changelog'];
    for (const link of expectedLinks) {
      await expect(page.getByRole('menuitem', { name: link })).toBeVisible();
    }
  });

  test('menu dropdown positioning and styling', async ({ page }) => {
    // Open menu
    await page.getByTestId('marketing-menu-button').click();
    await expect(page.getByRole('menu')).toBeVisible();

    // Check dropdown has proper styling classes
    const menuDropdown = page.getByRole('menu');
    const menuClasses = (await menuDropdown.getAttribute('class')) || '';
    expect(menuClasses).toContain('rounded-3xl');
    expect(menuClasses).toContain('border');
    expect(menuClasses).toContain('shadow-2xl');
    expect(menuClasses).toContain('backdrop-blur');

    // Check header section
    await expect(page.getByText('Explore SprintJam')).toBeVisible();
    await expect(page.getByText('Jump to the essentials.')).toBeVisible();

    // Check action buttons section
    await expect(
      page.getByRole('button', { name: 'Create a room' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Join a session' }),
    ).toBeVisible();
  });
});
