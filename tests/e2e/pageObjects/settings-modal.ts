import { expect, type Page } from "@playwright/test";

export class SettingsModal {
  constructor(private readonly page: Page) {}

  private modal() {
    return this.page.getByRole("dialog", { name: "Room Settings" });
  }

  private async goToTab(tab: "voting" | "results" | "queue" | "atmosphere") {
    const tabLabel =
      tab === "voting"
        ? "Voting"
        : tab === "results"
          ? "Results"
          : tab === "queue"
            ? "Ticket queue"
            : "Atmosphere";
    const tabButton = this.modal().getByRole("button", { name: tabLabel });
    if (await tabButton.isVisible()) {
      const pressed = await tabButton.getAttribute("aria-pressed");
      if (pressed !== "true") {
        await tabButton.click();
      }
    }
  }

  private getTabForSetting(settingTestId: string) {
    const resultsSettings = [
      "allow-voting-after-reveal",
      "auto-reveal",
      "always-reveal",
      "show-timer",
      "show-average",
      "show-median",
      "show-top-votes",
      "anonymous-votes",
    ];

    if (resultsSettings.some((key) => settingTestId.includes(key))) {
      return "results" as const;
    }

    if (
      settingTestId.includes("queue") ||
      settingTestId.includes("external") ||
      settingTestId.includes("auto-sync")
    ) {
      return "queue" as const;
    }
    if (
      settingTestId.includes("structured") ||
      settingTestId.includes("voting-sequence") ||
      settingTestId.includes("extra-option")
    ) {
      return "voting" as const;
    }
    if (
      settingTestId.includes("allow") ||
      settingTestId.includes("handover") ||
      settingTestId.includes("hide-names") ||
      settingTestId.includes("presence")
    ) {
      return "voting" as const;
    }
    if (settingTestId.includes("judge")) {
      return "results" as const;
    }
    if (settingTestId.includes("strudel")) {
      return "atmosphere" as const;
    }
    return "results" as const;
  }

  async open() {
    await this.page.getByRole("button", { name: /settings/i }).click();
    await expect(this.modal()).toBeVisible();
  }

  async toggle(settingTestId: string, enabled: boolean) {
    const tab = this.getTabForSetting(settingTestId);
    await this.goToTab(tab);
    const element = this.modal().getByTestId(settingTestId);
    await expect(element).toBeVisible();
    await element.scrollIntoViewIfNeeded();

    const role = await element.getAttribute("role");
    if (role === "switch") {
      const isCurrentlyEnabled = (await element.getAttribute("aria-checked")) === "true";
      if (isCurrentlyEnabled !== enabled) {
        await element.click();
      }
    } else {
      if (enabled) {
        await element.check();
      } else {
        await element.uncheck();
      }
    }
  }

  async waitForJiraConnection() {
    await this.goToTab("queue");
    await expect(this.modal().getByText("Connected to Jira")).toBeVisible();
  }

  async waitForLinearConnection() {
    await this.goToTab("queue");
    await expect(this.modal().getByText("Connected to Linear")).toBeVisible();
  }

  async waitForGithubConnection() {
    await this.goToTab("queue");
    await expect(this.modal().getByText("Connected to GitHub")).toBeVisible();
  }

  async selectExternalService(value: "none" | "jira" | "linear" | "github") {
    await this.goToTab("queue");
    const select = this.modal().getByTestId("settings-select-external-service");
    await select.scrollIntoViewIfNeeded();
    await select.selectOption(value);
  }

  async expectVotingSequenceSelectorVisible(visible: boolean) {
    await this.goToTab("voting");
    const selector = this.modal().getByTestId("settings-select-voting-sequence");
    if (visible) {
      await expect(selector).toBeVisible();
    } else {
      await expect(selector).toBeHidden();
    }
  }

  async expectExtraOptionState(
    id: "unsure" | "coffee" | "cannot-complete",
    checked: boolean,
  ) {
    await this.goToTab("voting");
    const checkbox = this.modal().getByTestId(`extra-option-${id}`);
    if (checked) {
      await expect(checkbox).toBeChecked();
    } else {
      await expect(checkbox).not.toBeChecked();
    }
  }

  async toggleExtraOption(
    id: "unsure" | "coffee" | "cannot-complete",
    enabled: boolean,
  ) {
    await this.goToTab("voting");
    const checkbox = this.modal().getByTestId(`extra-option-${id}`);
    if (enabled) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
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
