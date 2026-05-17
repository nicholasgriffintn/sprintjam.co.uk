import { expect, type Page } from "@playwright/test";

import { enterTextField } from "../helpers/form-fields";
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
      this.enteredKey = retroKey;
      await expect(this.page.locator("#retro-join-key")).toHaveValue(retroKey);
    }
  }

  async fillName(name: string) {
    this.enteredName = name;
    await enterTextField(this.page.locator("#retro-join-name"), name);
  }

  async fillKey(retroKey: string) {
    this.enteredKey = retroKey;
    await enterTextField(this.page.locator("#retro-join-key"), retroKey);
  }

  async fillPasscode(passcode: string) {
    this.enteredPasscode = passcode;
    await enterTextField(this.page.locator("#retro-join-passcode"), passcode);
  }

  async submit() {
    const button = this.page.getByRole("button", { name: /join retro/i });
    await expect(async () => {
      if (this.enteredName) {
        await enterTextField(
          this.page.locator("#retro-join-name"),
          this.enteredName,
        );
      }

      if (this.enteredKey) {
        await enterTextField(
          this.page.locator("#retro-join-key"),
          this.enteredKey,
        );
      }

      if (this.enteredPasscode !== null) {
        await enterTextField(
          this.page.locator("#retro-join-passcode"),
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

  async expectAlertMessage(message: string | RegExp) {
    await expect(this.page.getByRole("alert")).toContainText(message);
  }
}
