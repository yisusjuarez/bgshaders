import { describe, expect, it } from "vitest";
import {
  buildRandomBatch,
  MAX_RANDOM_COUNT,
  randomBaseSeed,
} from "../random-batch";
import { randomConfig } from "@/lib/shader/random";
import { shaderConfigSchema } from "@/lib/shader/schema";

describe("buildRandomBatch", () => {
  it("produces exactly the requested count", () => {
    expect(buildRandomBatch({ count: 25, baseSeed: 1 })).toHaveLength(25);
  });

  it("assigns consecutive, unique seeds from the base seed", () => {
    const seeds = buildRandomBatch({ count: 4, baseSeed: 700 }).map((c) => c.seed);
    expect(seeds).toEqual([700, 701, 702, 703]);
  });

  it("wraps seeds without colliding near the top of the range", () => {
    const seeds = buildRandomBatch({ count: 4, baseSeed: 999_998 }).map((c) => c.seed);
    expect(seeds).toEqual([999_998, 999_999, 0, 1]);
    expect(new Set(seeds).size).toBe(4);
  });

  it("is reproducible from the same base seed", () => {
    const a = buildRandomBatch({ count: 6, baseSeed: 42 });
    const b = buildRandomBatch({ count: 6, baseSeed: 42 });
    expect(a).toEqual(b);
  });

  it("applies a duration override to every item", () => {
    for (const c of buildRandomBatch({ count: 8, baseSeed: 5, duration: 12 })) {
      expect(c.duration).toBe(12);
    }
  });

  it("keeps each draw's own duration when none is given", () => {
    const batch = buildRandomBatch({ count: 3, baseSeed: 5 });
    expect(batch.map((c) => c.duration)).toEqual(
      [5, 6, 7].map((s) => randomConfig(s).duration),
    );
  });

  it("clamps the count to a sane range", () => {
    expect(buildRandomBatch({ count: -3, baseSeed: 1 })).toHaveLength(0);
    expect(buildRandomBatch({ count: 2.7, baseSeed: 1 })).toHaveLength(2);
    expect(buildRandomBatch({ count: 5_000, baseSeed: 1 })).toHaveLength(MAX_RANDOM_COUNT);
  });

  it("emits only schema-valid configs", () => {
    for (const c of buildRandomBatch({ count: 30, baseSeed: 900, duration: 6 })) {
      expect(shaderConfigSchema.safeParse(c).success).toBe(true);
    }
  });

  it("draws a different set when the base seed is rerolled", () => {
    const seed = randomBaseSeed();
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(1_000_000);
    expect(buildRandomBatch({ count: 3, baseSeed: 1 })).not.toEqual(
      buildRandomBatch({ count: 3, baseSeed: 2 }),
    );
  });
});
