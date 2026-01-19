import { test, expect } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { StructuredVotingPanel } from "./pageObjects/structured-voting-panel";

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

  test("ticket queue journey: add ticket and run a round", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const {
      moderatorRoom,
      participantRoom,
      cleanup,
      moderatorName,
      participantName,
    } = setup;

    try {
      const page = moderatorRoom.getPage();
      await page.getByTestId("queue-expand").click();
      await page.getByTestId("queue-toggle-add").click();
      await page.getByPlaceholder("Ticket title").fill("Smoke Ticket");
      await page.getByTestId("queue-add-confirm").click();
      await page.getByTestId("queue-start-voting-1").click();
      await page.keyboard.press("Escape");

      await expect(page.getByTestId("queue-ticket-id-current")).toBeVisible();

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

  test("structured voting journey: score and reveal", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableStructuredVotingOnCreate: true,
    });
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

      await moderatorPanel.selectScore("complexity", 2);
      await moderatorPanel.selectScore("confidence", 2);
      await moderatorPanel.selectScore("volume", 1);
      await moderatorPanel.selectScore("unknowns", 1);

      await participantPanel.selectScore("complexity", 1);
      await participantPanel.selectScore("confidence", 2);
      await participantPanel.selectScore("volume", 1);
      await participantPanel.selectScore("unknowns", 0);

      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(moderatorName, "3");
      await moderatorRoom.expectVoteVisible(participantName, "2");
      await participantRoom.expectResultsVisible();
    } finally {
      await cleanup();
    }
  });
});
