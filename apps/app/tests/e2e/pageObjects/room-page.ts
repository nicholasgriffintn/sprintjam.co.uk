import { expect, type Locator, type Page } from "@playwright/test";

export class RoomPage {
  constructor(private readonly page: Page) {}

  async waitForLoaded() {
    await expect(this.page.getByTestId("participants-panel")).toBeVisible();
  }

  getPage() {
    return this.page;
  }

  async getRoomKey(): Promise<string> {
    const key = await this.page.getByTestId("room-key-value").textContent();
    if (!key) {
      throw new Error("Room key not found");
    }
    return key.trim();
  }

  participantRows(): Locator {
    return this.page
      .getByTestId("participants-list")
      .getByTestId("participant-row");
  }

  async waitForParticipants(count: number) {
    await expect(this.participantRows()).toHaveCount(count);
  }

  async castVote(option: string | number) {
    const voteOption = this.page.getByTestId(`vote-option-${option}`);
    await expect(voteOption).toBeVisible();
    await expect(voteOption).toBeEnabled({ timeout: 10_000 });
    await voteOption.click();
  }

  async expectVoteOptionVisible(option: string | number) {
    await expect(this.page.getByTestId(`vote-option-${option}`)).toBeVisible();
  }

  async expectVoteOptionHidden(option: string | number) {
    await expect(this.page.getByTestId(`vote-option-${option}`)).toHaveCount(0);
  }

  async expectStructuredPanelVisible() {
    await expect(
      this.page.getByTestId("structured-voting-panel"),
    ).toBeVisible();
  }

  async expectVotePendingState() {
    const panel = this.page.getByTestId("votes-hidden-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(
      /(Waiting for (the )?moderator to reveal|You haven't voted yet)/,
    );
  }

  async revealVotes() {
    await this.page.getByTestId("toggle-votes-button").click();
  }

  async expectVotesHiddenMessage(expected: string) {
    await expect(this.page.getByTestId("votes-hidden-panel")).toContainText(
      expected,
    );
  }

  async expectVoteVisible(_participantName: string, expectedValue: string) {
    await expect(this.page.getByTestId("results-panel")).toContainText(
      expectedValue,
    );
  }

  async expectResultsVisible() {
    await expect(this.page.getByTestId("results-panel")).toBeVisible();
  }

  async resetVotes() {
    await this.page.getByTestId("reset-votes-button").click();
  }

  async expectParticipantVisible(name: string) {
    const participantRow = this.page
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(participantRow).toHaveCount(1);
  }

  async openShareModal() {
    await this.page.getByRole("button", { name: /share/i }).click();
    await expect(
      this.page.getByRole("dialog", { name: "Share Room" }),
    ).toBeVisible();
  }

  async expectShareLink(roomKey: string) {
    const dialog = this.page.getByRole("dialog", { name: "Share Room" });
    const shareInput = dialog.locator('input[type="text"]');
    await expect(shareInput).toHaveValue(new RegExp(`${roomKey}$`));
    await expect(
      dialog.getByText("Share this link with your team:"),
    ).toBeVisible();
  }

  async closeShareModal() {
    const dialog = this.page.getByRole("dialog", { name: "Share Room" });
    await dialog.getByRole("button", { name: "Close modal" }).click();
    await expect(dialog).toBeHidden();
  }

  async leaveRoom() {
    await this.page.getByRole("button", { name: /leave room/i }).click();
  }

  async expectOnWelcomeScreen() {
    await expect(this.page.getByTestId("create-room-button")).toBeVisible();
  }

  async expectParticipantConnectionState(name: string, connected: boolean) {
    const connectedIndicator = this.page.locator(
      `[data-participant-name="${name}"] .border-emerald-300`,
    );
    if (connected) {
      await expect(connectedIndicator).toHaveCount(1);
    } else {
      await expect(connectedIndicator).toHaveCount(0);
    }
  }

  async openSettingsModal() {
    await this.page.getByRole("button", { name: /settings/i }).click();
    await expect(
      this.page.getByRole("dialog", { name: "Room Settings" }),
    ).toBeVisible();
  }

  async expectTimerVisible() {
    await expect(this.page.getByTestId("room-timer")).toBeVisible();
  }

  async expectParticipantNameHidden(name: string) {
    const row = this.page.locator(`[data-participant-name="${name}"]`);
    await expect(row.getByText(name)).toHaveCount(0);
  }

  async expectToggleVotesButtonVisible(isVisible = true) {
    const button = this.page.getByTestId("toggle-votes-button");
    if (isVisible) {
      await expect(button).toBeVisible();
    } else {
      await expect(button).toHaveCount(0);
    }
  }

  async reload() {
    await this.page.reload();
    await this.waitForLoaded();
  }

  async openQueueModal() {
    await this.page.getByTestId("queue-expand").click();
    await expect(
      this.page.getByRole("dialog", { name: "Ticket Queue" }),
    ).toBeVisible();
  }

  async expectQueueManageControlsVisible(isVisible: boolean) {
    const addButton = this.page.getByTestId("queue-toggle-add");
    if (isVisible) {
      await expect(addButton).toBeVisible();
    } else {
      await expect(addButton).toHaveCount(0);
    }
  }

  async expectQueueCurrentTicketContains(text: string) {
    await expect(this.page.getByTestId("queue-current-ticket")).toContainText(
      text,
    );
  }

  async expectQueueEmptyState() {
    await expect(
      this.page.getByText("No pending tickets", { exact: false }),
    ).toBeVisible();
  }

  async expectVoteButtonDisabled(option: string | number) {
    const button = this.page.getByTestId(`vote-option-${option}`);
    await expect(button).toBeDisabled();
  }

  async openTimerControls() {
    const trigger = this.page
      .getByTestId("room-timer")
      .locator('button[aria-haspopup="true"]')
      .first();
    await trigger.click();
    await expect(this.page.getByTestId("timer-controls")).toBeVisible();
  }

  async startTimer() {
    await this.openTimerControls();
    const controls = this.page.getByTestId("timer-controls");
    const startButton = controls.getByRole("button", { name: /start timer/i });
    if (await startButton.isVisible()) {
      await startButton.click();
    }
  }

  async pauseTimer() {
    await this.openTimerControls();
    const controls = this.page.getByTestId("timer-controls");
    const pauseButton = controls.getByRole("button", { name: /pause timer/i });
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
    }
  }

