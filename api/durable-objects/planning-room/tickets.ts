import type { TicketQueueItem } from '../../db/types';
import type { PlanningRoom } from '.';
import {
  createAutoTicket,
  getQueueWithPrivacy,
  logVotesForTicket,
  promoteNextPendingTicket,
  resetVotingState,
  shouldAnonymizeVotes,
} from './room-helpers';

export async function handleNextTicket(room: PlanningRoom, userName: string) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (!roomData.settings.enableTicketQueue) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToManageQueue
  ) {
    return;
  }

  const currentTicket = roomData.currentTicket;

  const queue = getQueueWithPrivacy(room, roomData);

  logVotesForTicket(room, currentTicket, roomData);

  if (currentTicket && currentTicket.status === 'in_progress') {
    room.repository.updateTicket(currentTicket.id, {
      status: 'completed',
      completedAt: Date.now(),
    });
  }

  let nextTicket: TicketQueueItem | null = promoteNextPendingTicket(
    room,
    roomData,
    queue
  );

  if (!nextTicket) {
    nextTicket = createAutoTicket(room, roomData, queue);
  }

  room.repository.setCurrentTicket(nextTicket ? nextTicket.id : null);

  resetVotingState(room, roomData);

  const updatedQueue = getQueueWithPrivacy(room, roomData);

  room.broadcast({
    type: 'nextTicket',
    ticket: nextTicket,
    queue: updatedQueue,
  });
}

export async function handleAddTicket(
  room: PlanningRoom,
  userName: string,
  ticket: Partial<TicketQueueItem>
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (!roomData.settings.enableTicketQueue) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToManageQueue
  ) {
    return;
  }

  const queue = room.repository.getTicketQueue();
  const maxOrdinal = Math.max(0, ...queue.map((t) => t.ordinal));

  const externalServiceForTicket = ticket.externalService ?? 'none';

  const ticketId =
    ticket.ticketId ||
    room.repository.getNextTicketId({
      externalService: externalServiceForTicket,
    });

  if (ticketId) {
    const existingWithKey = room.repository.getTicketByTicketKey(ticketId);
    if (existingWithKey) {
      room.broadcast({
        type: 'error',
        error: `Ticket ${ticketId} already exists in the queue`,
      });
      return;
    }

    const newTicket = room.repository.createTicket({
      ticketId,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status || 'pending',
      ordinal: ticket.ordinal ?? maxOrdinal + 1,
      externalService: externalServiceForTicket,
      externalServiceId: ticket.externalServiceId,
      externalServiceMetadata: ticket.externalServiceMetadata,
    });

    if (newTicket) {
      const updatedQueue = room.repository.getTicketQueue({
        anonymizeVotes: shouldAnonymizeVotes(roomData),
      });

      room.broadcast({
        type: 'ticketAdded',
        ticket: newTicket,
        queue: updatedQueue,
      });
    }
  }
}

export async function handleUpdateTicket(
  room: PlanningRoom,
  userName: string,
  ticketId: number,
  updates: Partial<TicketQueueItem>
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (!roomData.settings.enableTicketQueue) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToManageQueue
  ) {
    return;
  }

  const currentTicket = room.repository.getTicketById(ticketId);
  if (!currentTicket) {
    return;
  }

  if (
    updates.ticketId &&
    updates.ticketId !== currentTicket.ticketId &&
    room.repository.getTicketByTicketKey(updates.ticketId)
  ) {
    room.broadcast({
      type: 'error',
      error: `Ticket ${updates.ticketId} already exists in the queue`,
    });
    return;
  }

  if (updates.ordinal !== undefined) {
    const queue = room.repository.getTicketQueue();
    const conflicting = queue.find(
      (t) => t.id !== ticketId && t.ordinal === updates.ordinal
    );

    if (conflicting) {
      room.repository.updateTicket(conflicting.id, {
        ordinal: currentTicket.ordinal,
      });
    }
  }

  room.repository.updateTicket(ticketId, updates);
  const updatedTicket = room.repository.getTicketById(ticketId, {
    anonymizeVotes: shouldAnonymizeVotes(roomData),
  });

  if (!updatedTicket) {
    return;
  }

  const updatedQueue = room.repository.getTicketQueue({
    anonymizeVotes: shouldAnonymizeVotes(roomData),
  });

  room.broadcast({
    type: 'ticketUpdated',
    ticket: updatedTicket,
    queue: updatedQueue,
  });
}

export async function handleDeleteTicket(
  room: PlanningRoom,
  userName: string,
  ticketId: number
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (!roomData.settings.enableTicketQueue) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToManageQueue
  ) {
    return;
  }

  if (roomData.currentTicket?.id === ticketId) {
    return;
  }

  room.repository.deleteTicket(ticketId);
  const updatedQueue = room.repository.getTicketQueue({
    anonymizeVotes: shouldAnonymizeVotes(roomData),
  });

  room.broadcast({
    type: 'ticketDeleted',
    ticketId,
    queue: updatedQueue,
  });
}

export async function handleCompleteTicket(
  room: PlanningRoom,
  userName: string,
  outcome?: string
) {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (!roomData.settings.enableTicketQueue) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToManageQueue
  ) {
    return;
  }

  const currentTicket = roomData.currentTicket;
  if (!currentTicket) {
    return;
  }

  logVotesForTicket(room, currentTicket, roomData);

  room.repository.updateTicket(currentTicket.id, {
    status: 'completed',
    outcome,
    completedAt: Date.now(),
  });

  resetVotingState(room, roomData);

  const queueAfterCompletion = getQueueWithPrivacy(room, roomData);
  const nextTicket =
    promoteNextPendingTicket(room, roomData, queueAfterCompletion) || null;

  room.repository.setCurrentTicket(nextTicket ? nextTicket.id : null);

  const updatedQueue = getQueueWithPrivacy(room, roomData);

  room.broadcast({
    type: 'ticketCompleted',
    ticket: nextTicket,
    queue: updatedQueue,
  });
}
