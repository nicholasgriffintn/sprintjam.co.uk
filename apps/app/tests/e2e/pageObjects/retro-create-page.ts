import { expect, type Page } from "@playwright/test";

import { enterTextField } from "../helpers/form-fields";
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
    await enterTextField(this.page.locator("#retro-create-name"), name);
  }

  async fillPasscode(passcode: string) {
    this.enteredPasscode = passcode;
    await enterTextField(this.page.locator("#retro-create-passcode"), passcode);
  }

  async submit() {
    const button = this.page.getByRole("button", { name: /create retro/i });
    await expect(async () => {
      if (this.enteredName) {
        await enterTextField(
          this.page.locator("#retro-create-name"),
          this.enteredName,
        );
      }

      if (this.enteredPasscode !== null) {
        await enterTextField(
          this.page.locator("#retro-create-passcode"),
          this.enteredPasscode,
        );
      }

      await expect(button).toBeEnabled();
    }).toPass();
    await button.click();
  }

  async waitForRoom() {
    await expect(this.page.getByTestId("retro-room")).toBeVisible({
      timeout: 15_000,
    });
  }
}
