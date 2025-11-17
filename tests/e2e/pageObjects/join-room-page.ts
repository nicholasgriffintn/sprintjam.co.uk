import { expect, type Page } from '@playwright/test';

export class JoinRoomPage {
  constructor(private readonly page: Page) {}

  async completeParticipantDetails({
    name,
    roomKey,
  }: {
    name: string;
    roomKey: string;
  }) {
    await this.page.locator('#join-name').fill(name);
    await this.page.locator('#join-room-key').fill(roomKey);
    const continueButton = this.page.getByTestId('join-room-submit');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async selectAvatarAndJoin(testId = 'avatar-option-bird') {
    await this.page.getByTestId(testId).first().click();
    const joinButton = this.page.getByTestId('join-room-submit');
    await expect(joinButton).toBeEnabled();
    await joinButton.click();
  }
}
