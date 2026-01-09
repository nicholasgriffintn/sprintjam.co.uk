import { test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("Smoke tests @smoke", () => {
  test("critical user journey: create room, join, vote, and reveal", async ({
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
      // Verify both users can see each other
      await moderatorRoom.expectParticipantVisible(participantName);
      await participantRoom.expectParticipantVisible(moderatorName);

      // Cast votes
      await moderatorRoom.castVote("5");
      await participantRoom.castVote("3");

      // Verify votes are pending
      await moderatorRoom.expectVotePendingState();

      // Reveal votes
      await moderatorRoom.revealVotes();

      // Verify results are visible to both users
      await moderatorRoom.expectVoteVisible(moderatorName, "5");
      await moderatorRoom.expectVoteVisible(participantName, "3");
      await participantRoom.expectResultsVisible();
    } finally {
      await cleanup();
    }
  });
});
