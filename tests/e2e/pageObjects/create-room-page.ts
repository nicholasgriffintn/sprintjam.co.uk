import { expect, type Page } from '@playwright/test';

export class CreateRoomPage {
  constructor(private readonly page: Page) {}

  async completeNameStep(name: string) {
    await this.page.locator('#create-name').fill(name);
    const continueButton = this.page.getByTestId('create-room-submit');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async selectAvatar(testId = 'avatar-option-robot') {
    await this.page.getByTestId(testId).first().click();
    const continueButton = this.page.getByTestId('create-room-submit');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async finishCreation() {
    const createButton = this.page.getByTestId('create-room-submit');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    await createButton.click();
  }
}
