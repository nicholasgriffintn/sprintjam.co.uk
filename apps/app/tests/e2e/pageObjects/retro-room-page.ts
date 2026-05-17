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

  private getColumnDropZone(columnTitle: string) {
    return this.getColumn(columnTitle).getByTestId("retro-column-move-zone");
  }

  async waitForLoaded() {
    await expect(this.page.getByTestId("retro-room")).toBeVisible();
    await expect(this.page.getByTestId("participants-panel")).toBeVisible();
  }

  async getRetroKey(): Promise<string> {
    const keyEl = this.page.getByTestId("retro-room-key");
    await expect(keyEl).toBeVisible();
    const text = await keyEl.textContent();
    if (!text) throw new Error("Retro room key not found in header");
    return text.trim();
  }

  async expectParticipantVisible(name: string) {
    const row = this.page
      .getByTestId("participants-list")
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(row).toHaveCount(1);
  }

  async addCard(columnTitle: string, cardText: string) {
    const column = this.getColumn(columnTitle);
    await expect(column).toBeVisible();
    const cardInput = column.getByPlaceholder(
      `Add a card for ${columnTitle.toLowerCase()}`,
    );
    await cardInput.fill(cardText);
    await expect(cardInput).toHaveValue(cardText);
    await column.getByRole("button", { name: /add card/i }).click();
  }

  async expectCardVisible(cardText: string) {
    await expect(this.getCard(cardText)).toBeVisible();
  }

  async expectCardInColumn(columnTitle: string, cardText: string) {
    await expect(
      this.getColumn(columnTitle).filter({ hasText: cardText }),
    ).toBeVisible();
  }

  async editCard(cardText: string, nextText: string) {
    await expect(async () => {
      const card = this.getCard(cardText);
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: /edit/i }).click();
      const editCard = this.page.getByTestId("retro-card").filter({
        has: this.page.locator("textarea"),
      });
      const textarea = editCard.locator("textarea");
      await textarea.fill(nextText);
      await editCard.getByRole("button", { name: /^save$/i }).click();
      const savedCard = this.getCard(nextText);
      await expect(savedCard).toBeVisible();
      await expect(savedCard.locator("textarea")).toHaveCount(0);
    }).toPass();
  }

  async moveCard(cardText: string, columnTitle: string) {
    await expect(async () => {
      const card = this.getCard(cardText);
      await expect(card).toBeVisible();
      await card.dragTo(this.getColumnDropZone(columnTitle));
      await expect(
        this.getColumn(columnTitle).filter({ hasText: cardText }),
      ).toBeVisible();
    }).toPass();
  }

  async groupCards(columnTitle: string, cardTexts: string[]) {
    const column = this.getColumn(columnTitle);

    await expect(async () => {
      const [sourceText, targetText] = cardTexts;
      if (!sourceText || !targetText) {
        throw new Error("Drag grouping needs at least two cards");
      }

      await this.getCard(sourceText).dragTo(this.getCard(targetText));

      const group = column.getByTestId("retro-card-group").filter({
        has: this.getCard(targetText),
      });
      await expect(group).toBeVisible();
      for (const cardText of cardTexts) {
        await expect(
          group.getByTestId("retro-card").filter({ hasText: cardText }),
        ).toBeVisible();
      }
    }).toPass();
  }

  async addCardToGroup(
    columnTitle: string,
    cardText: string,
    existingGroupCardText: string,
  ) {
    const column = this.getColumn(columnTitle);

    await expect(async () => {
      const card = this.getCard(cardText);
      await expect(card).toBeVisible();

      const group = column.getByTestId("retro-card-group").filter({
        has: this.getCard(existingGroupCardText),
      });
      await expect(group).toBeVisible();
      await card.dragTo(group);

      await expect(
        group.getByTestId("retro-card").filter({ hasText: cardText }),
      ).toBeVisible();
    }).toPass();
  }

  async voteForCard(cardText: string) {
    const card = this.getCard(cardText);
    await expect(card).toBeVisible();
    await card.getByTestId("retro-card-vote").click();
  }

  async expectCardVoteCount(cardText: string, count: number) {
    const card = this.getCard(cardText);
    await expect(card.getByTestId("retro-card-vote")).toContainText(
      String(count),
    );
  }

  async markReady() {
    await this.page.getByRole("button", { name: /^i am ready$/i }).click();
    await expect(
      this.page.getByRole("button", { name: /^marked ready$/i }),
    ).toBeVisible();
  }

  async expectParticipantReady(name: string) {
    const row = this.page
      .getByTestId("participants-list")
      .getByTestId("participant-row")
      .filter({ hasText: name });
    await expect(row.getByTestId("participant-ready")).toBeVisible();
  }

  async nextPhase() {
    await this.page.getByRole("button", { name: /^next$/i }).click();
  }

  async switchToFocusPhase() {
    await this.page.getByRole("button", { name: /^focus$/i }).click();
    await expect(
      this.page.getByPlaceholder("Add an action item"),
    ).toBeVisible();
  }

  async addAction(
    title: string,
    options: { owner?: string; dueDate?: string; priority?: string } = {},
  ) {
    const input = this.page.getByPlaceholder("Add an action item");
    await expect(input).toBeVisible();
    await input.fill(title);
    await expect(input).toHaveValue(title);
    if (options.owner) {
      await this.page.getByLabel("Action owner").selectOption(options.owner);
    }
    if (options.dueDate) {
      await this.page.getByLabel("Action due date").fill(options.dueDate);
    }
    if (options.priority) {
      await this.page
        .getByLabel("Action priority")
        .selectOption(options.priority);
    }
    await this.page.getByRole("button", { name: /^add action$/i }).click();
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async completeAction(title: string) {
    await this.page
      .getByRole("button", { name: `Mark ${title} complete` })
      .click();
    await expect(
      this.page.getByRole("button", { name: `Mark ${title} incomplete` }),
    ).toBeVisible();
  }

  async completeRetro() {
    await this.nextPhase();
    await expect(
      this.page.getByRole("heading", { name: /^recap$/i }),
    ).toBeVisible();
  }

  getPage() {
    return this.page;
  }
}
