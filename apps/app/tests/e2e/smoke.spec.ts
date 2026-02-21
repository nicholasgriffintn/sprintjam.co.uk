import { test, expect, type Locator, type Page } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";
import { SettingsModal } from "./pageObjects/settings-modal";
import { StructuredVotingPanel } from "./pageObjects/structured-voting-panel";

async function addTicketFromQueueDialog(dialog: Locator, title: string) {
  await dialog.getByTestId("queue-toggle-add").click();
  await dialog.getByPlaceholder("Ticket title").fill(title);
  await dialog.getByTestId("queue-add-confirm").click();
}

async function openCompleteSessionDialog(page: Page) {
  await page.getByTestId("complete-session-button").click();
  const dialog = page.getByRole("dialog", { name: "Complete session" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function moveToNextTicket(page: Page) {
  await page.getByTestId("next-ticket-button").click();
  const reviewDialog = page.getByRole("dialog", {
    name: "Review before moving on",
  });
  await expect(reviewDialog).toBeVisible();
  await reviewDialog.getByTestId("pre-pointing-confirm").click();
  await expect(reviewDialog).toBeHidden();
}

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

  test("structured voting journey: score and reveal", async ({ browser }) => {
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

  test("completion journey (reset rounds): tracks rounds in read-only summary", async ({
    browser,
  }) => {
    test.slow();

    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();
      const settingsModal = new SettingsModal(page);

      await settingsModal.open();
      await settingsModal.toggle("settings-toggle-enable-queue", false);
      await settingsModal.save();

      await moderatorRoom.castVote("5");
      await participantRoom.castVote("3");
      await moderatorRoom.revealVotes();
      await moderatorRoom.resetVotes();

      await moderatorRoom.castVote("8");
      await participantRoom.castVote("5");
      await moderatorRoom.revealVotes();

      const completeDialog = await openCompleteSessionDialog(page);
      await expect(
        completeDialog.getByTestId("queue-history-tab-panel"),
      ).toHaveCount(0);
      await completeDialog.getByRole("button", { name: "Complete session" }).click();

      await expect(page.getByText("Session summary")).toBeVisible();
      await expect(page.getByText("Rounds completed")).toBeVisible();
      await expect(
        page.getByText("No completed rounds recorded for this session."),
      ).toHaveCount(0);
      await expect(page.getByText(/ROUND-\d+/).first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("completion journey (ticket queue): tracks completed tickets and rounds", async ({
    browser,
  }) => {
    test.slow();

    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, participantRoom, cleanup } = setup;

    const ticketOneTitle = "Smoke Queue Ticket One";
    const ticketTwoTitle = "Smoke Queue Ticket Two";

    try {
      const page = moderatorRoom.getPage();

      await moderatorRoom.openQueueModal();
      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await addTicketFromQueueDialog(queueDialog, ticketOneTitle);
      await addTicketFromQueueDialog(queueDialog, ticketTwoTitle);
      await queueDialog.getByRole("button", { name: "Start Voting" }).first().click();
      await page.keyboard.press("Escape");

      await moderatorRoom.castVote("5");
      await participantRoom.castVote("3");
      await moderatorRoom.revealVotes();
      await moveToNextTicket(page);

      await moderatorRoom.castVote("8");
      await participantRoom.castVote("5");
      await moderatorRoom.revealVotes();

      const completeDialog = await openCompleteSessionDialog(page);
      await expect(completeDialog.getByTestId("queue-history-tab-panel")).toBeVisible();
      await expect(completeDialog).toContainText("Round history");
      await expect(completeDialog).toContainText("Completed tickets");
      await expect(completeDialog).toContainText(ticketOneTitle);
      await completeDialog.getByRole("button", { name: "Complete session" }).click();

      await expect(page.getByText("Session summary")).toBeVisible();
      await expect(
        page.getByText("No completed tickets or rounds recorded for this session."),
      ).toHaveCount(0);
      await expect(page.getByText(ticketOneTitle).first()).toBeVisible();
      await expect(page.getByText(ticketTwoTitle).first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("completion journey (mixed reset + queue): tracks both reset and ticket transitions", async ({
    browser,
  }) => {
    test.slow();

    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, participantRoom, cleanup } = setup;

    const ticketOneTitle = "Smoke Mixed Ticket One";
    const ticketTwoTitle = "Smoke Mixed Ticket Two";

    try {
      const page = moderatorRoom.getPage();

      await moderatorRoom.openQueueModal();
      const queueDialog = page.getByRole("dialog", { name: "Ticket Queue" });
      await addTicketFromQueueDialog(queueDialog, ticketOneTitle);
      await addTicketFromQueueDialog(queueDialog, ticketTwoTitle);
      await queueDialog.getByRole("button", { name: "Start Voting" }).first().click();
      await page.keyboard.press("Escape");

      await moderatorRoom.castVote("5");
      await participantRoom.castVote("3");
      await moderatorRoom.revealVotes();
      await moderatorRoom.resetVotes();

      await moderatorRoom.castVote("8");
      await participantRoom.castVote("5");
      await moderatorRoom.revealVotes();
      await moveToNextTicket(page);

      await moderatorRoom.castVote("3");
      await participantRoom.castVote("2");
      await moderatorRoom.revealVotes();

      const completeDialog = await openCompleteSessionDialog(page);
      await expect(completeDialog.getByTestId("queue-history-tab-panel")).toBeVisible();
      await expect(completeDialog).toContainText("Reset round");
      await expect(completeDialog).toContainText("Next ticket");
      await expect(completeDialog).toContainText(ticketOneTitle);
      await completeDialog.getByRole("button", { name: "Complete session" }).click();

      await expect(page.getByText("Session summary")).toBeVisible();
      await expect(
        page.getByText("No completed tickets or rounds recorded for this session."),
      ).toHaveCount(0);
      await expect(page.getByText(ticketOneTitle).first()).toBeVisible();
      await expect(page.getByText(ticketTwoTitle).first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
