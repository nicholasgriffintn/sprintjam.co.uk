import { test, expect } from "@playwright/test";

import {
  createRoomWithParticipant,
  type RoomSetupOptions,
} from "./helpers/room-journeys";
import { StructuredVotingPanel } from "./pageObjects/structured-voting-panel";
import { SettingsModal } from "./pageObjects/settings-modal";

test.describe("Structured voting completion warnings", () => {
  const roomOptions: RoomSetupOptions = {
    enableStructuredVotingOnCreate: true,
  };

  test("shows warning when moderator reveals votes with incomplete structured voting", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, roomOptions);
    const { moderatorRoom, participantRoom, cleanup, participantName } = setup;

    const moderatorPanel = new StructuredVotingPanel(moderatorRoom.getPage());
    const participantPanel = new StructuredVotingPanel(
      participantRoom.getPage(),
    );

    try {
      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      // Moderator completes all criteria
      await moderatorPanel.selectScore("complexity", 3);
      await moderatorPanel.selectScore("confidence", 2);
      await moderatorPanel.selectScore("volume", 2);
      await moderatorPanel.selectScore("unknowns", 1);
      await moderatorPanel.expectStoryPoints(5);

      // Participant only partially completes criteria (missing volume and unknowns)
      await participantPanel.selectScore("complexity", 2);
      await participantPanel.selectScore("confidence", 2);

      // Set up dialog handler to intercept the confirmation dialog
      let dialogMessage = "";
      let dialogAccepted = false;
      moderatorRoom.getPage().on("dialog", async (dialog) => {
        dialogMessage = dialog.message();
        dialogAccepted = false;
        await dialog.dismiss();
      });

      // Attempt to reveal votes
      await moderatorRoom.revealVotes();

      // Verify the warning dialog appeared with correct message
      expect(dialogMessage).toContain("completed all voting criteria");
      expect(dialogMessage).toContain("Are you sure you want to show votes?");
      expect(dialogAccepted).toBe(false);
      // Should show either participant name or count
      const hasName = dialogMessage.includes(participantName);
      const hasCount = dialogMessage.includes("1 of 2 users");
      expect(hasName || hasCount).toBe(true);

      // Verify votes were NOT revealed (because dialog was dismissed)
      await moderatorRoom.expectVotePendingState();
    } finally {
      await cleanup();
    }
  });

  test("shows warning with count only when multiple users incomplete", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, roomOptions);
    const { moderatorRoom, participantRoom, cleanup } = setup;

    const moderatorPanel = new StructuredVotingPanel(moderatorRoom.getPage());
    const participantPanel = new StructuredVotingPanel(
      participantRoom.getPage(),
    );

    try {
      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      // Neither user completes all criteria
      await moderatorPanel.selectScore("complexity", 2);
      await participantPanel.selectScore("complexity", 1);

      let dialogMessage = "";
      moderatorRoom.getPage().on("dialog", async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await moderatorRoom.revealVotes();

      // Verify the warning shows count
      expect(dialogMessage).toContain(
        "2 of 2 users haven't completed all voting criteria",
      );
      expect(dialogMessage).toContain("Are you sure you want to show votes?");
    } finally {
      await cleanup();
    }
  });

  test("does not show warning when all users complete structured voting", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, roomOptions);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    } = setup;

    const moderatorPanel = new StructuredVotingPanel(moderatorRoom.getPage());
    const participantPanel = new StructuredVotingPanel(
      participantRoom.getPage(),
    );

    try {
      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      // Both users complete all criteria
      await moderatorPanel.selectScore("complexity", 3);
      await moderatorPanel.selectScore("confidence", 2);
      await moderatorPanel.selectScore("volume", 2);
      await moderatorPanel.selectScore("unknowns", 1);
      await moderatorPanel.expectStoryPoints(5);

      await participantPanel.selectScore("complexity", 2);
      await participantPanel.selectScore("confidence", 2);
      await participantPanel.selectScore("volume", 1);
      await participantPanel.selectScore("unknowns", 0);
      await participantPanel.expectStoryPoints(3);

      let dialogShown = false;
      moderatorRoom.getPage().on("dialog", async (dialog) => {
        dialogShown = true;
        await dialog.accept();
      });

      // Reveal votes should work without warning
      await moderatorRoom.revealVotes();

      expect(dialogShown).toBe(false);
      await moderatorRoom.expectVoteVisible(moderatorName, "5");
      await moderatorRoom.expectVoteVisible(participantName, "3");
    } finally {
      await cleanup();
    }
  });

  test("treats extra vote options as complete", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser, roomOptions);
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    } = setup;

    const moderatorPanel = new StructuredVotingPanel(moderatorRoom.getPage());
    const participantPanel = new StructuredVotingPanel(
      participantRoom.getPage(),
    );

    try {
      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      // Moderator uses extra option (should count as complete)
      await moderatorPanel.selectExtraOption("unsure");
      await moderatorPanel.expectStoryPoints("—");

      // Participant completes all criteria normally
      await participantPanel.selectScore("complexity", 2);
      await participantPanel.selectScore("confidence", 2);
      await participantPanel.selectScore("volume", 1);
      await participantPanel.selectScore("unknowns", 0);
      await participantPanel.expectStoryPoints(3);

      let dialogShown = false;
      moderatorRoom.getPage().on("dialog", async (dialog) => {
        dialogShown = true;
        await dialog.accept();
      });

      // Should not show warning since extra option counts as complete
      await moderatorRoom.revealVotes();

      expect(dialogShown).toBe(false);
      await moderatorRoom.expectVoteVisible(moderatorName, "❓");
      await moderatorRoom.expectVoteVisible(participantName, "3");
    } finally {
      await cleanup();
    }
  });

  test("hides user names in warning when anonymous votes enabled", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, roomOptions);
    const { moderatorRoom, participantRoom, cleanup, participantName } = setup;

    const moderatorPanel = new StructuredVotingPanel(moderatorRoom.getPage());
    const participantPanel = new StructuredVotingPanel(
      participantRoom.getPage(),
    );

    try {
      // Enable anonymous votes
      const settingsModal = new SettingsModal(moderatorRoom.getPage());
      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-anonymous-votes", true);
      await settingsModal.save();

      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      // Moderator completes all criteria
      await moderatorPanel.selectScore("complexity", 3);
      await moderatorPanel.selectScore("confidence", 2);
      await moderatorPanel.selectScore("volume", 2);
      await moderatorPanel.selectScore("unknowns", 1);

      // Participant only partially completes
      await participantPanel.selectScore("complexity", 2);

      let dialogMessage = "";
      moderatorRoom.getPage().on("dialog", async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await moderatorRoom.revealVotes();

      // Verify warning does NOT include participant name
      expect(dialogMessage).not.toContain(participantName);
      expect(dialogMessage).toContain(
        "1 of 2 users haven't completed all voting criteria",
      );
      expect(dialogMessage).toContain("Are you sure you want to show votes?");
    } finally {
      await cleanup();
    }
  });

  test("hides user names in warning when hideParticipantNames enabled", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, roomOptions);
    const { moderatorRoom, participantRoom, cleanup, participantName } = setup;

    const moderatorPanel = new StructuredVotingPanel(moderatorRoom.getPage());
    const participantPanel = new StructuredVotingPanel(
      participantRoom.getPage(),
    );

    try {
      // Enable hide participant names
      const settingsModal = new SettingsModal(moderatorRoom.getPage());
      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-hide-names", true);
      await settingsModal.save();

      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      // Moderator completes all criteria
      await moderatorPanel.selectScore("complexity", 3);
      await moderatorPanel.selectScore("confidence", 2);
      await moderatorPanel.selectScore("volume", 2);
      await moderatorPanel.selectScore("unknowns", 1);

      // Participant only partially completes
      await participantPanel.selectScore("complexity", 2);

      let dialogMessage = "";
      moderatorRoom.getPage().on("dialog", async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await moderatorRoom.revealVotes();

      // Verify warning does NOT include participant name
      expect(dialogMessage).not.toContain(participantName);
      expect(dialogMessage).toContain(
        "1 of 2 users haven't completed all voting criteria",
      );
    } finally {
      await cleanup();
    }
  });

  test("allows moderator to proceed after accepting warning", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, roomOptions);
    const { moderatorRoom, participantRoom, cleanup, moderatorName } = setup;

    const moderatorPanel = new StructuredVotingPanel(moderatorRoom.getPage());
    const participantPanel = new StructuredVotingPanel(
      participantRoom.getPage(),
    );

    try {
      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      // Moderator completes all criteria
      await moderatorPanel.selectScore("complexity", 3);
      await moderatorPanel.selectScore("confidence", 2);
      await moderatorPanel.selectScore("volume", 2);
      await moderatorPanel.selectScore("unknowns", 1);
      await moderatorPanel.expectStoryPoints(5);

      // Participant only partially completes
      await participantPanel.selectScore("complexity", 2);

      // Accept the warning dialog
      moderatorRoom.getPage().on("dialog", async (dialog) => {
        expect(dialog.message()).toContain(
          "Are you sure you want to show votes?",
        );
        await dialog.accept();
      });

      await moderatorRoom.revealVotes();

      // Votes should now be visible
      await moderatorRoom.expectVoteVisible(moderatorName, "5");
      await moderatorRoom.expectResultsVisible();
    } finally {
      await cleanup();
    }
  });
});
