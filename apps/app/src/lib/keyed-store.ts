type StoreSubscription = {
  unsubscribe: () => void;
};

type StoreChangeListener = () => void;

export function createKeyedStore<TValue, TKey extends string | number>(
  getKey: (value: TValue) => TKey,
) {
  const records = new Map<TKey, TValue>();
  const listeners = new Set<StoreChangeListener>();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    get(key: TKey): TValue | undefined {
      return records.get(key);
    },
    has(key: TKey): boolean {
      return records.has(key);
    },
    upsert(value: TValue) {
      records.set(getKey(value), value);
      notify();
    },
    remove(key: TKey) {
      if (records.delete(key)) {
        notify();
      }
    },
    subscribe(
      listener: StoreChangeListener,
      options: { includeInitialState?: boolean } = {},
    ): StoreSubscription {
      listeners.add(listener);

      if (options.includeInitialState) {
        listener();
      }

      return {
        unsubscribe: () => {
          listeners.delete(listener);
        },
      };
    },
  };
}
