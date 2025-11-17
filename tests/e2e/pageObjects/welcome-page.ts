import { expect, type Page } from '@playwright/test';

import { BasePage } from './base-page';

export class WelcomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoHome() {
    await this.goto('/');
    await expect(this.page.getByTestId('create-room-button')).toBeVisible();
  }

  async gotoWithInvite(roomKey: string) {
    await this.goto(`/?join=${roomKey}`);
    await expect(this.page.getByTestId('join-room-submit')).toBeVisible();
  }

  async startCreateRoom() {
    await this.page.getByTestId('create-room-button').click();
  }

  async startJoinRoom() {
    await this.page.getByTestId('join-room-button').click();
  }
}
