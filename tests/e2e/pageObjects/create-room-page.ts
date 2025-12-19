import { expect, type Page } from "@playwright/test";

export class CreateRoomPage {
  constructor(private readonly page: Page) {}

  async fillBasics(name: string, passcode?: string) {
    await this.page.locator("#create-name").fill(name);
    if (typeof passcode === "string") {
      await this.page.locator("#create-passcode").fill(passcode);
    }
  }

  async startInstantRoom() {
    const instantButton = this.page.getByTestId("create-room-submit");
    await expect(instantButton).toBeEnabled();
    await instantButton.click();
  }

  async openAdvancedSetup() {
    await this.page.getByTestId("create-room-advanced").click();
  }

  async enableStructuredVotingInAdvanced() {
    const toggle = this.page.getByTestId("settings-toggle-structured-voting");
    const isChecked = await toggle.isChecked();
    if (!isChecked) {
      await toggle.check({ force: true });
    }
  }

  async continueAdvancedSetup() {
    await this.page.getByTestId("create-advanced-continue").click();
  }
}
