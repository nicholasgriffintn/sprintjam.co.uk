import { expect, type Locator, type Page } from '@playwright/test';

export class RoomPage {
  constructor(private readonly page: Page) {}

  async waitForLoaded() {
    await expect(this.page.getByTestId('participants-panel')).toBeVisible();
  }

  async getRoomKey(): Promise<string> {
    const key = await this.page.getByTestId('room-key-value').textContent();
    if (!key) {
      throw new Error('Room key not found');
    }
    return key.trim();
  }

  participantRows(): Locator {
    return this.page.getByTestId('participant-row');
  }

  async waitForParticipants(count: number) {
    await expect(this.participantRows()).toHaveCount(count);
  }

  async castVote(option: string | number) {
    await this.page.getByTestId(`vote-option-${option}`).click();
  }

  async expectVotePendingState() {
    await this.expectVotesHiddenMessage('Votes are hidden');
  }

  async revealVotes() {
    await this.page.getByTestId('toggle-votes-button').click();
  }

  async expectVotesHiddenMessage(expected: string) {
    await expect(this.page.getByTestId('votes-hidden-panel')).toContainText(
      expected
    );
  }

  async expectVoteVisible(_participantName: string, expectedValue: string) {
    await expect(this.page.getByTestId('results-panel')).toContainText(
      expectedValue
    );
  }

  async expectResultsVisible() {
    await expect(this.page.getByTestId('results-panel')).toBeVisible();
  }

  async resetVotes() {
    await this.page.getByTestId('reset-votes-button').click();
  }

  async expectParticipantVisible(name: string) {
    const participantRow = this.page
      .getByTestId('participant-row')
      .filter({ hasText: name });
    await expect(participantRow).toHaveCount(1);
  }

  async openShareModal() {
    await this.page.getByRole('button', { name: /share/i }).click();
    await expect(
      this.page.getByRole('dialog', { name: 'Share Room' })
    ).toBeVisible();
  }

  async expectShareLink(roomKey: string) {
    const dialog = this.page.getByRole('dialog', { name: 'Share Room' });
    const shareInput = dialog.locator('input[type="text"]');
    await expect(shareInput).toHaveValue(new RegExp(`${roomKey}$`));
    await expect(dialog.getByText('Share this link with your team:')).toBeVisible();
  }

  async closeShareModal() {
    const dialog = this.page.getByRole('dialog', { name: 'Share Room' });
    await dialog.getByRole('button', { name: 'Close modal' }).click();
    await expect(dialog).toBeHidden();
  }

  async leaveRoom() {
    await this.page.getByRole('button', { name: /leave room/i }).click();
  }

  async expectOnWelcomeScreen() {
    await expect(this.page.getByTestId('create-room-button')).toBeVisible();
  }

  async expectParticipantConnectionState(
    name: string,
    connected: boolean
  ) {
    const connectedIndicator = this.page.locator(
      `[data-participant-name="${name}"] .border-emerald-300`
    );
    if (connected) {
      await expect(connectedIndicator).toHaveCount(1);
    } else {
      await expect(connectedIndicator).toHaveCount(0);
    }
  }
}
