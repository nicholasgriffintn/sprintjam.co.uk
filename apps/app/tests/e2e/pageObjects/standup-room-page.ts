import { expect, type Page } from "@playwright/test";

export class StandupRoomPage {
  constructor(private readonly page: Page) {}

  private async ensureResponseTab() {
    const responseTab = this.page.getByTestId("standup-tab-response");
    if (await responseTab.isVisible()) {
      await responseTab.click();
    }
  }

  async waitForLoaded() {
    await expect(this.page.getByTestId("standup-room")).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByTestId("participants-panel")).toBeVisible({
      timeout: 15_000,
    });
  }

  async dismissRecoveryPasskeyModalIfPresent() {
    const toastClose = this.page.getByLabel("Close notification");
    if (await toastClose.isVisible()) {
      await toastClose.click();
      return;
    }

    const legacyButton = this.page.getByRole("button", { name: /got it/i });
    if (await legacyButton.isVisible()) {
      await legacyButton.click();
    }
  }

  async getRoomKey(): Promise<string> {
    const keyEl = this.page.getByTestId("standup-room-key");
    await expect(keyEl).toBeVisible({ timeout: 10_000 });
    const text = await keyEl.textContent();
    if (!text) throw new Error("Standup room key not found in header");
    return text.trim();
  }

  async switchToResponseTab() {
    await this.page.getByTestId("standup-tab-response").click();
  }

  async switchToResultsTab() {
    await this.page.getByTestId("standup-tab-results").click();
  }

  async setAttendance(mode: "in-person" | "remote") {
    await this.ensureResponseTab();
    const label =
      mode === "in-person"
        ? /^attending the meeting$/i
        : /^not attending the meeting$/i;
    await this.page.getByRole("button", { name: label }).click();
  }

  async fillYesterday(text: string) {
    await this.ensureResponseTab();
    const field = this.page.locator("#standup-yesterday");
    await expect(field).toBeVisible({ timeout: 5_000 });
    await field.fill(text);
  }

  async fillToday(text: string) {
    await this.ensureResponseTab();
    const field = this.page.locator("#standup-today");
    await expect(field).toBeVisible({ timeout: 5_000 });
    await field.fill(text);
  }

  async setBlocker(hasBlocker: boolean) {
    await this.ensureResponseTab();
    const label = hasBlocker ? /i have blockers/i : /no blockers/i;
    await this.page.getByRole("button", { name: label }).click();
  }

  async fillBlockerDescription(text: string) {
    await this.ensureResponseTab();
    const field = this.page.locator("#standup-blocker");
    await expect(field).toBeVisible({ timeout: 5_000 });
    await field.fill(text);
  }

  async submitResponse() {
    await this.ensureResponseTab();
    const button = this.page.getByTestId("standup-submit");
    await expect(button).toBeEnabled({ timeout: 5_000 });
    await button.click();
  }

  async expectResponseSubmitted() {
    await this.switchToResponseTab();
    await expect(
      this.page.getByRole("button", { name: /edit update/i }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectParticipantVisible(name: string) {
    const row = this.page
      .getByTestId("participants-list")
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(row).toHaveCount(1);
  }

  async lockResponses() {
    await this.page.getByRole("button", { name: /lock responses/i }).click();
  }

  async unlockResponses() {
    await this.page.getByRole("button", { name: /unlock responses/i }).click();
  }

  async startPresentation() {
    await this.page
      .getByRole("button", { name: /start presentation/i })
      .click();
  }

  async completeStandup() {
    await this.page.getByRole("button", { name: /complete standup/i }).click();
  }

  async expectPresentationMode() {
    await expect(
      this.page.getByRole("button", { name: /complete standup/i }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectCompletedState() {
    await expect(this.page.getByText(/this standup is complete/i)).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectStatusBadge(
    status: "Active" | "Locked" | "Presenting" | "Completed",
  ) {
    await expect(
      this.page.getByRole("banner").getByText(status, { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  }

  getPage() {
    return this.page;
  }
}
