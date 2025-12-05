import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const effects: Array<() => void | (() => void)> = [];

vi.mock('react', () => ({
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    if (cleanup) {
      effects.push(cleanup);
    }
  },
  useRef: (val: any) => ({ current: val }),
}));

vi.mock('@/constants', () => ({
  AUTH_TOKEN_STORAGE_KEY: 'AUTH_TOKEN',
  ROOM_KEY_STORAGE_KEY: 'ROOM_KEY',
}));

vi.mock('@/lib/api-service', () => ({
  joinRoom: vi.fn(),
}));

vi.mock('@/lib/data/room-store', () => ({
  upsertRoom: vi.fn(),
}));

const storage = new Map<string, string>();
vi.mock('@/utils/storage', () => ({
  safeLocalStorage: {
    get: (key: string) => storage.get(key) ?? null,
    set: (key: string, value: string) => storage.set(key, value),
    remove: (key: string) => storage.delete(key),
  },
}));

import { useAutoReconnect } from './useAutoReconnect';
import { joinRoom } from '@/lib/api-service';

describe('useAutoReconnect', () => {
  const onReconnectSuccess = vi.fn();
  const onReconnectError = vi.fn();
  const onLoadingChange = vi.fn();
  const applyServerDefaults = vi.fn();
  const onAuthTokenRefresh = vi.fn();

  beforeEach(() => {
    storage.clear();
    effects.splice(0, effects.length);
    vi.resetAllMocks();
  });

  it('avoids calling callbacks after cleanup (cancellation guard)', async () => {
    const deferred: any = {};
    (joinRoom as Mock).mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          deferred.resolve = resolve;
          deferred.reject = reject;
        })
    );
    storage.set('ROOM_KEY', 'ROOM1');
    storage.set('AUTH_TOKEN', 'tok');

    useAutoReconnect({
      name: 'alice',
      screen: 'welcome',
      isLoadingDefaults: false,
      selectedAvatar: 'user',
      onReconnectSuccess,
      onReconnectError,
      onLoadingChange,
      applyServerDefaults,
      onAuthTokenRefresh,
    });

    // simulate unmount
    effects.forEach((cleanup) => typeof cleanup === 'function' && cleanup());

    await deferred.resolve?.({
      room: { key: 'ROOM1', moderator: 'alice' },
      defaults: undefined,
      authToken: 'tok-new',
    });

    expect(onReconnectSuccess).not.toHaveBeenCalled();
    expect(onAuthTokenRefresh).not.toHaveBeenCalled();
  });
});
