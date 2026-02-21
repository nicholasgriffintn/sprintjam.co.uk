import { test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("Spectator mode", () => {
  test("participant can toggle to spectator mode and back", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup, participantName } = setup;

    try {
      // Initially, participant should be in participants list
      await participantRoom.expectParticipantVisible(participantName);
      await moderatorRoom.expectParticipantVisible(participantName);
      await participantRoom.waitForSpectators(0);

      // Toggle to spectator mode
      await participantRoom.toggleSpectatorMode();

      // Participant should now be in spectators list
      await participantRoom.expectSpectatorListVisible();
      await participantRoom.expectSpectatorVisible(participantName);
      await participantRoom.expectParticipantNotInParticipantsList(
        participantName,
      );

      // Moderator should also see participant in spectators list
      await moderatorRoom.expectSpectatorListVisible();
      await moderatorRoom.expectSpectatorVisible(participantName);
      await moderatorRoom.expectParticipantNotInParticipantsList(
        participantName,
      );

      // Toggle back to participant
      await participantRoom.toggleSpectatorMode();

      // Participant should be back in participants list
      await participantRoom.expectParticipantVisible(participantName);
      await participantRoom.expectParticipantNotInSpectators(participantName);
      await participantRoom.waitForSpectators(0);

      // Moderator should also see participant back in participants list
      await moderatorRoom.expectParticipantVisible(participantName);
      await moderatorRoom.waitForSpectators(0);
    } finally {
      await cleanup();
    }
  });

  test("spectator cannot vote and votes are disabled", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { participantRoom, moderatorRoom, cleanup } = setup;

    try {
      // Cast a vote as participant first
      await participantRoom.castVote("5");
      await participantRoom.expectVotePendingState();

      // Toggle to spectator mode
      await participantRoom.toggleSpectatorMode();

      // Voting buttons should be disabled
      await participantRoom.expectVotingDisabled();

      // Moderator should not see spectator's vote
      await moderatorRoom.expectVotesHiddenMessage("You haven't voted yet");
    } finally {
      await cleanup();
    }
  });

  test("spectator vote is cleared when switching to spectator mode", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser);
    const {
      participantRoom,
      moderatorRoom,
      cleanup,
      participantName,
      moderatorName,
    } = setup;

    try {
      // Both cast votes
      await participantRoom.castVote("8");
      await moderatorRoom.castVote("5");

      // Reveal votes to confirm both voted
      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(participantName, "8");
      await moderatorRoom.expectVoteVisible(moderatorName, "5");

      // Reset votes for next round
      await moderatorRoom.resetVotes();

      // Participant casts vote again
      await participantRoom.castVote("3");
      await participantRoom.expectVotePendingState();

      // Toggle to spectator mode
      await participantRoom.toggleSpectatorMode();

      // Moderator reveals - should only see their own vote
      await moderatorRoom.castVote("2");
      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(moderatorName, "2");

      // Spectator's vote should not be visible
      await participantRoom.expectResultsVisible();
    } finally {
      await cleanup();
    }
  });

  test("spectator is excluded from voting statistics", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { participantRoom, moderatorRoom, cleanup, participantName } = setup;

    try {
      // Participant becomes spectator
      await participantRoom.toggleSpectatorMode();

      // Moderator casts vote
      await moderatorRoom.castVote("5");

      // Moderator reveals votes
      await moderatorRoom.revealVotes();

      // Results should show 1/1 voted (only moderator), not 1/2
      await moderatorRoom.expectResultsVisible();

      // Spectator should see results
      await participantRoom.expectResultsVisible();

      // Verify participant is in spectators list
      await moderatorRoom.expectSpectatorVisible(participantName);
    } finally {
      await cleanup();
    }
  });

  test("spectator remains spectator after page reload", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { participantRoom, moderatorRoom, cleanup, participantName } = setup;

    try {
      await participantRoom.toggleSpectatorMode();
      await participantRoom.expectSpectatorVisible(participantName);
      await participantRoom.expectParticipantNotInParticipantsList(
        participantName,
      );
      await moderatorRoom.expectSpectatorVisible(participantName);
      await moderatorRoom.expectParticipantNotInParticipantsList(
        participantName,
      );

      await participantRoom.reload();

      await participantRoom.waitForParticipants(1);
      await participantRoom.expectSpectatorListVisible();
      await participantRoom.expectSpectatorVisible(participantName);
      await participantRoom.expectParticipantNotInParticipantsList(
        participantName,
      );
      await participantRoom.expectVotingDisabled();

      await moderatorRoom.expectSpectatorVisible(participantName);
      await moderatorRoom.waitForParticipants(1);
      await moderatorRoom.expectParticipantNotInParticipantsList(
        participantName,
      );
    } finally {
      await cleanup();
    }
  });

  test("multiple spectators are displayed correctly", async ({ browser }) => {
    const moderatorContext = await browser.newContext();
    const moderatorPage = await moderatorContext.newPage();

    const participant1Context = await browser.newContext();
    const participant1Page = await participant1Context.newPage();

    const participant2Context = await browser.newContext();
    const participant2Page = await participant2Context.newPage();

    try {
      // Create room with two participants manually
      const setup = await createRoomWithParticipant(browser);
      const { moderatorRoom, cleanup, roomKey } = setup;

      // Join as second participant using the existing helper
      const { RoomPage } = await import("./pageObjects/room-page");
      const { JoinRoomPage } = await import("./pageObjects/join-room-page");
      const { WelcomePage } = await import("./pageObjects/welcome-page");

      const participant2Name = "Spectator2";
      const welcome = new WelcomePage(participant2Page);
      await welcome.gotoHome();
      await welcome.startJoinRoom();

      const join = new JoinRoomPage(participant2Page);
      await join.completeParticipantDetails({
        name: participant2Name,
        roomKey,
      });
      await join.selectAvatarAndJoin();

      const participant2Room = new RoomPage(participant2Page);
      await participant2Room.waitForLoaded();

      // Both participants toggle to spectator
      await setup.participantRoom.toggleSpectatorMode();
      await participant2Room.toggleSpectatorMode();

      // Moderator should see both spectators
      await moderatorRoom.waitForSpectators(2);
      await moderatorRoom.expectSpectatorVisible(setup.participantName);
      await moderatorRoom.expectSpectatorVisible(participant2Name);

      // Both should be in spectators list, not participants
      await moderatorRoom.waitForParticipants(1); // Only moderator

      await participant2Context.close();
      await cleanup();
    } finally {
      await moderatorContext.close();
      await participant1Context.close();
      await participant2Context.close();
    }
  });

  test("moderator can toggle to spectator mode", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    } = setup;

    try {
      // Moderator toggles to spectator
      await moderatorRoom.toggleSpectatorMode();
      await moderatorRoom.expectSpectatorVisible(moderatorName);
      await moderatorRoom.expectVotingDisabled();

      // Participant should see moderator as spectator
      await participantRoom.expectSpectatorVisible(moderatorName);
      await participantRoom.expectParticipantNotInSpectators(participantName);

      // Participant votes alone (no reveal needed since they're the only voter)
      await participantRoom.castVote("5");
      await participantRoom.expectVotePendingState();

      // Spectator moderator should also see they haven't voted (spectators don't vote)
      await moderatorRoom.expectVotesHiddenMessage("You haven't voted yet");
    } finally {
      await cleanup();
    }
  });

  test("spectator cannot vote in structured voting mode", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableStructuredVotingOnCreate: true,
    });
    const { participantRoom, moderatorRoom, cleanup } = setup;

    try {
      // Verify structured voting panel is visible
      await participantRoom.expectStructuredPanelVisible();

      // Toggle to spectator mode
      await participantRoom.toggleSpectatorMode();

      // Structured voting buttons should be disabled
      await participantRoom.expectVotingDisabled();

      // Moderator should not see spectator in voting stats
      await moderatorRoom.expectVotesHiddenMessage("You haven't voted yet");
    } finally {
      await cleanup();
    }
  });
});
