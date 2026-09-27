import { expect, type Locator, type Page } from "@playwright/test";

export async function clickToNavigate(
  page: Page,
  button: Locator,
  destination: RegExp,
) {
  await expect(async () => {
    if ((await button.isVisible()) && (await button.isEnabled())) {
      await button.click();
    }
    await expect(page).toHaveURL(destination);
  }).toPass();
}
