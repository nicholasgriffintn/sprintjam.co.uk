import { createJsonResponse } from '../../utils/http';
import { sanitizeRoomData } from '../../utils/room-data';
import { applySettingsUpdate } from '../../utils/room-settings';
import { calculateTimerSeconds } from '../../utils/timer';
import { ensureTimerState } from '../../utils/timer-state';

import type { CfResponse, PlanningRoomHttpContext } from './types';

export async function handleResetVotes(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse> {
  const { name } = (await request.json()) as { name: string };

  const roomData = await ctx.getRoomData();

  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: 'Room not found' }, 404);
  }

  if (
    roomData.moderator !== name &&
    !roomData.settings.allowOthersToDeleteEstimates
  ) {
    return createJsonResponse(
      { error: 'Only the moderator can reset votes' },
      403
    );
  }

  roomData.votes = {};
  roomData.structuredVotes = {};
  roomData.showVotes = false;
  roomData.settings = applySettingsUpdate({
    currentSettings: roomData.settings,
  });
  ctx.repository.clearVotes();
  ctx.repository.clearStructuredVotes();
  ctx.repository.setShowVotes(roomData.showVotes);
  ctx.repository.setSettings(roomData.settings);

  ctx.broadcast({ type: 'resetVotes' });

  const timerState = ensureTimerState(roomData);
  if (timerState.autoResetOnVotesReset) {
    const now = Date.now();
    const currentSeconds = calculateTimerSeconds(timerState, now);
    timerState.roundAnchorSeconds = currentSeconds;
    ctx.repository.updateTimerConfig({
      roundAnchorSeconds: currentSeconds,
    });
    ctx.broadcast({
      type: 'timerUpdated',
      timerState,
    });
  }

  return createJsonResponse({
    success: true,
    room: sanitizeRoomData(roomData),
  });
}
