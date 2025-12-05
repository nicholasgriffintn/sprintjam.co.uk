import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handleHttpRequest } from './planning-room-http';
import { createInitialRoomData } from '../utils/defaults';
import { hashPasscode } from '../utils/security';
import type { RoomData } from '../types';

type TokenMap = Map<string, string>;

const makeContext = (options: {
  roomData: RoomData;
  passcodeHash?: string | null;
  tokens?: TokenMap;
}) => {
  let currentRoom = options.roomData;
  const tokens = options.tokens ?? new Map<string, string>();

  const repository = {
    getPasscodeHash: () => options.passcodeHash ?? null,
    validateSessionToken: (userName: string, token: string | null) => {
      if (!token) return false;
      return tokens.get(userName.toLowerCase()) === token;
    },
    setSessionToken: (userName: string, token: string) => {
      tokens.set(userName.toLowerCase(), token);
    },
    ensureUser: vi.fn(),
    setUserConnection: vi.fn(),
    setUserAvatar: vi.fn(),
  };

  const ctx = {
    repository,
    getRoomData: async () => currentRoom,
    putRoomData: async (room: RoomData) => {
      currentRoom = room;
    },
    broadcast: vi.fn(),
    disconnectUserSessions: vi.fn(),
  };

  return { ctx, tokens };
};

const buildJoinRequest = (body: Record<string, unknown>) =>
  new Request('https://internal/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('planning-room-http join flow', () => {
  let baseRoom: RoomData;

  beforeEach(() => {
    baseRoom = createInitialRoomData({
      key: 'room-123',
      users: ['Alice'],
      moderator: 'Alice',
      connectedUsers: { Alice: false },
    });
  });

  it('rejects when the username is currently connected and no valid token is provided', async () => {
    baseRoom.connectedUsers = { Alice: true };
    const { ctx } = makeContext({ roomData: baseRoom });

    const response = (await handleHttpRequest(
      ctx,
      buildJoinRequest({ name: 'Alice' })
    )) as Response;

    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.error).toMatch(/already connected/i);
  });

  it('allows rejoin with the same name when previously disconnected (no stored token), issuing a new token', async () => {
    baseRoom.connectedUsers = { Alice: false };
    const passcodeHash = await hashPasscode('secret');
    const { ctx, tokens } = makeContext({
      roomData: baseRoom,
      passcodeHash,
    });

    const response = (await handleHttpRequest(
      ctx,
      buildJoinRequest({ name: 'Alice', passcode: 'secret' })
    )) as Response;

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.authToken).toBeTruthy();
    expect(tokens.size).toBe(1);
  });

  it('allows a currently connected username when a valid session token is supplied', async () => {
    baseRoom.connectedUsers = { Alice: true };
    const tokens = new Map<string, string>([['alice', 'valid-token']]);
    const { ctx } = makeContext({ roomData: baseRoom, tokens });

    const response = (await handleHttpRequest(
      ctx,
      buildJoinRequest({ name: 'alice', authToken: 'valid-token' })
    )) as Response;

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
  });
});

