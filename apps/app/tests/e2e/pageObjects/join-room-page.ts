import { expect, type Page } from "@playwright/test";

import { enterTextField } from "../helpers/form-fields";

export class JoinRoomPage {
  constructor(private readonly page: Page) {}

  private async submitCurrentStep() {
    const submitButton = this.page.getByTestId("join-room-submit");
    await this.page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
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
    await enterTextField(this.page.locator("#join-name"), name);
    if (roomKey) {
      await enterTextField(this.page.locator("#join-room-key"), roomKey);
    }
    if (typeof passcode === "string") {
      await enterTextField(this.page.locator("#join-passcode"), passcode);
    }
    await this.submitCurrentStep();
  }

  async selectAvatarAndJoin(
    testId = "avatar-option-bird",
    { expectRoom = true }: { expectRoom?: boolean } = {},
  ) {
    const avatarOption = this.page.getByTestId(testId).first();
    await expect(avatarOption).toBeVisible();
    await avatarOption.click();
    await expect(avatarOption).toHaveAttribute("aria-pressed", "true");
    await this.submitCurrentStep();
    if (expectRoom) {
      await expect(this.page.getByTestId("participants-panel")).toBeVisible();
    }
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
