import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  DurableObjectNamespace,
  Fetcher,
  RateLimit,
  DurableObjectState,
  WebSocket as CfWebSocket,
} from '@cloudflare/workers-types';

import { PlanningRoom } from './planning-room';
import type { Env } from '../types';
import { generateSessionToken } from '../utils/security';
import type { RoomData } from '../types';
import { createInitialRoomData } from '../utils/defaults';

const makeState = () =>
  ({
    storage: {
      sql: {} as any,
      transactionSync: vi.fn((fn: () => void) => fn()),
      transaction: vi.fn(async (fn: (txn: any) => void) => fn({ sql: {} })),
      get: vi.fn(),
      put: vi.fn(),
    },
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
  } as unknown as DurableObjectState);

type TestSocket = {
  sent: string[];
  accept: ReturnType<typeof vi.fn>;
  send: (payload: string) => void;
  close: ReturnType<typeof vi.fn>;
  addEventListener: (
    type: string,
    handler: (msg: MessageEvent) => void
  ) => void;
};

const makeSocketPair = () => {
  const server: TestSocket = {
    sent: [],
    accept: vi.fn(),
    send: vi.fn((payload: string) => {
      server.sent.push(payload);
    }),
    close: vi.fn(),
    addEventListener: vi.fn(),
  };
  const client: Partial<CfWebSocket> = {};
  return { server, client: client as CfWebSocket };
};

describe('PlanningRoom WebSocket auth', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      PLANNING_ROOM: {} as DurableObjectNamespace,
      ASSETS: {} as Fetcher,
      JOIN_RATE_LIMITER: {} as RateLimit,
    };
  });

  it('rejects expired tokens with 4003 close', async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token = generateSessionToken();

    const storedRoom: RoomData = createInitialRoomData({
      key: 'room-1',
      users: ['alice'],
      moderator: 'alice',
      connectedUsers: { alice: true },
    });

    room.getRoomData = async () => storedRoom;
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: () => false,
      setUserConnection: vi.fn(),
    } as any;

    const { server } = makeSocketPair();
    await room.handleSession(
      server as unknown as CfWebSocket,
      'room-1',
      'alice',
      token
    );

    expect(server.accept).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalledWith(4003, 'Invalid session token');
    expect(
      server.sent.some((msg) => msg.includes('Invalid or expired session'))
    ).toBe(true);
  });

  it('closes existing sockets when a new session is issued for the same user (4004)', async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token1 = generateSessionToken();

    const storedRoom: RoomData = createInitialRoomData({
      key: 'room-2',
      users: ['bob'],
      moderator: 'bob',
      connectedUsers: { bob: true },
    });

    room.getRoomData = async () => storedRoom;
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: (u: string, t: string) =>
        u.toLowerCase() === 'bob' && t === token1,
      setUserConnection: vi.fn(),
    } as any;

    const { server: ws1 } = makeSocketPair();
    await room.handleSession(
      ws1 as unknown as CfWebSocket,
      'room-2',
      'bob',
      token1
    );

    room.disconnectUserSessions('bob');

    expect(ws1.close).toHaveBeenCalledWith(4004, 'Session superseded');
  });
});
