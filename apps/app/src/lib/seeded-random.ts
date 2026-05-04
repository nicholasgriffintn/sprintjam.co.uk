const UINT32_RANGE = 0x100000000;

export type SeededRandom = {
  next: () => number;
  int: (maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };

  return {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    pick: (items) => items[Math.floor(next() * items.length)]!,
  };
}
