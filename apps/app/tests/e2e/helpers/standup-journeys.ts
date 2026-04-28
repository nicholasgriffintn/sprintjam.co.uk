import type { Browser, BrowserContext } from "@playwright/test";

import { StandupCreatePage } from "../pageObjects/standup-create-page";
import { StandupJoinPage } from "../pageObjects/standup-join-page";
import { StandupRoomPage } from "../pageObjects/standup-room-page";

export interface StandupSetupOptions {
  passcode?: string;
  facilitatorName?: string;
  participantName?: string;
}

export interface StandupSetupResult {
  facilitatorRoom: StandupRoomPage;
  participantRoom: StandupRoomPage;
  facilitatorContext: BrowserContext;
  participantContext: BrowserContext;
  standupKey: string;
  facilitatorName: string;
  participantName: string;
  cleanup: () => Promise<void>;
}

export async function createStandupWithParticipant(
  browser: Browser,
  options: StandupSetupOptions = {},
): Promise<StandupSetupResult> {
  const {
    passcode,
    facilitatorName = "Facilitator QA",
    participantName = "Participant QA",
  } = options;

  const facilitatorContext = await browser.newContext();
  const participantContext = await browser.newContext();

  const cleanup = async () => {
    await Promise.all([
      facilitatorContext.close().catch(() => {}),
      participantContext.close().catch(() => {}),
    ]);
  };

  try {
    const facilitatorPage = await facilitatorContext.newPage();
    const participantPage = await participantContext.newPage();

    const createPage = new StandupCreatePage(facilitatorPage);
    await createPage.goto();
    await createPage.fillName(facilitatorName);
    if (passcode) {
      await createPage.fillPasscode(passcode);
    }
    await createPage.submit();
    await createPage.waitForRoom();

    const facilitatorRoom = new StandupRoomPage(facilitatorPage);
    await facilitatorRoom.waitForLoaded();
    await facilitatorRoom.dismissRecoveryPasskeyModalIfPresent();

    const standupKey = await facilitatorRoom.getRoomKey();

    const joinPage = new StandupJoinPage(participantPage);
    await joinPage.goto(standupKey);
    await joinPage.fillName(participantName);
    if (passcode) {
      await joinPage.fillPasscode(passcode);
    }
    await joinPage.submit();
    await joinPage.waitForRoom();

    const participantRoom = new StandupRoomPage(participantPage);
    await participantRoom.waitForLoaded();

    return {
      facilitatorRoom,
      participantRoom,
      facilitatorContext,
      participantContext,
      standupKey,
      facilitatorName,
      participantName,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
