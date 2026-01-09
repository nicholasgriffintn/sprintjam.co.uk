import { expect, type Page } from "@playwright/test";

export class StructuredVotingPanel {
  constructor(private readonly page: Page) {}

  panel() {
    return this.page.getByTestId("structured-voting-panel");
  }

  async selectScore(criterionId: string, score: number) {
    await this.panel()
      .getByTestId(`structured-score-${criterionId}-${score}`)
      .click();
  }

  async expectStoryPoints(value: string | number) {
    await expect(
      this.panel().getByTestId("structured-summary-points"),
    ).toContainText(String(value));
  }

  async expectPanelVisible() {
    await expect(this.panel()).toBeVisible();
  }
}
