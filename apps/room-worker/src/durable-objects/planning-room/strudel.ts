import type { RoomData } from '@sprintjam/types';
import {
  determineRoomPhase,
  selectPresetForPhase,
  generateStrudelCode,
  type StrudelGenerateRequest,
} from '@sprintjam/utils';

import type { PlanningRoom } from '.';

export async function handleGenerateStrudel(room: PlanningRoom, userName: string) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (roomData.moderator !== userName) {
    return;
  }

  await generateStrudelTrack(room, roomData, {
    notifyOnError: true,
    logPrefix: 'Failed to generate Strudel code',
  });
}

export async function autoGenerateStrudel(room: PlanningRoom) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  await generateStrudelTrack(room, roomData, {
    logPrefix: 'Failed to auto-generate Strudel code',
  });
}

export async function generateStrudelTrack(
  room: PlanningRoom,
  roomData: RoomData,
  options: { notifyOnError?: boolean; logPrefix?: string } = {}
) {
  const {
    notifyOnError = false,
    logPrefix = 'Failed to generate Strudel code',
  } = options;

  if (!roomData.settings.enableStrudelPlayer) {
    return;
  }

  const apiToken = room.env.POLYCHAT_API_TOKEN;
  if (!apiToken) {
    console.error('POLYCHAT_API_TOKEN not configured');
    if (notifyOnError) {
      room.broadcast({
        type: 'error',
        error: 'Music generation is not configured on this server',
      });
    }
    return;
  }

  try {
    const phase = determineRoomPhase(roomData);
    const preset = selectPresetForPhase(phase);

    const request: StrudelGenerateRequest = {
      prompt: preset.prompt,
      style: preset.style,
      tempo: preset.tempo,
      complexity: preset.complexity,
    };

    const response = await generateStrudelCode(request, apiToken);

    if (!response.code || !response.generationId) {
      throw new Error('Invalid response from music generation service');
    }

    roomData.currentStrudelCode = response.code;
    roomData.currentStrudelGenerationId = response.generationId;
    roomData.strudelPhase = phase;

    room.repository.setStrudelState({
      code: roomData.currentStrudelCode,
      generationId: roomData.currentStrudelGenerationId,
      phase: roomData.strudelPhase,
    });

    room.broadcast({
      type: 'strudelCodeGenerated',
      code: response.code,
      generationId: response.generationId,
      phase,
    });
  } catch (error) {
    console.error(`${logPrefix}:`, error);
    if (notifyOnError) {
      room.broadcast({
        type: 'error',
        error:
          error instanceof Error ? error.message : 'Failed to generate music',
      });
    }
  }
}

export async function handleToggleStrudelPlayback(
  room: PlanningRoom,
  userName: string
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (roomData.moderator !== userName) {
    return;
  }

  roomData.strudelIsPlaying = !roomData.strudelIsPlaying;
  room.repository.setStrudelPlayback(!!roomData.strudelIsPlaying);

  room.broadcast({
    type: 'strudelPlaybackToggled',
    isPlaying: !!roomData.strudelIsPlaying,
  });
}
