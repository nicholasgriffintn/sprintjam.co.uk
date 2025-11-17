type StorageValue = string | null;

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const logStorageError = (action: string, error: unknown) => {
  if (error instanceof Error) {
    console.warn(`localStorage ${action} failed:`, error.message);
  } else {
    console.warn(`localStorage ${action} failed`);
  }
};

export const safeLocalStorage = {
  get(key: string): StorageValue {
    if (!canUseLocalStorage()) {
      return null;
    }

    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      logStorageError('get', error);
      return null;
    }
  },
  set(key: string, value: string): boolean {
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      logStorageError('set', error);
      return false;
    }
  },
  remove(key: string): boolean {
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      logStorageError('remove', error);
      return false;
    }
  },
};
