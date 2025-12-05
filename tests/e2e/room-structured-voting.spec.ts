import { test } from "@playwright/test";

import {
  createRoomWithParticipant,
  type RoomSetupOptions,
} from "./helpers/room-journeys";
import { StructuredVotingPanel } from "./pageObjects/structured-voting-panel";

test.describe('Structured voting', () => {
  const roomOptions: RoomSetupOptions = {
    enableStructuredVotingOnCreate: true,
  };

  test('participants can submit structured votes and see calculated story points', async ({
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
      participantRoom.getPage()
    );

    try {
      await moderatorPanel.expectPanelVisible();
      await participantPanel.expectPanelVisible();

      await moderatorPanel.selectScore('complexity', 3);
      await moderatorPanel.selectScore('confidence', 2);
      await moderatorPanel.selectScore('volume', 2);
      await moderatorPanel.selectScore('unknowns', 1);
      await moderatorPanel.expectStoryPoints(5);

      await participantPanel.selectScore('complexity', 2);
      await participantPanel.selectScore('confidence', 2);
      await participantPanel.selectScore('volume', 1);
      await participantPanel.selectScore('unknowns', 0);
      await participantPanel.expectStoryPoints(3);

      await moderatorRoom.revealVotes();
      await moderatorRoom.expectVoteVisible(moderatorName, '5');
      await moderatorRoom.expectVoteVisible(participantName, '3');
    } finally {
      await cleanup();
    }
  });
});
