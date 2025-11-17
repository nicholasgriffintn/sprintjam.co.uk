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
}
