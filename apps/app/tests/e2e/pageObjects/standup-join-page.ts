import { expect, type Page } from "@playwright/test";

import { BasePage } from "./base-page";

export class StandupJoinPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(standupKey?: string) {
    const path = standupKey ? `/standup/join/${standupKey}` : "/standup/join";
    await this.page.goto(path);
    await expect(this.page.locator("#standup-join-name")).toBeVisible();
  }

  async fillName(name: string) {
    await this.page.locator("#standup-join-name").fill(name);
  }

  async fillKey(key: string) {
    await this.page.locator("#standup-join-key").fill(key);
  }

  async fillPasscode(passcode: string) {
    await this.page.locator("#standup-join-passcode").fill(passcode);
  }

  async submit() {
    const button = this.page.getByRole("button", { name: /join standup/i });
    await expect(button).toBeEnabled();
    await button.click();
  }

  async waitForRoom() {
    await expect(this.page.getByTestId("standup-room")).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectAlertMessage(message: string) {
    await expect(this.page.getByRole("alert")).toContainText(message);
  }

  async fillRecoveryPasskey(passkey: string) {
    await this.page.locator("#standup-recovery-passkey").fill(passkey);
  }

  async recoverSession() {
    const button = this.page.getByRole("button", { name: /recover session/i });
    await expect(button).toBeEnabled();
    await button.click();
  }

  async expectConflictUI() {
    await expect(
      this.page.getByText(/this name is already connected/i),
    ).toBeVisible();
  }
}
