import { expect, test } from "@playwright/test";

import {
  createFacilitatorRetro,
  createRetroWithParticipant,
} from "./helpers/retro-journeys";
import { enterTextField } from "./helpers/form-fields";
import {
  delayPostResponse,
  expectButtonLoading,
  retroResponse,
} from "./helpers/loading-states";
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
    page,
  }) => {
    await page.goto("/retro/create");
    await enterTextField(page.locator("#retro-create-name"), "Retro Host");

    const releaseCreate = await delayPostResponse(
      page,
      "**/api/retros",
      retroResponse("RET123", "Retro Host"),
    );
    const createSubmit = page.getByRole("button", { name: /create retro/i });
    await createSubmit.click();
    await expectButtonLoading(createSubmit);
    releaseCreate();

    await page.goto("/retro/join/RET123");
    await enterTextField(page.locator("#retro-join-name"), "Retro Guest");

    const releaseJoin = await delayPostResponse(
      page,
      "**/api/retros/join",
      retroResponse("RET123", "Retro Host"),
    );
    const joinSubmit = page.getByRole("button", { name: /join retro/i });
    await joinSubmit.click();
    await expectButtonLoading(joinSubmit);
    releaseJoin();
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
    const actionTitle = "Publish the release checklist";

    try {
      await participantRoom.addCard("Start", cardText);
      await facilitatorRoom.expectCardVisible(cardText);

      await facilitatorRoom.nextPhase();
      await facilitatorRoom.voteForCard(cardText);
      await participantRoom.voteForCard(cardText);
      await facilitatorRoom.expectCardVoteCount(cardText, 2);

      await facilitatorRoom.switchToFocusPhase();
      await facilitatorRoom.addAction(actionTitle);
      await expect(
        participantRoom.getPage().getByText(actionTitle),
      ).toBeVisible({ timeout: 10_000 });

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
    const { facilitatorRoom, cleanup } = await createFacilitatorRetro(browser);

    try {
      await facilitatorRoom.markReady();
    } finally {
      await cleanup();
    }
  });
});
