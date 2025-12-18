import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe("Room reveal settings", () => {
  test("moderator can enable auto-reveal when everyone voted", async ({
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
      await settingsModal.toggle("settings-toggle-auto-reveal", true);
      await settingsModal.save();

      await moderatorRoom.castVote("5");

      await moderatorRoom.expectVotePendingState();
      await participantRoom.expectVotePendingState();

      await participantRoom.castVote("3");

      await moderatorRoom.expectVoteVisible(participantName, "3");
      await moderatorRoom.expectVoteVisible(moderatorName, "5");
      await participantRoom.expectVoteVisible(participantName, "3");
      await participantRoom.expectVoteVisible(moderatorName, "5");
    } finally {
      await cleanup();
    }
  });

  test("moderator can enable always-reveal mode", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup } = setup;

    const settingsModal = new SettingsModal(moderatorRoom.getPage());

    try {
      await moderatorRoom.castVote("8");
      await participantRoom.castVote("5");

      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-always-reveal", true);
      await settingsModal.save();

      await moderatorRoom.expectResultsVisible();
      await participantRoom.expectResultsVisible();

      await expect(
        moderatorRoom.getPage().getByTestId("toggle-votes-button"),
      ).toBeHidden();
      await expect(
        participantRoom.getPage().getByTestId("toggle-votes-button"),
      ).toBeHidden();

      await moderatorRoom.resetVotes();

      await moderatorRoom.castVote("3");
      await participantRoom.castVote("2");

      await moderatorRoom.expectResultsVisible();
      await participantRoom.expectResultsVisible();
    } finally {
      await cleanup();
    }
  });

  test("auto-reveal and always-reveal work together", async ({ browser }) => {
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
      await moderatorRoom.castVote("5");
      await participantRoom.castVote("8");

      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-auto-reveal", true);
      await settingsModal.toggle("settings-toggle-always-reveal", true);
      await settingsModal.save();

      await expect(
        moderatorRoom.getPage().getByTestId("toggle-votes-button"),
      ).toBeHidden();

      await moderatorRoom.expectVoteVisible(participantName, "8");
      await moderatorRoom.expectVoteVisible(moderatorName, "5");

      await moderatorRoom.resetVotes();

      await moderatorRoom.castVote("13");
      await participantRoom.castVote("21");

      await moderatorRoom.expectVoteVisible(participantName, "21");
      await moderatorRoom.expectVoteVisible(moderatorName, "13");
    } finally {
      await cleanup();
    }
  });
});
