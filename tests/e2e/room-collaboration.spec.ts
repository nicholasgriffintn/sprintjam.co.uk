import { test } from '@playwright/test';

import { CreateRoomPage } from './pageObjects/create-room-page';
import { JoinRoomPage } from './pageObjects/join-room-page';
import { RoomPage } from './pageObjects/room-page';
import { WelcomePage } from './pageObjects/welcome-page';

test.describe('SprintJam collaboration journeys', () => {
  test(
    'moderator can create a room and collaborate with a participant',
    async ({ browser }) => {
      const moderatorContext = await browser.newContext();
      const participantContext = await browser.newContext();

      try {
        const moderatorPage = await moderatorContext.newPage();
        const participantPage = await participantContext.newPage();

        const welcomeForModerator = new WelcomePage(moderatorPage);
        await welcomeForModerator.gotoHome();
        await welcomeForModerator.startCreateRoom();

        const createRoom = new CreateRoomPage(moderatorPage);
        await createRoom.completeNameStep('Moderator QA');
        await createRoom.selectAvatar('avatar-option-robot');
        await createRoom.finishCreation();

        const moderatorRoom = new RoomPage(moderatorPage);
        await moderatorRoom.waitForLoaded();
        const roomKey = await moderatorRoom.getRoomKey();

        const welcomeForParticipant = new WelcomePage(participantPage);
        await welcomeForParticipant.gotoWithInvite(roomKey);

        const joinRoom = new JoinRoomPage(participantPage);
        await joinRoom.completeParticipantDetails({
          name: 'Participant QA',
          roomKey,
        });
        await joinRoom.selectAvatarAndJoin('avatar-option-bird');

        const participantRoom = new RoomPage(participantPage);
        await participantRoom.waitForLoaded();

        await moderatorRoom.waitForParticipants(2);
        await participantRoom.waitForParticipants(2);

        await moderatorRoom.castVote('5');
        await participantRoom.castVote('3');

        await moderatorRoom.expectVotePendingState();

        await moderatorRoom.revealVotes();

        await moderatorRoom.expectVoteVisible('Moderator QA', '5');
        await moderatorRoom.expectVoteVisible('Participant QA', '3');
        await participantRoom.expectResultsVisible();
      } finally {
        await moderatorContext.close();
        await participantContext.close();
      }
    }
  );
});
