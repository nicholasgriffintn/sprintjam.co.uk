import { expect, type Page } from "@playwright/test";

export class SettingsModal {
  constructor(private readonly page: Page) {}

  private modal() {
    return this.page.getByRole("dialog", { name: "Room Settings" });
  }

  private async expandDetailsSections() {
    const details = this.modal().locator("details");
    const count = await details.count();
    for (let index = 0; index < count; index += 1) {
      await details
        .nth(index)
        .evaluate((element) => element.setAttribute("open", "true"));
    }
  }

  async open() {
    await this.page.getByRole("button", { name: /settings/i }).click();
    await expect(this.modal()).toBeVisible();
  }

  async toggle(settingTestId: string, enabled: boolean) {
    await this.expandDetailsSections();
    const checkbox = this.modal().getByTestId(settingTestId);
    await expect(checkbox).toBeVisible();
    await checkbox.scrollIntoViewIfNeeded();
    if (enabled) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  async waitForJiraConnection() {
    await this.expandDetailsSections();
    await expect(this.modal().getByText("Connected to Jira")).toBeVisible();
  }

  async waitForLinearConnection() {
    await this.expandDetailsSections();
    await expect(this.modal().getByText("Connected to Linear")).toBeVisible();
  }

  async waitForGithubConnection() {
    await this.expandDetailsSections();
    await expect(this.modal().getByText("Connected to GitHub")).toBeVisible();
  }

  async selectExternalService(value: "none" | "jira" | "linear" | "github") {
    await this.expandDetailsSections();
    const select = this.modal().getByTestId("settings-select-external-service");
    await select.scrollIntoViewIfNeeded();
    await select.selectOption(value);
  }

  async save() {
    await this.modal().getByRole("button", { name: "Save" }).click();
    await expect(this.modal()).toBeHidden();
  }

  async cancel() {
    await this.modal().getByRole("button", { name: "Cancel" }).click();
    await expect(this.modal()).toBeHidden();
  }
}
