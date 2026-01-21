import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const MODERATOR_NAME = 'Wheel QA';
const GUEST_NAME = 'Guest QA';

const setUserName = async (target: Page | BrowserContext, name: string) => {
  await target.addInitScript((storedName) => {
    localStorage.setItem('sprintjam_username', storedName);
  }, name);
};

const getWheelKeyFromUrl = (url: string) => {
  const match = url.match(/\/wheel\/([^/]+)$/);
  return match?.[1];
};

const waitForWheelReady = async (page: Page) => {
  const entriesInput = page.getByPlaceholder('Enter names, one per line...');
  await expect(entriesInput).toBeVisible({ timeout: 15_000 });
  await expect(entriesInput).toBeEnabled();
  return entriesInput;
};

test.describe('Wheel journey', () => {
  test('moderator can add entries and spin', async ({ page }) => {
    await setUserName(page, MODERATOR_NAME);

    await page.goto('/wheel');
    await page.waitForURL('**/wheel/**');

    const entriesInput = await waitForWheelReady(page);
    await entriesInput.fill('Alpha\nBeta\nGamma');

    await expect(page.getByText('3 entries on wheel')).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId('wheel-canvas').click();

    await page.getByRole('button', { name: 'Results' }).click();
    await expect(page.getByText('1 total')).toBeVisible({ timeout: 15_000 });
  });

  test('participant sees entries read-only', async ({ page, browser }) => {
    await setUserName(page, MODERATOR_NAME);

    await page.goto('/wheel');
    await page.waitForURL('**/wheel/**');

    const entriesInput = await waitForWheelReady(page);
    await entriesInput.fill('Alpha\nBeta');
    await expect(page.getByText('2 entries on wheel')).toBeVisible({
      timeout: 15_000,
    });

    const wheelKey = getWheelKeyFromUrl(page.url());
    if (!wheelKey) {
      throw new Error('Wheel key missing from URL');
    }

    const guestContext = await browser.newContext();
    await setUserName(guestContext, GUEST_NAME);
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`/wheel/${wheelKey}`);

    await expect(
      guestPage.getByPlaceholder('Enter names, one per line...'),
    ).toHaveCount(0);

    const entriesList = guestPage.getByRole('list').first();
    await expect(entriesList.getByText('Alpha')).toBeVisible({
      timeout: 15_000,
    });
    await expect(entriesList.getByText('Beta')).toBeVisible();

    await guestContext.close();
  });
});
