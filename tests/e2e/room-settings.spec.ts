import { test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe('Room settings', () => {
  test('moderator can enable the timer and hide participant names', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      participantName,
      moderatorName,
    } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    try {
      await settingsModal.open();
      await settingsModal.toggle('settings-toggle-show-timer', true);
      await settingsModal.toggle('settings-toggle-hide-names', true);
      await settingsModal.save();

      await moderatorRoom.expectTimerVisible();
      await moderatorRoom.expectParticipantNameHidden(participantName);
      await participantRoom.expectParticipantNameHidden(moderatorName);
    } finally {
      await cleanup();
    }
  });

  test('moderator can allow participants to reveal votes', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      participantName,
      moderatorName,
    } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    try {
      await participantRoom.expectToggleVotesButtonVisible(false);

      await settingsModal.open();
      await settingsModal.toggle('settings-toggle-allow-show', true);
      await settingsModal.save();

      await participantRoom.expectToggleVotesButtonVisible(true);

      await moderatorRoom.castVote('8');
      await participantRoom.castVote('5');
      await participantRoom.revealVotes();

      await moderatorRoom.expectVoteVisible(participantName, '5');
      await participantRoom.expectVoteVisible(moderatorName, '8');
    } finally {
      await cleanup();
    }
  });
});
