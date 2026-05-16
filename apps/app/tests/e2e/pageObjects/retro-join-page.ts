import { expect, type Page } from "@playwright/test";

import { BasePage } from "./base-page";

export class RetroJoinPage extends BasePage {
  private enteredName: string | null = null;
  private enteredKey: string | null = null;
  private enteredPasscode: string | null = null;

  constructor(page: Page) {
    super(page);
  }

  async goto(retroKey?: string) {
    const path = retroKey ? `/retro/join/${retroKey}` : "/retro/join";
    await this.page.goto(path);
    await expect(this.page.locator("#retro-join-name")).toBeVisible();
    if (retroKey) {
      await expect(this.page.locator("#retro-join-key")).toHaveValue(retroKey);
    }
  }

  async fillName(name: string) {
    this.enteredName = name;
    const nameInput = this.page.locator("#retro-join-name");
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);
  }

  async fillKey(retroKey: string) {
    this.enteredKey = retroKey;
    const keyInput = this.page.locator("#retro-join-key");
    await keyInput.fill(retroKey);
    await expect(keyInput).toHaveValue(retroKey);
  }

  async fillPasscode(passcode: string) {
    this.enteredPasscode = passcode;
    const passcodeInput = this.page.locator("#retro-join-passcode");
    await passcodeInput.fill(passcode);
    await expect(passcodeInput).toHaveValue(passcode);
  }

  async submit() {
    const button = this.page.getByRole("button", { name: /join retro/i });
    await expect(async () => {
      if (this.enteredName) {
        const nameInput = this.page.locator("#retro-join-name");
        await nameInput.fill(this.enteredName);
        await expect(nameInput).toHaveValue(this.enteredName);
      }

      if (this.enteredKey) {
        const keyInput = this.page.locator("#retro-join-key");
        await keyInput.fill(this.enteredKey);
        await expect(keyInput).toHaveValue(this.enteredKey);
      }

      if (this.enteredPasscode !== null) {
        const passcodeInput = this.page.locator("#retro-join-passcode");
        await passcodeInput.fill(this.enteredPasscode);
        await expect(passcodeInput).toHaveValue(this.enteredPasscode);
      }

      await expect(button).toBeEnabled();
    }).toPass({ timeout: 10_000 });
    await button.click();
  }

  async waitForRoom() {
    await expect(this.page.getByTestId("retro-room")).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectAlertMessage(message: string | RegExp) {
    await expect(this.page.getByRole("alert")).toContainText(message, {
      timeout: 10_000,
    });
  }
}
