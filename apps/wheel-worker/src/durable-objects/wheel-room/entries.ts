import type { WheelRoom } from ".";
import { generateID } from "@sprintjam/utils";
import {
  normalizeWheelEntryNames,
  validateWheelEntryName,
  WHEEL_ENTRY_COUNT_MAX,
} from "../../lib/wheel-validation";

export async function handleAddEntry(
  wheel: WheelRoom,
  userName: string,
  name: string,
) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error("Wheel data not found");
  }

  if (wheelData.moderator !== userName) {
    throw new Error("Only the moderator can add entries");
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error("Cannot modify entries while spinning");
  }

  const validationError = validateWheelEntryName(name);
  if (validationError) {
    throw new Error(validationError);
  }

  if (wheelData.entries.length >= WHEEL_ENTRY_COUNT_MAX) {
    throw new Error(
      `Wheel can contain at most ${WHEEL_ENTRY_COUNT_MAX} entries`,
    );
  }

  const entry = {
    id: generateID(),
    name: name.trim(),
    enabled: true,
  };

  wheel.repository.addEntry(entry);

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: "entriesUpdated",
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
    throw new Error("Wheel data not found");
  }

  if (wheelData.moderator !== userName) {
    throw new Error("Only the moderator can remove entries");
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error("Cannot modify entries while spinning");
  }

  wheel.repository.removeEntry(entryId);

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: "entriesUpdated",
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
    throw new Error("Wheel data not found");
  }

  if (wheelData.moderator !== userName) {
    throw new Error("Only the moderator can update entries");
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error("Cannot modify entries while spinning");
  }

  const validationError = validateWheelEntryName(name);
  if (validationError) {
    throw new Error(validationError);
  }

  wheel.repository.updateEntry(entryId, name.trim());

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: "entriesUpdated",
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
    throw new Error("Wheel data not found");
  }

  if (wheelData.moderator !== userName) {
    throw new Error("Only the moderator can toggle entries");
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error("Cannot modify entries while spinning");
  }

  wheel.repository.toggleEntry(entryId, enabled);

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: "entriesUpdated",
    entries,
  });
}

export async function handleClearEntries(wheel: WheelRoom, userName: string) {
  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    throw new Error("Wheel data not found");
  }

  if (wheelData.moderator !== userName) {
    throw new Error("Only the moderator can clear entries");
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error("Cannot modify entries while spinning");
  }

  wheel.repository.clearEntries();

  wheel.broadcast({
    type: "entriesUpdated",
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
    throw new Error("Wheel data not found");
  }

  if (wheelData.moderator !== userName) {
    throw new Error("Only the moderator can add entries");
  }

  if (wheelData.spinState?.isSpinning) {
    throw new Error("Cannot modify entries while spinning");
  }

  const validNames = normalizeWheelEntryNames(names);
  if (validNames.length === 0) {
    return;
  }

  const remainingSlots = Math.max(
    0,
    WHEEL_ENTRY_COUNT_MAX - wheelData.entries.length,
  );

  if (remainingSlots === 0) {
    throw new Error(
      `Wheel can contain at most ${WHEEL_ENTRY_COUNT_MAX} entries`,
    );
  }

  for (const name of validNames.slice(0, remainingSlots)) {
    const entry = {
      id: generateID(),
      name,
      enabled: true,
    };
    wheel.repository.addEntry(entry);
  }

  const entries = wheel.repository.getEntries();
  wheel.broadcast({
    type: "entriesUpdated",
    entries,
  });
}
