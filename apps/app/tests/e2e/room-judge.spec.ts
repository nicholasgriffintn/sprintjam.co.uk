import { expect, test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe("The Judge", () => {
  test("shows judge verdict after reveal when enabled", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    } = setup;

    const page = moderatorRoom.getPage();
    const settingsModal = new SettingsModal(page);

    try {
      await settingsModal.open();
      const settingsDialog = page.getByRole("dialog", { name: "Room Settings" });
      await settingsDialog
        .getByRole("button", { name: "Results", exact: true })
        .click();
      const judgeToggle = settingsDialog.getByLabel(/Enable The Judge/i);
      if (!(await judgeToggle.isChecked())) {
        await judgeToggle.check();
      }
      await settingsModal.save();

      await moderatorRoom.castVote("5");
      await participantRoom.castVote("8");
      await moderatorRoom.revealVotes();

      await expect(page.getByText("The Judge's Verdict")).toBeVisible();
      await expect(
        page.getByText(/Waiting for the judge to evaluate|Smart Consensus/i),
      ).toBeVisible();

      await moderatorRoom.expectVoteVisible(moderatorName, "5");
      await moderatorRoom.expectVoteVisible(participantName, "8");
    } finally {
      await cleanup();
    }
  });
});
