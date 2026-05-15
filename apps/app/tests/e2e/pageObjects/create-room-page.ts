import { expect, type Page } from "@playwright/test";

export class CreateRoomPage {
  private enteredName: string | null = null;
  private enteredPasscode: string | null = null;

  constructor(private readonly page: Page) {}

  async fillBasics(name: string, passcode?: string, isSignedIn = false) {
    if (!isSignedIn) {
      this.enteredName = name;
      const nameInput = this.page.locator("#create-name");
      await expect(nameInput).toBeVisible();
      await nameInput.fill(name);
      await expect(nameInput).toHaveValue(name);
    }

    if (typeof passcode === "string") {
      this.enteredPasscode = passcode;
      const passcodeInput = this.page.locator("#create-passcode");
      await expect(passcodeInput).toBeVisible();
      await passcodeInput.fill(passcode);
      await expect(passcodeInput).toHaveValue(passcode);
    }
  }

  async selectWorkspaceTeam(teamId, isSignedIn = false) {
    if (!isSignedIn) {
      return;
    }

    const teamSelect = this.page.locator("#team-select");
    await expect(teamSelect).toBeVisible();
    await teamSelect.selectOption(teamId.toString());
  }

  async startInstantRoom() {
    const instantButton = this.page.getByTestId("create-room-submit");
    await expect(async () => {
      if (this.enteredName) {
        const nameInput = this.page.locator("#create-name");
        await nameInput.fill(this.enteredName);
        await expect(nameInput).toHaveValue(this.enteredName);
      }

      if (this.enteredPasscode !== null) {
        const passcodeInput = this.page.locator("#create-passcode");
        await passcodeInput.fill(this.enteredPasscode);
        await expect(passcodeInput).toHaveValue(this.enteredPasscode);
      }

      await expect(instantButton).toBeEnabled();
    }).toPass({ timeout: 10_000 });
    await instantButton.click();
    await expect(instantButton).toBeHidden();
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
