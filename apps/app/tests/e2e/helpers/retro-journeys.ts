import type { Browser, BrowserContext } from "@playwright/test";

import { RetroCreatePage } from "../pageObjects/retro-create-page";
import { RetroJoinPage } from "../pageObjects/retro-join-page";
import { RetroRoomPage } from "../pageObjects/retro-room-page";

export interface RetroSetupOptions {
  passcode?: string;
  facilitatorName?: string;
  participantName?: string;
}

export interface RetroSetupResult {
  facilitatorRoom: RetroRoomPage;
  participantRoom: RetroRoomPage;
  facilitatorContext: BrowserContext;
  participantContext: BrowserContext;
  retroKey: string;
  facilitatorName: string;
  participantName: string;
  cleanup: () => Promise<void>;
}

export interface FacilitatorRetroSetupResult {
  facilitatorRoom: RetroRoomPage;
  facilitatorContext: BrowserContext;
  retroKey: string;
  facilitatorName: string;
  cleanup: () => Promise<void>;
}

export async function createFacilitatorRetro(
  browser: Browser,
  options: Omit<RetroSetupOptions, "participantName"> = {},
): Promise<FacilitatorRetroSetupResult> {
  const { passcode, facilitatorName = "Retro Host QA" } = options;

  const facilitatorContext = await browser.newContext();
  const cleanup = async () => {
    await facilitatorContext.close().catch(() => {});
  };

  try {
    const facilitatorPage = await facilitatorContext.newPage();

    const createPage = new RetroCreatePage(facilitatorPage);
    await createPage.goto();
    await createPage.fillName(facilitatorName);
    if (passcode) {
      await createPage.fillPasscode(passcode);
    }
    await createPage.submit();
    await createPage.waitForRoom();

    const facilitatorRoom = new RetroRoomPage(facilitatorPage);
    await facilitatorRoom.waitForLoaded();
    const retroKey = await facilitatorRoom.getRetroKey();

    return {
      facilitatorRoom,
      facilitatorContext,
      retroKey,
      facilitatorName,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function createRetroWithParticipant(
  browser: Browser,
  options: RetroSetupOptions = {},
): Promise<RetroSetupResult> {
  const {
    passcode,
    facilitatorName = "Retro Host QA",
    participantName = "Retro Guest QA",
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

    const createPage = new RetroCreatePage(facilitatorPage);
    await createPage.goto();
    await createPage.fillName(facilitatorName);
    if (passcode) {
      await createPage.fillPasscode(passcode);
    }
    await createPage.submit();
    await createPage.waitForRoom();

    const facilitatorRoom = new RetroRoomPage(facilitatorPage);
    await facilitatorRoom.waitForLoaded();
    const retroKey = await facilitatorRoom.getRetroKey();

    const joinPage = new RetroJoinPage(participantPage);
    await joinPage.goto(retroKey);
    await joinPage.fillName(participantName);
    if (passcode) {
      await joinPage.fillPasscode(passcode);
    }
    await joinPage.submit();
    await joinPage.waitForRoom();

    const participantRoom = new RetroRoomPage(participantPage);
    await participantRoom.waitForLoaded();

    return {
      facilitatorRoom,
      participantRoom,
      facilitatorContext,
      participantContext,
      retroKey,
      facilitatorName,
      participantName,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
