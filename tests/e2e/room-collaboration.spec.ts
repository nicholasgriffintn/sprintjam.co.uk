import { test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { WelcomePage } from './pageObjects/welcome-page';
import { JoinRoomPage } from './pageObjects/join-room-page';

test.describe('Collaboration journeys', () => {
  test('moderator can create a room and collaborate with a participant', async ({
    browser,
  }) => {
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
  });

  test('moderator can reset votes to start a new round', async ({
    browser,
  }) => {
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
  });

  test('join flow surfaces invalid room and passcode errors', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route('**/api/rooms/join', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Room not found' }),
      })
    );

    const welcome = new WelcomePage(page);
    await welcome.gotoHome();
    await welcome.startJoinRoom();

    const join = new JoinRoomPage(page);
    await join.completeParticipantDetails({
      name: 'Error QA',
      roomKey: 'BAD404',
      passcode: 'bad',
    });
    await join.selectAvatarAndJoin();
    await join.expectAlertMessage('Room not found');
    await page.unroute('**/api/rooms/join');

    await page.route('**/api/rooms/join', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Passcode incorrect. Ask the moderator to confirm it.',
        }),
      })
    );

    await welcome.gotoHome();
    await welcome.startJoinRoom();
    await join.completeParticipantDetails({
      name: 'Passcode QA',
      roomKey: 'BADPASS',
      passcode: 'wrong',
    });
    await join.selectAvatarAndJoin();
    await join.expectAlertMessage('Passcode incorrect');
    await page.unroute('**/api/rooms/join');

    await context.close();
  });

  test('participant can join via room key journey with a passcode-protected room', async ({
    browser,
  }) => {
    const passcode = 'SAFE-ROOM';
    const setup = await createRoomWithParticipant(browser, {
      participantJoinMode: 'manual',
      roomPasscode: passcode,
    });
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    } = setup;

    try {
      await moderatorRoom.expectParticipantVisible(participantName);
      await participantRoom.expectParticipantVisible(moderatorName);

      await participantRoom.castVote('1');
      await moderatorRoom.castVote('2');
      await moderatorRoom.expectVotePendingState();

      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(participantName, '1');
      await moderatorRoom.expectVoteVisible(moderatorName, '2');
    } finally {
      await cleanup();
    }
  });

  test('share modal is accessible and participant departures update the room state', async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      roomKey,
      participantContext,
      participantName,
    } = setup;

    try {
      await moderatorRoom.expectParticipantConnectionState(
        participantName,
        true
      );
      await moderatorRoom.openShareModal();
      await moderatorRoom.expectShareLink(roomKey);
      await moderatorRoom.closeShareModal();

      await participantRoom.leaveRoom();
      await participantRoom.expectOnWelcomeScreen();
      await participantContext.close();

      await moderatorRoom.expectParticipantConnectionState(
        participantName,
        false
      );
      await moderatorRoom.expectVotesHiddenMessage('No votes yet');
    } finally {
      await cleanup();
    }
  });

  test('participant reconnects after a reload and keeps state', async ({
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

    try {
      await moderatorRoom.castVote('8');
      await participantRoom.castVote('5');
      await moderatorRoom.expectVotePendingState();

      await participantRoom.reload();
      await moderatorRoom.waitForParticipants(2);
      await participantRoom.waitForParticipants(2);

      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(participantName, '5');
      await participantRoom.expectVoteVisible(moderatorName, '8');
    } finally {
      await cleanup();
    }
  });
});
