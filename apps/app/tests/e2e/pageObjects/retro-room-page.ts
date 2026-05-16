import { expect, type Page } from "@playwright/test";

export class RetroRoomPage {
  constructor(private readonly page: Page) {}

  private getColumn(columnTitle: string) {
    return this.page
      .getByTestId("retro-column")
      .filter({ has: this.page.getByRole("heading", { name: columnTitle }) });
  }

  private getCard(cardText: string) {
    return this.page.getByTestId("retro-card").filter({ hasText: cardText });
  }

  async waitForLoaded() {
    await expect(this.page.getByTestId("retro-room")).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByTestId("participants-panel")).toBeVisible({
      timeout: 15_000,
    });
  }

  async getRetroKey(): Promise<string> {
    const keyEl = this.page.getByTestId("retro-room-key");
    await expect(keyEl).toBeVisible({ timeout: 10_000 });
    const text = await keyEl.textContent();
    if (!text) throw new Error("Retro room key not found in header");
    return text.trim();
  }

  async expectParticipantVisible(name: string) {
    const row = this.page
      .getByTestId("participants-list")
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(row).toHaveCount(1, { timeout: 10_000 });
  }

  async addCard(columnTitle: string, cardText: string) {
    const column = this.getColumn(columnTitle);
    await expect(column).toBeVisible({ timeout: 10_000 });
    const cardInput = column.getByPlaceholder(
      `Add a card for ${columnTitle.toLowerCase()}`,
    );
    await cardInput.fill(cardText);
    await expect(cardInput).toHaveValue(cardText);
    await column.getByRole("button", { name: /add card/i }).click();
  }

  async expectCardVisible(cardText: string) {
    await expect(this.getCard(cardText)).toBeVisible({ timeout: 10_000 });
  }

  async voteForCard(cardText: string) {
    const card = this.getCard(cardText);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByTestId("retro-card-vote").click();
  }

  async expectCardVoteCount(cardText: string, count: number) {
    const card = this.getCard(cardText);
    await expect(card.getByTestId("retro-card-vote")).toContainText(
      String(count),
      { timeout: 10_000 },
    );
  }

  async markReady() {
    await this.page.getByRole("button", { name: /^i am ready$/i }).click();
    await expect(
      this.page.getByRole("button", { name: /^ready$/i }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async nextPhase() {
    await this.page.getByRole("button", { name: /^next$/i }).click();
  }

  async switchToFocusPhase() {
    await this.page.getByRole("button", { name: /^focus$/i }).click();
    await expect(this.page.getByPlaceholder("Add an action item")).toBeVisible({
      timeout: 10_000,
    });
  }

  async addAction(title: string) {
    const input = this.page.getByPlaceholder("Add an action item");
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(title);
    await expect(input).toHaveValue(title);
    await this.page.getByRole("button", { name: /^add action$/i }).click();
    await expect(this.page.getByText(title)).toBeVisible({ timeout: 10_000 });
  }

  async completeAction(title: string) {
    await this.page
      .getByRole("button", { name: `Mark ${title} complete` })
      .click();
    await expect(
      this.page.getByRole("button", { name: `Mark ${title} incomplete` }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async completeRetro() {
    await this.nextPhase();
    await expect(
      this.page.getByRole("heading", { name: /retro completed/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  getPage() {
    return this.page;
  }
}
