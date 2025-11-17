import type { Browser, BrowserContext } from '@playwright/test';

import { WelcomePage } from '../pageObjects/welcome-page';
import { CreateRoomPage } from '../pageObjects/create-room-page';
import { JoinRoomPage } from '../pageObjects/join-room-page';
import { RoomPage } from '../pageObjects/room-page';

export type ParticipantJoinMode = 'inviteLink' | 'manual';

export interface RoomSetupOptions {
  participantJoinMode?: ParticipantJoinMode;
  roomPasscode?: string;
  enableStructuredVotingOnCreate?: boolean;
}

export interface RoomSetupResult {
  moderatorRoom: RoomPage;
  participantRoom: RoomPage;
  moderatorContext: BrowserContext;
  participantContext: BrowserContext;
  cleanup: () => Promise<void>;
  moderatorName: string;
  participantName: string;
  roomKey: string;
}

export async function createRoomWithParticipant(
  browser: Browser,
  options: RoomSetupOptions = {}
): Promise<RoomSetupResult> {
  const {
    participantJoinMode = 'inviteLink',
    roomPasscode,
    enableStructuredVotingOnCreate,
  } = options;

  const moderatorContext = await browser.newContext();
  const participantContext = await browser.newContext();

  const cleanup = async () => {
    await Promise.all([
      moderatorContext.close().catch(() => {}),
      participantContext.close().catch(() => {}),
    ]);
  };

  const moderatorName = 'Moderator QA';
  const participantName = 'Participant QA';

  try {
    const moderatorPage = await moderatorContext.newPage();
    const participantPage = await participantContext.newPage();

    const welcomeForModerator = new WelcomePage(moderatorPage);
    await welcomeForModerator.gotoHome();
    await welcomeForModerator.startCreateRoom();

    const createRoom = new CreateRoomPage(moderatorPage);
    await createRoom.completeNameStep(moderatorName);
    await createRoom.selectAvatar('avatar-option-robot');

    if (roomPasscode || enableStructuredVotingOnCreate) {
      await createRoom.configureRoomDetails({
        passcode: roomPasscode,
        enableStructuredVoting: enableStructuredVotingOnCreate,
      });
    }

    await createRoom.finishCreation();

    const moderatorRoom = new RoomPage(moderatorPage);
    await moderatorRoom.waitForLoaded();
    const roomKey = await moderatorRoom.getRoomKey();

    const welcomeForParticipant = new WelcomePage(participantPage);
    if (participantJoinMode === 'manual') {
      await welcomeForParticipant.gotoHome();
      await welcomeForParticipant.startJoinRoom();
    } else {
      await welcomeForParticipant.gotoWithInvite(roomKey);
    }

    const joinRoom = new JoinRoomPage(participantPage);
    await joinRoom.completeParticipantDetails({
      name: participantName,
      roomKey,
      passcode: roomPasscode,
    });
    await joinRoom.selectAvatarAndJoin('avatar-option-bird');

    const participantRoom = new RoomPage(participantPage);
    await participantRoom.waitForLoaded();

    await moderatorRoom.waitForParticipants(2);
    await participantRoom.waitForParticipants(2);

    return {
      moderatorRoom,
      participantRoom,
      moderatorContext,
      participantContext,
      cleanup,
      moderatorName,
      participantName,
      roomKey,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
