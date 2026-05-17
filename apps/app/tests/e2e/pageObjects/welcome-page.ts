import { expect, type Page } from "@playwright/test";

import { BasePage } from "./base-page";

export class WelcomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoHome() {
    await this.goto("/");
    await expect(this.page.getByTestId("create-room-button")).toBeVisible();
  }

  async gotoWithInvite(roomKey: string) {
    await this.goto(`/room/${roomKey}`);
    await expect(this.page.locator("#join-room-key")).toHaveValue(roomKey);
    await expect(this.page.getByTestId("join-room-submit")).toBeVisible();
  }

  async startCreateRoom() {
    const button = this.page.getByTestId("create-room-button");
    await expect(async () => {
      await expect(button).toBeEnabled();
      await button.click();
      await expect(this.page).toHaveURL(/\/create$/);
    }).toPass();
    await expect(this.page.getByTestId("create-room-submit")).toBeVisible();
  }

  async startJoinRoom() {
    const button = this.page.getByTestId("join-room-button");
    await expect(async () => {
      await expect(button).toBeEnabled();
      await button.click();
      await expect(this.page).toHaveURL(/\/join$/);
    }).toPass();
    await expect(this.page.getByTestId("join-room-submit")).toBeVisible();
  }

  async openWheelFromSprintFlow() {
    await this.page.getByTestId("homepage-flow-wheel").click();
  }

  async openStandupFromSprintFlow() {
    await this.page.getByTestId("homepage-flow-standup").click();
  }
}
