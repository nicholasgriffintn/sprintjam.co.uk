import type { WheelRoom } from '.';
import type { SpinState, SpinResult, WheelSettings } from '@sprintjam/types';
import { generateID } from '@sprintjam/utils';

export async function handleSpin(wheel: WheelRoom, userName: string) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can spin the wheel');
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error('Wheel is already spinning');
  }

  const enabledEntries = wheelData.entries.filter((e) => e.enabled);
  if (enabledEntries.length < 2) {
    throw new Error('Need at least 2 entries to spin');
  }

  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const targetIndex = array[0] % enabledEntries.length;

  const spinState: SpinState = {
    isSpinning: true,
    startedAt: Date.now(),
    targetIndex,
    duration: wheelData.settings.spinDurationMs,
  };

  wheel.repository.setSpinState(spinState);

  wheel.broadcast({
    type: 'spinStarted',
    spinState,
  });

  await wheel.state.storage.setAlarm(Date.now() + spinState.duration);
}

export async function handleSpinComplete(wheel: WheelRoom) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData || !wheelData.spinState?.isSpinning) {
    return;
  }

  const enabledEntries = wheelData.entries.filter((e) => e.enabled);
  const targetIndex = wheelData.spinState.targetIndex;

  if (targetIndex === null || targetIndex >= enabledEntries.length) {
    wheel.repository.setSpinState(null);
    return;
  }

  const winner = enabledEntries[targetIndex];

  const result: SpinResult = {
    id: generateID(),
    winner: winner.name,
    timestamp: Date.now(),
    removedAfter: wheelData.settings.removeWinnerAfterSpin,
  };

  wheel.repository.addResult(result);

  if (wheelData.settings.removeWinnerAfterSpin) {
    wheel.repository.removeEntry(winner.id);
  }

  wheel.repository.setSpinState(null);

  const entries = wheel.repository.getEntries();

  wheel.broadcast({
    type: 'spinEnded',
    result,
    entries,
  });
}

export async function handleResetWheel(wheel: WheelRoom, userName: string) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can reset the wheel');
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error('Cannot reset while spinning');
  }

  wheel.repository.clearResults();
  wheel.repository.clearEntries();
  wheel.repository.setSpinState(null);

  wheel.broadcast({
    type: 'wheelReset',
    entries: [],
    results: [],
  });
}

export async function handleUpdateSettings(
  wheel: WheelRoom,
  userName: string,
  settings: Partial<WheelSettings>,
) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can update settings');
  }

  const newSettings: WheelSettings = {
    ...wheelData.settings,
    ...settings,
  };

  if (newSettings.spinDurationMs < 2000 || newSettings.spinDurationMs > 10000) {
    newSettings.spinDurationMs = Math.max(
      2000,
      Math.min(10000, newSettings.spinDurationMs),
    );
  }

  wheel.repository.setSettings(newSettings);

  wheel.broadcast({
    type: 'settingsUpdated',
    settings: newSettings,
  });
}
