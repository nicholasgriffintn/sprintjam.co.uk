import type { WheelRoom } from '.';
import { generateID } from '@sprintjam/utils';

export async function handleAddEntry(
  wheel: WheelRoom,
  userName: string,
  name: string,
) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can add entries');
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }

  const entry = {
    id: generateID(),
    name: trimmedName,
    enabled: true,
  };

  wheel.repository.addEntry(entry);

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: 'entriesUpdated',
    entries,
  });
}

export async function handleRemoveEntry(
  wheel: WheelRoom,
  userName: string,
  entryId: string,
) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can remove entries');
  }

  wheel.repository.removeEntry(entryId);

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: 'entriesUpdated',
    entries,
  });
}

export async function handleUpdateEntry(
  wheel: WheelRoom,
  userName: string,
  entryId: string,
  name: string,
) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can update entries');
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }

  wheel.repository.updateEntry(entryId, trimmedName);

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: 'entriesUpdated',
    entries,
  });
}

export async function handleToggleEntry(
  wheel: WheelRoom,
  userName: string,
  entryId: string,
  enabled: boolean,
) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can toggle entries');
  }

  wheel.repository.toggleEntry(entryId, enabled);

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: 'entriesUpdated',
    entries,
  });
}

export async function handleClearEntries(wheel: WheelRoom, userName: string) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can clear entries');
  }

  wheel.repository.clearEntries();

  wheel.broadcast({
    type: 'entriesUpdated',
    entries: [],
  });
}

export async function handleBulkAddEntries(
  wheel: WheelRoom,
  userName: string,
  names: string[],
) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error('Wheel data not found');
  }

  if (wheelData.moderator !== userName) {
    throw new Error('Only the moderator can add entries');
  }

  const validNames = names.map((n) => n.trim()).filter((n) => n.length > 0);

  for (const name of validNames) {
    const entry = {
      id: generateID(),
      name,
      enabled: true,
    };
    wheel.repository.addEntry(entry);
  }

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: 'entriesUpdated',
    entries,
  });
}
