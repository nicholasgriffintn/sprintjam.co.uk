import { describe, expect, it } from "vitest";

import { createSeededRandom } from "@/lib/seeded-random";

describe("createSeededRandom", () => {
  it("returns repeatable values for the same seed", () => {
    const first = createSeededRandom(1234);
    const second = createSeededRandom(1234);

    expect([first.next(), first.int(10), first.pick(["a", "b", "c"])]).toEqual([
      second.next(),
      second.int(10),
      second.pick(["a", "b", "c"]),
    ]);
  });

  it("returns different values for different seeds", () => {
    const first = createSeededRandom(1234);
    const second = createSeededRandom(5678);

    expect([first.next(), first.next(), first.next()]).not.toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });
});
