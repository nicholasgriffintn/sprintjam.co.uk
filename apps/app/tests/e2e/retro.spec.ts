import { expect, test } from "@playwright/test";

import {
  createFacilitatorRetro,
  createRetroWithParticipant,
} from "./helpers/retro-journeys";
import {
  delayPostResponse,
  expectButtonLoading,
  retroResponse,
} from "./helpers/loading-states";
import { RetroCreatePage } from "./pageObjects/retro-create-page";
import { RetroJoinPage } from "./pageObjects/retro-join-page";

test.describe("Retro — create and join", () => {
  test("facilitator can create a room and a participant can join via the key", async ({
    browser,
  }) => {
    const {
      facilitatorRoom,
      participantRoom,
      facilitatorName,
      participantName,
      cleanup,
    } = await createRetroWithParticipant(browser);

    try {
      await facilitatorRoom.expectParticipantVisible(facilitatorName);
      await facilitatorRoom.expectParticipantVisible(participantName);
      await participantRoom.expectParticipantVisible(facilitatorName);
      await participantRoom.expectParticipantVisible(participantName);
    } finally {
      await cleanup();
    }
  });

  test("create and join submits show loading while requests are pending", async ({
    browser,
  }) => {
    const createContext = await browser.newContext();
    const joinContext = await browser.newContext();

    try {
      const createBrowserPage = await createContext.newPage();
      const createPage = new RetroCreatePage(createBrowserPage);
      await createPage.goto();
      await createPage.fillName("Retro Host");

      const releaseCreate = await delayPostResponse(
        createBrowserPage,
        "**/api/retros",
        retroResponse("RET123", "Retro Host"),
      );
      const createSubmit = createBrowserPage.getByRole("button", {
        name: /create retro/i,
      });
      await createPage.submit();
      await expectButtonLoading(createSubmit);
      releaseCreate();
      await expect(createBrowserPage).toHaveURL(/\/retro\/room\/RET123$/);

      const joinBrowserPage = await joinContext.newPage();
      const joinPage = new RetroJoinPage(joinBrowserPage);
      await joinPage.goto("RET123");
      await joinPage.fillName("Retro Guest");

      const releaseJoin = await delayPostResponse(
        joinBrowserPage,
        "**/api/retros/join",
        retroResponse("RET123", "Retro Host"),
      );
      const joinSubmit = joinBrowserPage.getByRole("button", {
        name: /join retro/i,
      });
      await joinPage.submit();
      await expectButtonLoading(joinSubmit);
      releaseJoin();
      await expect(joinBrowserPage).toHaveURL(/\/retro\/room\/RET123$/);
    } finally {
      await createContext.close();
      await joinContext.close();
    }
  });

  test("join screen shows a passcode error for a protected room", async ({
    browser,
  }) => {
    const context = await browser.newContext();

    try {
      const page = await context.newPage();

      await page.route("**/api/retros/join", (route) =>
        route.fulfill({
          status: 401,
          headers: {
            "content-type": "application/json",
            "x-error-kind": "passcode",
          },
          body: JSON.stringify({
            error: "Passcode is required",
          }),
        }),
      );

      const joinPage = new RetroJoinPage(page);
      await joinPage.goto("RET123");
      await joinPage.fillName("Retro Tester QA");
      await joinPage.submit();

      await joinPage.expectAlertMessage(/passcode/i);
    } finally {
      await context.close();
    }
  });
});

test.describe("Retro — board collaboration", () => {
  test("participants can add cards, vote, capture actions, and complete the retro", async ({
    browser,
  }) => {
    const { facilitatorRoom, participantRoom, cleanup } =
      await createRetroWithParticipant(browser);
    const cardText = "Pair on the release checklist";
    const movedCardText = "Keep launch notes visible";
    const editedCardText = "Pair on the launch checklist";
    const actionTitle = "Publish the release checklist";

    try {
      await participantRoom.addCard("Start", cardText);
      await participantRoom.addCard("Continue", movedCardText);
      await facilitatorRoom.expectCardVisible(cardText);
      await facilitatorRoom.editCard(cardText, editedCardText);
      await facilitatorRoom.moveCard(movedCardText, "Start");
      await facilitatorRoom.groupCards(
        "Start",
        [editedCardText, movedCardText],
        "Release readiness",
      );

      await facilitatorRoom.nextPhase();
      await facilitatorRoom.voteForCard(editedCardText);
      await participantRoom.voteForCard(editedCardText);
      await facilitatorRoom.expectCardVoteCount(editedCardText, 2);

      await facilitatorRoom.switchToFocusPhase();
      await facilitatorRoom.addAction(actionTitle, {
        owner: "Retro Host QA",
        dueDate: "2026-05-20",
        priority: "high",
      });
      await expect(
        participantRoom.getPage().getByText(actionTitle),
      ).toBeVisible();

      await facilitatorRoom.completeAction(actionTitle);
      await facilitatorRoom.completeRetro();
    } finally {
      await cleanup();
    }
  });

  test("participant can join a passcode-protected retro with the correct code", async ({
    browser,
  }) => {
    const passcode = "retro-qa";
    const { facilitatorRoom, participantName, cleanup } =
      await createRetroWithParticipant(browser, { passcode });

    try {
      await facilitatorRoom.expectParticipantVisible(participantName);
    } finally {
      await cleanup();
    }
  });

  test("facilitator can mark themselves ready", async ({ browser }) => {
    const { facilitatorRoom, facilitatorName, cleanup } =
      await createFacilitatorRetro(browser);

    try {
      await facilitatorRoom.markReady();
      await facilitatorRoom.expectParticipantReady(facilitatorName);
    } finally {
      await cleanup();
    }
  });
});
