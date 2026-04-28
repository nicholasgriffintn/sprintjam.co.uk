import { expect, type Page } from "@playwright/test";

import { BasePage } from "./base-page";

export class StandupCreatePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/standup/create");
    await expect(this.page.locator("#standup-create-name")).toBeVisible();
  }

  async fillName(name: string) {
    await this.page.locator("#standup-create-name").fill(name);
  }

  async fillPasscode(passcode: string) {
    await this.page.locator("#standup-create-passcode").fill(passcode);
  }

  async submit() {
    const button = this.page.getByRole("button", { name: /create standup/i });
    await expect(button).toBeEnabled();
    await button.click();
  }

  async waitForRoom() {
    await expect(this.page.getByTestId("standup-room")).toBeVisible({
      timeout: 15_000,
    });
  }
}
