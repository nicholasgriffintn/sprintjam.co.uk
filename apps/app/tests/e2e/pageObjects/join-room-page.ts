import { expect, type Page } from "@playwright/test";

export class JoinRoomPage {
  constructor(private readonly page: Page) {}

  private async submitCurrentStep() {
    const submitButton = this.page.getByTestId("join-room-submit");
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

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
    await expect(this.page.locator("#join-name")).toHaveValue(name);
    if (roomKey) {
      await this.page.locator("#join-room-key").fill(roomKey);
      await expect(this.page.locator("#join-room-key")).toHaveValue(roomKey);
    }
    if (typeof passcode === "string") {
      await this.page.locator("#join-passcode").fill(passcode);
      await expect(this.page.locator("#join-passcode")).toHaveValue(passcode);
    }
    await this.submitCurrentStep();
  }

  async selectAvatarAndJoin(testId = "avatar-option-bird") {
    const avatarOption = this.page.getByTestId(testId).first();
    await expect(avatarOption).toBeVisible();
    await avatarOption.click();
    await this.submitCurrentStep();
  }

  async selectAvatarOnlyAndJoin(testId = "avatar-option-robot") {
    await this.selectAvatarAndJoin(testId);
  }

  async updatePasscode(passcode: string) {
    await this.page.locator("#join-passcode").fill(passcode);
  }

  async expectAlertMessage(message: string) {
    await expect(this.page.getByRole("alert")).toContainText(message);
  }
}
