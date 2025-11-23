import { ClientMessage } from '../types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateClientMessage(
  data: unknown
): ClientMessage | { error: string } {
  if (!isObject(data) || typeof data.type !== 'string') {
    return { error: 'Invalid message format' };
  }

  switch (data.type) {
    case 'vote':
      if ('vote' in data) {
        return { type: 'vote', vote: data.vote as string | number };
      }
      return { error: 'Vote payload missing' };
    case 'showVotes':
      return { type: 'showVotes' };
    case 'resetVotes':
      return { type: 'resetVotes' };
    case 'updateSettings':
      if ('settings' in data && isObject(data.settings)) {
        return { type: 'updateSettings', settings: data.settings };
      }
      return { error: 'Settings payload missing' };
    case 'generateStrudelCode':
      return { type: 'generateStrudelCode' };
    case 'toggleStrudelPlayback':
      return { type: 'toggleStrudelPlayback' };
    case 'nextTicket':
      return { type: 'nextTicket' };
    case 'addTicket':
      if ('ticket' in data && isObject(data.ticket)) {
        return { type: 'addTicket', ticket: data.ticket };
      }
      return { error: 'Ticket payload missing' };
    case 'updateTicket':
      if (
        typeof data.ticketId === 'number' &&
        'updates' in data &&
        isObject(data.updates)
      ) {
        return {
          type: 'updateTicket',
          ticketId: data.ticketId,
          updates: data.updates,
        };
      }
      return { error: 'Ticket update payload invalid' };
    case 'deleteTicket':
      if (typeof data.ticketId === 'number') {
        return { type: 'deleteTicket', ticketId: data.ticketId };
      }
      return { error: 'Ticket delete payload invalid' };
    case 'completeTicket':
      if (
        typeof data.outcome === 'string' ||
        typeof data.outcome === 'undefined'
      ) {
        return { type: 'completeTicket', outcome: data.outcome };
      }
      return { error: 'CompleteTicket outcome must be a string or undefined' };
    case 'startTimer':
      return { type: 'startTimer' };
    case 'pauseTimer':
      return { type: 'pauseTimer' };
    case 'resetTimer':
      return { type: 'resetTimer' };
    case 'ping':
      return { type: 'ping' };
    default:
      return { error: 'Unknown message type' };
  }
}
