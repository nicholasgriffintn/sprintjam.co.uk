import { test, expect } from "@playwright/test";

import { createStandupWithParticipant } from "./helpers/standup-journeys";
import { StandupCreatePage } from "./pageObjects/standup-create-page";
import { StandupJoinPage } from "./pageObjects/standup-join-page";
import { StandupRoomPage } from "./pageObjects/standup-room-page";

test.describe("Standup — create and join", () => {
  test("facilitator can create a room and a participant can join via the key", async ({
    browser,
  }) => {
    const {
      facilitatorRoom,
      participantRoom,
      facilitatorName,
      participantName,
      cleanup,
    } = await createStandupWithParticipant(browser);

    try {
      await facilitatorRoom.expectParticipantVisible(facilitatorName);
      await facilitatorRoom.expectParticipantVisible(participantName);
      await participantRoom.expectParticipantVisible(facilitatorName);
      await participantRoom.expectParticipantVisible(participantName);
    } finally {
      await cleanup();
    }
  });

  test("participant can join directly via the join URL", async ({
    browser,
  }) => {
    const facilitatorContext = await browser.newContext();
    const participantContext = await browser.newContext();

    try {
      const facilitatorPage = await facilitatorContext.newPage();
      const participantPage = await participantContext.newPage();

      const createPage = new StandupCreatePage(facilitatorPage);
      await createPage.goto();
      await createPage.fillName("Host QA");
      await createPage.submit();
      await createPage.waitForRoom();

      const facilitatorRoom = new StandupRoomPage(facilitatorPage);
      await facilitatorRoom.waitForLoaded();
      await facilitatorRoom.dismissRecoveryPasskeyModalIfPresent();
      const standupKey = await facilitatorRoom.getRoomKey();

      const joinPage = new StandupJoinPage(participantPage);
      await joinPage.goto(standupKey);
      await joinPage.fillName("Guest QA");
      await joinPage.submit();
      await joinPage.waitForRoom();

      const participantRoom = new StandupRoomPage(participantPage);
      await participantRoom.waitForLoaded();
      await participantRoom.expectParticipantVisible("Host QA");
    } finally {
      await Promise.all([
        facilitatorContext.close().catch(() => {}),
        participantContext.close().catch(() => {}),
      ]);
    }
  });

  test("join screen shows a passcode error for a protected room", async ({
    browser,
  }) => {
    const context = await browser.newContext();

    try {
      const page = await context.newPage();

      await page.route("**/standups/join", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            error: "PASSCODE_REQUIRED",
            code: "PASSCODE_REQUIRED",
          }),
        }),
      );

      const joinPage = new StandupJoinPage(page);
      await joinPage.goto("XYZ999");
      await joinPage.fillName("Tester QA");
      await joinPage.submit();

      await joinPage.expectAlertMessage(/passcode/i);
    } finally {
      await context.close();
    }
  });
});

