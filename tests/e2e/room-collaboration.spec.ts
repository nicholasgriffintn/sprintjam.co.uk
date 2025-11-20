import { test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("SprintJam collaboration journeys", () => {
  test("moderator can create a room and collaborate with a participant", async ({
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
      await moderatorRoom.castVote("5");
      await participantRoom.castVote("3");
      await moderatorRoom.expectVotePendingState();
      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(moderatorName, "5");
      await moderatorRoom.expectVoteVisible(participantName, "3");
      await participantRoom.expectResultsVisible();
    } finally {
      await cleanup();
    }
  });

  test("moderator can reset votes to start a new round", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup } = setup;

    try {
      await moderatorRoom.castVote("8");
      await participantRoom.castVote("5");
      await moderatorRoom.expectVotePendingState();
      await moderatorRoom.revealVotes();
      await moderatorRoom.expectResultsVisible();

      await moderatorRoom.resetVotes();
      await moderatorRoom.expectVotesHiddenMessage("No votes yet");
      await participantRoom.expectVotesHiddenMessage("No votes yet");
    } finally {
      await cleanup();
    }
  });

  test("participant can join via room key journey with a passcode-protected room", async ({
    browser,
  }) => {
    const passcode = "SAFE-ROOM";
    const setup = await createRoomWithParticipant(browser, {
      participantJoinMode: "manual",
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

      await participantRoom.castVote("1");
      await moderatorRoom.castVote("2");
      await moderatorRoom.expectVotePendingState();

      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(participantName, "1");
      await moderatorRoom.expectVoteVisible(moderatorName, "2");
    } finally {
      await cleanup();
    }
  });

  test("share modal is accessible and participant departures update the room state", async ({
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
        true,
      );
      await moderatorRoom.openShareModal();
      await moderatorRoom.expectShareLink(roomKey);
      await moderatorRoom.closeShareModal();

      await participantRoom.leaveRoom();
      await participantRoom.expectOnWelcomeScreen();
      await participantContext.close();

      await moderatorRoom.expectParticipantConnectionState(
        participantName,
        false,
      );
      await moderatorRoom.expectVotesHiddenMessage("No votes yet");
    } finally {
      await cleanup();
    }
  });
});