  async resetTimerCountdown() {
    await this.openTimerControls();
    await this.page
      .getByTestId("timer-controls")
      .getByRole("button", { name: /Reset timer/i })
      .click();
    await expect(this.page.getByTestId("timer-controls")).toBeHidden();
    const label =
      (await this.page
        .getByTestId("room-timer")
        .locator('button[aria-haspopup="true"]')
        .first()
        .getAttribute("aria-label")) ?? "";
    expect(label).toContain("00:00");
  }

  async selectTimerPreset(label: string) {
    await this.openTimerControls();
    await this.page
      .getByTestId("timer-controls")
      .getByRole("button", { name: label })
      .click();
  }

  async expectTimerLabelContains(text: string | RegExp) {
    const label = await this.page
      .getByTestId("room-timer")
      .locator('button[aria-haspopup="true"]')
      .first()
      .getAttribute("aria-label");
    expect(label ?? "").toMatch(text);
  }

  async toggleSpectatorMode() {
    await this.page.getByTestId("toggle-spectator-button").click();
  }

  async expectSpectatorListVisible() {
    await expect(this.page.getByTestId("spectators-list")).toBeVisible();
  }

  async expectSpectatorVisible(name: string) {
    const spectatorsList = this.page.getByTestId("spectators-list");
    const spectatorRow = spectatorsList
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(spectatorRow).toHaveCount(1);
  }

  async expectParticipantNotInSpectators(name: string) {
    const spectatorsList = this.page.getByTestId("spectators-list");
    const spectatorRow = spectatorsList
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(spectatorRow).toHaveCount(0);
  }

  async expectParticipantNotInParticipantsList(name: string) {
    const participantsList = this.page.getByTestId("participants-list");
    const participantRow = participantsList
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(participantRow).toHaveCount(0);
  }

  spectatorRows(): Locator {
    return this.page
      .getByTestId("spectators-list")
      .getByTestId("participant-row");
  }

  async waitForSpectators(count: number) {
    if (count === 0) {
      await expect(this.page.getByTestId("spectators-list")).toHaveCount(0);
    } else {
      await expect(this.spectatorRows()).toHaveCount(count);
    }
  }

  async expectVotingDisabled() {
    const voteButtons = this.page.locator('[data-testid^="vote-option-"]');
    const count = await voteButtons.count();
    for (let i = 0; i < count; i++) {
      await expect(voteButtons.nth(i)).toBeDisabled();
    }
  }
}
