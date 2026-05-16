import { expect, type Page } from "@playwright/test";

import { enterTextField } from "../helpers/form-fields";

export class CreateRoomPage {
  private enteredName: string | null = null;
  private enteredPasscode: string | null = null;

  constructor(private readonly page: Page) {}

  async fillBasics(name: string, passcode?: string, isSignedIn = false) {
    if (!isSignedIn) {
      this.enteredName = name;
      await enterTextField(this.page.locator("#create-name"), name);
    }

    if (typeof passcode === "string") {
      this.enteredPasscode = passcode;
      await enterTextField(this.page.locator("#create-passcode"), passcode);
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
    if (this.enteredName) {
      await expect(this.page.locator("#create-name")).toHaveValue(
        this.enteredName,
      );
    }

    if (this.enteredPasscode !== null) {
      await expect(this.page.locator("#create-passcode")).toHaveValue(
        this.enteredPasscode,
      );
    }

    await this.page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
    await expect(instantButton).toBeEnabled();
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
