import { expect, type Page } from "@playwright/test";

export class CreateRoomPage {
  constructor(private readonly page: Page) {}

  async completeNameStep(name: string) {
    await this.page.locator("#create-name").fill(name);
    const continueButton = this.page.getByTestId("create-room-submit");
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async selectAvatar(testId = "avatar-option-robot") {
    await this.page.getByTestId(testId).first().click();
    const continueButton = this.page.getByTestId("create-room-submit");
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async finishCreation() {
    const createButton = this.page.getByTestId("create-room-submit");
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    await createButton.click();
  }

  async configureRoomDetails(options?: {
    passcode?: string;
    enableStructuredVoting?: boolean;
    hideParticipantNames?: boolean;
    enableTicketQueue?: boolean;
    externalService?: "none" | "jira" | "linear";
  }) {
    if (!options) {
      return;
    }

    const {
      passcode,
      enableStructuredVoting,
      hideParticipantNames,
      enableTicketQueue,
      externalService,
    } = options;

    if (typeof passcode === "string") {
      await this.page.locator("#create-passcode").fill(passcode);
    }

    if (enableStructuredVoting) {
      const structuredToggle = this.page
        .locator('label:has-text("Enable structured voting")')
        .locator('input[type="checkbox"]');
      await structuredToggle.check({ force: true });
    }

    if (hideParticipantNames) {
      const hideNamesToggle = this.page
        .locator('label:has-text("Hide participant names")')
        .locator('input[type="checkbox"]');
      await hideNamesToggle.check({ force: true });
    }

    if (typeof enableTicketQueue === "boolean") {
      const queueToggle = this.page.locator("#enable-ticket-queue-toggle");
      const isChecked = await queueToggle.isChecked();
      if (isChecked !== enableTicketQueue) {
        await queueToggle.check({ force: enableTicketQueue });
      }
    }

    if (externalService) {
      const providerSelect = this.page.locator("#ticket-queue-provider");
      await providerSelect.selectOption(externalService);
    }
  }
}
