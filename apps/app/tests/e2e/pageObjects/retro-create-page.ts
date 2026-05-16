import { expect, type Page } from "@playwright/test";

import { BasePage } from "./base-page";

export class RetroCreatePage extends BasePage {
  private enteredName: string | null = null;
  private enteredPasscode: string | null = null;

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/retro/create");
    await expect(this.page.locator("#retro-create-name")).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /create retro/i }),
    ).toBeDisabled();
  }

  async fillName(name: string) {
    this.enteredName = name;
    const nameInput = this.page.locator("#retro-create-name");
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);
  }

  async fillPasscode(passcode: string) {
    this.enteredPasscode = passcode;
    const passcodeInput = this.page.locator("#retro-create-passcode");
    await passcodeInput.fill(passcode);
    await expect(passcodeInput).toHaveValue(passcode);
  }

  async submit() {
    const button = this.page.getByRole("button", { name: /create retro/i });
    await expect(async () => {
      if (this.enteredName) {
        const nameInput = this.page.locator("#retro-create-name");
        await nameInput.fill(this.enteredName);
        await expect(nameInput).toHaveValue(this.enteredName);
      }

      if (this.enteredPasscode !== null) {
        const passcodeInput = this.page.locator("#retro-create-passcode");
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
}
