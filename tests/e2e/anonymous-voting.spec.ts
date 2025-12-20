import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe("Anonymous voting", () => {
  test("hides voter identities when anonymous mode is enabled", async ({
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
      await settingsModal.toggle("settings-toggle-anonymous-votes", true);
      await settingsModal.save();

      await moderatorRoom.castVote("5");
      await participantRoom.castVote("8");
      await moderatorRoom.revealVotes();

      // Participant rows should not show numeric vote values
      const participantRow = moderatorRoom
        .getPage()
        .getByTestId("participant-row")
        .filter({ hasText: participantName });
      const moderatorRow = moderatorRoom
        .getPage()
        .getByTestId("participant-row")
        .filter({ hasText: moderatorName });

      await expect(participantRow).not.toContainText("8");
      await expect(moderatorRow).not.toContainText("5");

      // Results should not show participant names when anonymized
      const results = moderatorRoom.getPage().getByTestId("results-panel");
      await expect(results).not.toContainText(participantName);
      await expect(results).not.toContainText(moderatorName);
    } finally {
      await cleanup();
    }
  });
});
