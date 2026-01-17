import type { PlanningRoom } from '.';

export async function handleCompleteSession(
  room: PlanningRoom,
  userName: string
): Promise<void> {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToManageQueue
  ) {
    return;
  }

  if (roomData.status === 'completed') {
    return;
  }

  room.repository.setRoomStatus('completed');
  room.broadcast({ type: 'roomStatusUpdated', status: 'completed' });
}
