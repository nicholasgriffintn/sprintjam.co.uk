import { expect, type Page } from "@playwright/test";

export class CreateRoomPage {
  constructor(private readonly page: Page) {}

  async fillBasics(name: string, passcode?: string) {
    await this.page.locator("#create-name").fill(name);
    if (typeof passcode === "string") {
      await this.page.locator("#create-passcode").fill(passcode);
    }
  }

  async selectWorkspaceTeam(teamId: number) {
    const teamSelect = this.page.locator("#team-select");
    await expect(teamSelect).toBeVisible();
    await teamSelect.selectOption(teamId.toString());
  }

  async selectPersonalRoomIfAvailable() {
    const teamSelect = this.page.locator("#team-select");
    await teamSelect.waitFor({ state: "attached", timeout: 1_000 }).catch(() => {
      // No team selector means auth teams are unavailable for this flow.
    });

    if ((await teamSelect.count()) === 0) {
      return;
    }

    await expect(teamSelect).toBeVisible();
    await teamSelect.selectOption("none");
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
