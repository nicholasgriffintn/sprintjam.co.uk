import { expect, test } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

test.describe("Room onboarding hints", () => {
  test("shows facilitation opt-in", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup } = setup;
    const page = moderatorRoom.getPage();

    try {
      await expect(
        page.getByText("Enable facilitation prompts?", { exact: true }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Not now" }).click();
    } finally {
      await cleanup();
    }
  });

  test("shows first-join hint for participants", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { participantRoom, cleanup } = setup;
    const page = participantRoom.getPage();

    try {
      const hint = page.getByText("First time? Tap any card to vote.", {
        exact: true,
      });
      await expect(hint).toBeVisible();
      await page.getByRole("button", { name: "Got it" }).click();
      await expect(hint).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });

  test("shows structured voting hint when enabled", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableStructuredVotingOnCreate: true,
    });
    const { participantRoom, cleanup } = setup;
    const page = participantRoom.getPage();

    try {
      await expect(
        page.getByText("Structured voting enabled", { exact: true }),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("shows wide-spread hint after reveal", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup } = setup;

    try {
      await moderatorRoom.castVote("1");
      await participantRoom.castVote("13");
      await moderatorRoom.revealVotes();

      await expect(
        moderatorRoom
          .getPage()
          .getByText("Wide spread after reveal", { exact: true }),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});

test.describe("Room help panel", () => {
  test("updates guidance across voting phases", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, cleanup } = setup;
    const page = moderatorRoom.getPage();

    try {
      await page.getByRole("button", { name: "Room help" }).click();
      const panel = page.locator("#room-help-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("Set the story up for success");

      await moderatorRoom.castVote("3");
      await expect(panel).toContainText("Keep votes independent");

      await page.getByRole("button", { name: "Close help panel" }).click();
      await expect(panel).toHaveCount(0);

      await moderatorRoom.revealVotes();

      await page.getByRole("button", { name: "Room help" }).click();
      const reopenedPanel = page.locator("#room-help-panel");
      await expect(reopenedPanel).toContainText("Lock it in");
    } finally {
      await cleanup();
    }
  });

  test("shows wide-spread guidance after reveal", async ({ browser }) => {
    const setup = await createRoomWithParticipant(browser);
    const { moderatorRoom, participantRoom, cleanup } = setup;
    try {
      await moderatorRoom.castVote("1");
      await participantRoom.castVote("13");
      await moderatorRoom.revealVotes();

      const page = moderatorRoom.getPage();
      await page.getByRole("button", { name: "Room help" }).click();
      const panel = page.locator("#room-help-panel");
      await expect(panel).toContainText("Facilitate the extremes");
    } finally {
      await cleanup();
    }
  });
});
