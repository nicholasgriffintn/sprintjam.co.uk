import { expect, type Page } from "@playwright/test";

export class CreateRoomPage {
  constructor(private readonly page: Page) {}

  async fillBasics(name: string, passcode?: string, isSignedIn = false) {
    if (!isSignedIn) {
      const nameInput = this.page.locator("#create-name");
      await expect(nameInput).toBeVisible();
      await nameInput.fill(name);
    }

    if (typeof passcode === "string") {
      const passcodeInput = this.page.locator("#create-passcode");
      await expect(passcodeInput).toBeVisible();
      await passcodeInput.fill(passcode);
    }
  }

  async selectWorkspaceTeam(teamId: number = 0, isSignedIn = false) {
    if (!isSignedIn || teamId === 0) {
      return;
    }

    const teamSelect = this.page.locator("#team-select");
    await expect(teamSelect).toBeVisible();
    await teamSelect.selectOption(teamId.toString());
  }

  async startInstantRoom() {
    const instantButton = this.page.getByTestId("create-room-submit");
    await expect(instantButton).toBeEnabled();
    await instantButton.click();
  }

  async enableStructuredVoting() {
    const toggle = this.page.getByTestId("create-voting-mode");
    const isEnabled = await toggle.getAttribute("aria-checked");
    if (isEnabled !== "true") {
      await toggle.click();
    }
  }

  async openAdvancedSetup() {
    await this.page.getByTestId("create-room-advanced").click();
  }

  async continueAdvancedSetup() {
    await this.page.getByTestId("create-advanced-continue").click();
  }
}
