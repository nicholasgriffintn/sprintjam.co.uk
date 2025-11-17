import { expect, type Page } from '@playwright/test';

export class JiraPanel {
  constructor(private readonly page: Page) {}

  panel() {
    return this.page.getByTestId('jira-ticket-panel');
  }

  async enterTicketId(ticketId: string) {
    await this.panel().getByTestId('jira-ticket-input').fill(ticketId);
  }

  async fetchTicket() {
    await this.panel().getByTestId('jira-fetch-button').click();
  }

  async expectTicketVisible(ticketKey: string) {
    await expect(
      this.panel().getByTestId('jira-ticket-details')
    ).toContainText(ticketKey);
  }

  async triggerStoryPointUpdate() {
    await this.panel().getByTestId('jira-update-button').click();
  }
}
