import { expect, type Page } from "@playwright/test";

export class JoinRoomPage {
  constructor(private readonly page: Page) {}

  async completeParticipantDetails({
    name,
    roomKey,
    passcode,
  }: {
    name: string;
    roomKey?: string;
    passcode?: string;
  }) {
    await this.page.locator("#join-name").fill(name);
    if (roomKey) {
      await this.page.locator("#join-room-key").fill(roomKey);
    }
    if (typeof passcode === "string") {
      await this.page.locator("#join-passcode").fill(passcode);
    }
    const continueButton = this.page.getByTestId("join-room-submit");
    if (await continueButton.isEnabled()) {
      await continueButton.click();
    }
  }

  async selectAvatarAndJoin(testId = "avatar-option-bird") {
    await this.page.getByTestId(testId).first().click();
    const joinButton = this.page.getByTestId("join-room-submit");
    await expect(joinButton).toBeEnabled();
    await joinButton.click();
  }

  async selectAvatarOnlyAndJoin(testId = "avatar-option-robot") {
    await this.page.getByTestId(testId).first().click();
    const joinButton = this.page.getByTestId("join-room-submit");
    await expect(joinButton).toBeEnabled();
    await joinButton.click();
  }

  async updatePasscode(passcode: string) {
    await this.page.locator("#join-passcode").fill(passcode);
  }

  async expectAlertMessage(message: string) {
    await expect(this.page.getByRole("alert")).toContainText(message);
  }
}
