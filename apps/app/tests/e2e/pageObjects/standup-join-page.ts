import { expect, type Page } from "@playwright/test";

import { BasePage } from "./base-page";

export class StandupJoinPage extends BasePage {
  private enteredName: string | null = null;
  private enteredPasscode: string | null = null;

  constructor(page: Page) {
    super(page);
  }

  async goto(standupKey?: string) {
    const path = standupKey ? `/standup/join/${standupKey}` : "/standup/join";
    await this.page.goto(path);
    await expect(this.page.locator("#standup-join-name")).toBeVisible();
    if (standupKey) {
      await expect(this.page.locator("#standup-join-key")).toHaveValue(
        standupKey,
      );
    }
  }

  async fillName(name: string) {
    this.enteredName = name;
    const nameInput = this.page.locator("#standup-join-name");
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);
  }

  async fillKey(key: string) {
    const keyInput = this.page.locator("#standup-join-key");
    await keyInput.fill(key);
    await expect(keyInput).toHaveValue(key);
  }

  async fillPasscode(passcode: string) {
    this.enteredPasscode = passcode;
    const passcodeInput = this.page.locator("#standup-join-passcode");
    await passcodeInput.fill(passcode);
    await expect(passcodeInput).toHaveValue(passcode);
  }

  async submit() {
    const button = this.page.getByRole("button", { name: /join standup/i });
    await expect(async () => {
      if (this.enteredName) {
        const nameInput = this.page.locator("#standup-join-name");
        await nameInput.fill(this.enteredName);
        await expect(nameInput).toHaveValue(this.enteredName);
      }

      if (this.enteredPasscode !== null) {
        const passcodeInput = this.page.locator("#standup-join-passcode");
        await passcodeInput.fill(this.enteredPasscode);
        await expect(passcodeInput).toHaveValue(this.enteredPasscode);
      }

      await expect(button).toBeEnabled();
    }).toPass();
    await button.click();
  }

  async waitForRoom() {
    await expect(this.page.getByTestId("standup-room")).toBeVisible();
  }

  async expectAlertMessage(message: string | RegExp) {
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