test.describe("Standup — response submission", () => {
  test("participant can submit a response and it appears in the results", async ({
    browser,
  }) => {
    const { facilitatorRoom, participantRoom, participantName, cleanup } =
      await createStandupWithParticipant(browser);

    try {
      await participantRoom.setAttendance("remote");
      await participantRoom.fillYesterday("Finished the auth worker");
      await participantRoom.fillToday("Wire the standup UI");
      await participantRoom.setBlocker(false);
      await participantRoom.submitResponse();
      await participantRoom.expectResponseSubmitted();

      await facilitatorRoom.switchToResultsTab();
      await expect(
        facilitatorRoom.getPage().getByText(new RegExp(`1.*submitted`, "i")),
      ).toBeVisible({ timeout: 10_000 });

      await expect(
        facilitatorRoom.getPage().getByText(participantName),
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("facilitator can also submit a response", async ({ browser }) => {
    const { facilitatorRoom, cleanup } =
      await createStandupWithParticipant(browser);

    try {
      await facilitatorRoom.setAttendance("in-person");
      await facilitatorRoom.fillYesterday("Kicked off sprint planning");
      await facilitatorRoom.fillToday("Run the standup");
      await facilitatorRoom.setBlocker(false);
      await facilitatorRoom.submitResponse();
      await facilitatorRoom.expectResponseSubmitted();
    } finally {
      await cleanup();
    }
  });
});

test.describe("Standup — facilitator controls", () => {
  test("facilitator can lock responses and the status badge updates", async ({
    browser,
  }) => {
    const { facilitatorRoom, participantRoom, cleanup } =
      await createStandupWithParticipant(browser);

    try {
      await facilitatorRoom.switchToResultsTab();
      await facilitatorRoom.lockResponses();
      await facilitatorRoom.expectStatusBadge("Locked");
      await participantRoom.expectStatusBadge("Locked");
    } finally {
      await cleanup();
    }
  });

  test("facilitator can start presentation mode after submitting responses", async ({
    browser,
  }) => {
    const { facilitatorRoom, participantRoom, cleanup } =
      await createStandupWithParticipant(browser);

    try {
      await facilitatorRoom.setAttendance("in-person");
      await facilitatorRoom.fillYesterday("Reviewed PRs");
      await facilitatorRoom.fillToday("Lead standup");
      await facilitatorRoom.setBlocker(false);
      await facilitatorRoom.submitResponse();
      await facilitatorRoom.expectResponseSubmitted();

      await facilitatorRoom.switchToResultsTab();
      await facilitatorRoom.startPresentation();
      await facilitatorRoom.expectStatusBadge("Presenting");
      await participantRoom.expectStatusBadge("Presenting");
    } finally {
      await cleanup();
    }
  });

  test("facilitator can complete the standup", async ({ browser }) => {
    const { facilitatorRoom, cleanup } =
      await createStandupWithParticipant(browser);

    try {
      await facilitatorRoom.setAttendance("in-person");
      await facilitatorRoom.fillYesterday("Shipped feature");
      await facilitatorRoom.fillToday("Write tests");
      await facilitatorRoom.setBlocker(false);
      await facilitatorRoom.submitResponse();
      await facilitatorRoom.expectResponseSubmitted();

      await facilitatorRoom.switchToResultsTab();
      await facilitatorRoom.completeStandup();
      await facilitatorRoom.expectCompletedState();
    } finally {
      await cleanup();
    }
  });
});

test.describe("Standup — passcode-protected room", () => {
  test("participant can join a passcode-protected room with the correct code", async ({
    browser,
  }) => {
    const passcode = "standup-qa";
    const { facilitatorRoom, participantName, cleanup } =
      await createStandupWithParticipant(browser, { passcode });

    try {
      await facilitatorRoom.expectParticipantVisible(participantName);
    } finally {
      await cleanup();
    }
  });

  test("join is blocked when an incorrect passcode is supplied", async ({
    browser,
  }) => {
    const facilitatorContext = await browser.newContext();
    const participantContext = await browser.newContext();

    try {
      const facilitatorPage = await facilitatorContext.newPage();
      const participantPage = await participantContext.newPage();

      const createPage = new StandupCreatePage(facilitatorPage);
      await createPage.goto();
      await createPage.fillName("Host QA");
      await createPage.fillPasscode("correct-code");
      await createPage.submit();
      await createPage.waitForRoom();

      const facilitatorRoom = new StandupRoomPage(facilitatorPage);
      await facilitatorRoom.waitForLoaded();
      await facilitatorRoom.dismissRecoveryPasskeyModalIfPresent();
      const standupKey = await facilitatorRoom.getRoomKey();

      const joinPage = new StandupJoinPage(participantPage);
      await joinPage.goto(standupKey);
      await joinPage.fillName("Gate QA");
      await joinPage.fillPasscode("wrong-code");
      await joinPage.submit();
      await joinPage.expectAlertMessage(/incorrect passcode/i);
    } finally {
      await Promise.all([
        facilitatorContext.close().catch(() => {}),
        participantContext.close().catch(() => {}),
      ]);
    }
  });
});
