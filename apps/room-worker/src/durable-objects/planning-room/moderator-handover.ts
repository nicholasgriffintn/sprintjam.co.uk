import type { BroadcastMessage, RoomData } from "@sprintjam/types";

import type { PlanningRoom } from ".";

export const MODERATOR_HANDOVER_DELAY_MS = 30_000;

export interface PendingModeratorHandover {
  moderator: string;
  handoverAt: number;
  timeout: ReturnType<typeof setTimeout>;
}

function pickNextModerator(roomData: RoomData): string | undefined {
  return roomData.users
    .filter((user) => roomData.connectedUsers[user])
    .sort((a, b) => a.localeCompare(b))[0];
}

export function toModeratorHandoverPendingMessage(
  pending: PendingModeratorHandover,
): BroadcastMessage {
  return {
    type: "moderatorHandoverPending",
    moderator: pending.moderator,
    handoverAt: pending.handoverAt,
  };
}

async function completeModeratorHandover(
  room: PlanningRoom,
  previousModerator: string,
) {
  room.pendingModeratorHandover = null;

  const roomData = await room.getRoomData();
  if (
    !roomData ||
    roomData.moderator !== previousModerator ||
    roomData.connectedUsers[previousModerator] ||
    !roomData.settings.autoHandoverModerator
  ) {
    return;
  }

  const nextModerator = pickNextModerator(roomData);
  if (!nextModerator) {
    return;
  }

  room.repository.setModerator(nextModerator);
  room.broadcast({
    type: "newModerator",
    moderator: nextModerator,
  });
}

export function scheduleModeratorHandover(
  room: PlanningRoom,
  roomData: RoomData,
) {
  if (room.pendingModeratorHandover || !pickNextModerator(roomData)) {
    return;
  }

  const moderator = roomData.moderator;
  const timeout = setTimeout(() => {
    void completeModeratorHandover(room, moderator).catch((err: unknown) => {
      console.error("Moderator handover failed:", err);
    });
  }, MODERATOR_HANDOVER_DELAY_MS);

  const pending: PendingModeratorHandover = {
    moderator,
    handoverAt: Date.now() + MODERATOR_HANDOVER_DELAY_MS,
    timeout,
  };
  room.pendingModeratorHandover = pending;
  room.broadcast(toModeratorHandoverPendingMessage(pending));
}

export function cancelModeratorHandover(room: PlanningRoom, userName: string) {
  const pending = room.pendingModeratorHandover;
  if (!pending || pending.moderator !== userName) {
    return;
  }

  clearTimeout(pending.timeout);
  room.pendingModeratorHandover = null;
  room.broadcast({
    type: "moderatorHandoverCancelled",
    moderator: pending.moderator,
  });
}
