import { test } from '@playwright/test';

import { createRoomWithParticipant } from './helpers/room-journeys';
import { SettingsModal } from './pageObjects/settings-modal';
import { JiraPanel } from './pageObjects/jira-panel';

test.describe('SprintJam Jira integration journeys', () => {
  test('moderator can fetch a Jira ticket and push judge score updates', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorContext,
    } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());
    const jiraPanel = new JiraPanel(moderatorRoom.getPage());

    const ticketKey = 'TEST-123';
    const initialTicket = {
      key: ticketKey,
      url: `https://jira.example.com/browse/${ticketKey}`,
      summary: 'Demo integration ticket',
      description: 'Ensure planning poker syncs with Jira',
      status: 'In Progress',
      assignee: 'QA Bot',
      storyPoints: null,
    };

    await moderatorContext.route('**/api/jira/ticket?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ticket: initialTicket }),
      });
    });

    await moderatorContext.route('**/api/jira/ticket/**/storyPoints', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ticket: { ...initialTicket, storyPoints: 5 },
        }),
      });
    });

    try {
      await settingsModal.open();
      await settingsModal.toggle('settings-toggle-jira', true);
      await settingsModal.save();

      await moderatorRoom.expectJiraPanelVisible();

      await jiraPanel.enterTicketId(ticketKey);
      await jiraPanel.fetchTicket();
      await jiraPanel.expectTicketVisible(ticketKey);

      await moderatorRoom.castVote('5');
      await participantRoom.castVote('3');
      await moderatorRoom.revealVotes();

      await jiraPanel.triggerStoryPointUpdate();
      await jiraPanel.expectTicketVisible(ticketKey);
    } finally {
      await cleanup();
    }
  });
});
