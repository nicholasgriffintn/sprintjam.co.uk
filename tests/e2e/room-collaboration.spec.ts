import { test } from '@playwright/test';
import type { Browser } from '@playwright/test';

import { CreateRoomPage } from './pageObjects/create-room-page';
import { JoinRoomPage } from './pageObjects/join-room-page';
import { RoomPage } from './pageObjects/room-page';
import { WelcomePage } from './pageObjects/welcome-page';

async function createRoomWithParticipant(browser: Browser) {
  const moderatorContext = await browser.newContext();
  const participantContext = await browser.newContext();

  const cleanup = async () => {
    await Promise.all([
      moderatorContext.close().catch(() => {}),
      participantContext.close().catch(() => {}),
    ]);
  };

  const moderatorName = 'Moderator QA';
  const participantName = 'Participant QA';

  try {
    const moderatorPage = await moderatorContext.newPage();
    const participantPage = await participantContext.newPage();

    const welcomeForModerator = new WelcomePage(moderatorPage);
    await welcomeForModerator.gotoHome();
    await welcomeForModerator.startCreateRoom();

    const createRoom = new CreateRoomPage(moderatorPage);
    await createRoom.completeNameStep(moderatorName);
    await createRoom.selectAvatar('avatar-option-robot');
    await createRoom.finishCreation();

    const moderatorRoom = new RoomPage(moderatorPage);
    await moderatorRoom.waitForLoaded();
    const roomKey = await moderatorRoom.getRoomKey();

    const welcomeForParticipant = new WelcomePage(participantPage);
    await welcomeForParticipant.gotoWithInvite(roomKey);

    const joinRoom = new JoinRoomPage(participantPage);
    await joinRoom.completeParticipantDetails({
      name: participantName,
      roomKey,
    });
    await joinRoom.selectAvatarAndJoin('avatar-option-bird');

    const participantRoom = new RoomPage(participantPage);
    await participantRoom.waitForLoaded();

    await moderatorRoom.waitForParticipants(2);
    await participantRoom.waitForParticipants(2);

    return {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

test.describe('SprintJam collaboration journeys', () => {
  test(
    'moderator can create a room and collaborate with a participant',
    async ({ browser }) => {
      const setup = await createRoomWithParticipant(browser);
      const {
        moderatorRoom,
        participantRoom,
        cleanup,
        moderatorName,
        participantName,
      } = setup;

      try {
        await moderatorRoom.castVote('5');
        await participantRoom.castVote('3');
        await moderatorRoom.expectVotePendingState();
        await moderatorRoom.revealVotes();
        await moderatorRoom.expectVoteVisible(moderatorName, '5');
        await moderatorRoom.expectVoteVisible(participantName, '3');
        await participantRoom.expectResultsVisible();
      } finally {
        await cleanup();
      }
    }
  );

  test(
    'moderator can reset votes to start a new round',
    async ({ browser }) => {
      const setup = await createRoomWithParticipant(browser);
      const { moderatorRoom, participantRoom, cleanup } = setup;

      try {
        await moderatorRoom.castVote('8');
        await participantRoom.castVote('5');
        await moderatorRoom.expectVotePendingState();
        await moderatorRoom.revealVotes();
        await moderatorRoom.expectResultsVisible();

        await moderatorRoom.resetVotes();
        await moderatorRoom.expectVotesHiddenMessage('No votes yet');
        await participantRoom.expectVotesHiddenMessage('No votes yet');
      } finally {
        await cleanup();
      }
    }
  );
});
