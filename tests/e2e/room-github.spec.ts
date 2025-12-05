import { expect, test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe('GitHub integration', () => {
  test('moderator can add and link GitHub issues through the queue', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup, moderatorContext } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    const issueKey = 'octocat/hello-world#42';
    const secondaryIssueKey = 'octocat/design-system#77';
    const githubOAuthStatus = {
      connected: true,
      githubLogin: 'octocat',
      githubUserEmail: 'qa@test.sprintjam.co.uk',
      defaultOwner: 'octocat',
      defaultRepo: 'hello-world',
    };
    const initialIssue = {
      key: issueKey,
      url: `https://github.com/${issueKey.replace('#', '/issues/')}`,
      summary: 'Demo GitHub issue',
      description: 'Ensure planning poker syncs with GitHub',
      status: 'open',
      assignee: 'QA Bot',
    };
    const secondaryIssue = {
      ...initialIssue,
      key: secondaryIssueKey,
      url: `https://github.com/${secondaryIssueKey.replace('#', '/issues/')}`,
      summary: 'Linked GitHub issue',
    };

    await moderatorContext.route('**/api/github/oauth/status?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(githubOAuthStatus),
      });
    });

    await moderatorContext.route('**/api/github/issue?**', (route) => {
      const url = new URL(route.request().url());
      const identifier = url.searchParams.get('issueId') ?? '';
      const normalized = identifier.toLowerCase();
      const ticket =
        normalized === secondaryIssueKey.toLowerCase()
          ? secondaryIssue
          : initialIssue;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ticket }),
      });
    });

    try {
      await settingsModal.open();
      await settingsModal.toggle('settings-toggle-enable-queue', true);
      await settingsModal.selectExternalService('github');
      await settingsModal.waitForGithubConnection();
      await settingsModal.save();

      const page = moderatorRoom.getPage();
      const setupModal = page.getByRole('dialog', {
        name: 'Connect your queue',
      });
      await expect(setupModal).toBeVisible();
      await setupModal
        .getByRole('button', { name: 'Open queue setup' })
        .click();

      const queueDialog = page.getByRole('dialog', { name: 'Ticket Queue' });
      await expect(queueDialog).toBeVisible();

      await queueDialog.getByTestId('queue-add-github-button').click();
      await queueDialog.getByTestId('queue-github-input').fill(issueKey);
      await queueDialog.getByTestId('queue-github-fetch').click();
      await expect(queueDialog).toContainText(initialIssue.summary);
      await queueDialog.getByTestId('queue-github-add').click();

      await queueDialog.getByTestId('queue-toggle-add').click();
      await queueDialog.getByPlaceholder('Ticket title').fill('Local task');
      await queueDialog.getByTestId('queue-add-confirm').click();

      const linkButtons = queueDialog.getByRole('button', {
        name: 'Link GitHub',
      });
      await expect(linkButtons).toHaveCount(2);
      await linkButtons.nth(1).click();
      await queueDialog
        .getByPlaceholder('owner/repo#123')
        .fill(secondaryIssueKey);
      await queueDialog
        .getByRole('button', { name: /^Fetch$/ })
        .click();
      await expect(queueDialog).toContainText(secondaryIssue.summary);
      await queueDialog
        .getByRole('button', { name: 'Save Link' })
        .click();
      await expect(queueDialog).toContainText(secondaryIssueKey);

      await queueDialog.getByLabel('Close modal').click();

      await page.getByTestId('next-ticket-button').click();
      await page
        .getByRole('dialog', { name: 'Review before moving on' })
        .getByTestId('pre-pointing-confirm')
        .click();

      await moderatorRoom.castVote('5');
      await participantRoom.castVote('5');
      await moderatorRoom.revealVotes();

      await page.getByTestId('queue-expand').click();
      const reopenedDialog = page.getByRole('dialog', { name: 'Ticket Queue' });
      await expect(reopenedDialog).toBeVisible();
      await expect(reopenedDialog).toContainText(issueKey);
      await reopenedDialog.getByTestId('queue-tab-history').click();
      await expect(
        reopenedDialog.getByTestId('queue-history-tab-panel')
      ).toBeVisible();
      await reopenedDialog
        .getByRole('button', { name: 'Close modal' })
        .click();
    } finally {
      await cleanup();
    }
  });
});
