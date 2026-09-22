import { describe, expect, it } from "vitest";
import {
  addConfigs,
  configSignature,
  parseLibrary,
  removeAt,
} from "../store";
import { randomConfig } from "@/lib/shader/random";

describe("configSignature", () => {
  it("ignores the cosmetic name", () => {
    const a = randomConfig(7);
    const b = { ...a, name: "Totally Different" };
    expect(configSignature(a)).toBe(configSignature(b));
  });

  it("differs when the look differs", () => {
    const a = randomConfig(7);
    const b = { ...a, speed: a.speed === 1 ? 2 : 1 };
    expect(configSignature(a)).not.toBe(configSignature(b));
  });
});

describe("addConfigs", () => {
  it("dedupes by look signature", () => {
    const a = randomConfig(1);
    const list = addConfigs([], [a, { ...a, name: "clone" }]);
    expect(list).toHaveLength(1);
  });

  it("appends genuinely different looks", () => {
    const list = addConfigs([randomConfig(1)], [randomConfig(2)]);
    expect(list).toHaveLength(2);
  });

  it("skips items already present", () => {
    const a = randomConfig(1);
    expect(addConfigs([a], [a])).toHaveLength(1);
  });
});

describe("removeAt", () => {
  it("removes the item at the index", () => {
    const list = [randomConfig(1), randomConfig(2), randomConfig(3)];
    const out = removeAt(list, 1);
    expect(out).toEqual([list[0], list[2]]);
  });
});

describe("parseLibrary", () => {
  it("round-trips a serialized list", () => {
    const list = [randomConfig(1), randomConfig(2)];
    expect(parseLibrary(JSON.stringify(list))).toEqual(list);
  });

  it("returns [] for null / empty", () => {
    expect(parseLibrary(null)).toEqual([]);
    expect(parseLibrary("")).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    expect(parseLibrary("{not json")).toEqual([]);
  });

  it("returns [] when the payload isn't valid configs", () => {
    expect(parseLibrary(JSON.stringify([{ bogus: true }]))).toEqual([]);
    expect(parseLibrary(JSON.stringify({ not: "an array" }))).toEqual([]);
  });

  it("drops removed ridge entries without losing valid saved loops", () => {
    const first = randomConfig(1);
    const legacyRidge = { ...randomConfig(2), family: "ridge" };
    const last = randomConfig(3);
    expect(parseLibrary(JSON.stringify([first, legacyRidge, last]))).toEqual([
      first,
      last,
    ]);
  });

  it("drops individual corrupt entries instead of clearing the tray", () => {
    const valid = randomConfig(4);
    expect(parseLibrary(JSON.stringify([{ bogus: true }, valid]))).toEqual([
      valid,
    ]);
  });

  it("migrates legacy single-layer configs with creative defaults", () => {
    const current = randomConfig(8);
    const legacy = { ...current } as Record<string, unknown>;
    for (const key of [
      "secondaryFamily",
      "blendMode",
      "blendAmount",
      "motionDNA",
      "bpm",
      "beats",
    ]) delete legacy[key];
    const [migrated] = parseLibrary(JSON.stringify([legacy]));
    expect(migrated.secondaryFamily).toBeNull();
    expect(migrated.blendMode).toBe("mix");
    expect(migrated.motionDNA).toBe("fluid");
    expect(migrated.bpm).toBe(120);
  });
});
