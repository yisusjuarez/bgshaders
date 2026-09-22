import { describe, expect, it } from "vitest";
import {
  applyMotionDNA,
  buildCreativePack,
  durationFromTempo,
  MOTION_PROFILES,
  type PackOptions,
} from "../pack";
import { randomConfig } from "@/lib/shader/random";
import { shaderConfigSchema } from "@/lib/shader/schema";

const options: PackOptions = {
  name: "Neon Systems",
  count: 12,
  baseSeed: 123_000,
  motionDNA: "tech",
  colors: ["#050816", "#00d9ff", "#a3ff12"],
  bpm: 120,
  beats: 16,
  layered: true,
};

describe("durationFromTempo", () => {
  it("maps a whole beat count to an exact duration", () => {
    expect(durationFromTempo(120, 16)).toBe(8);
    expect(durationFromTempo(240, 8)).toBe(2);
    expect(durationFromTempo(60, 16)).toBe(16);
  });
});

describe("buildCreativePack", () => {
  it("builds a deterministic, schema-valid collection", () => {
    const first = buildCreativePack(options);
    const second = buildCreativePack(options);
    expect(first).toEqual(second);
    expect(first).toHaveLength(12);
    for (const config of first) {
      expect(shaderConfigSchema.safeParse(config).success).toBe(true);
    }
  });

  it("locks art direction while varying families and seeds", () => {
    const pack = buildCreativePack(options);
    const pool = MOTION_PROFILES.tech.families;
    expect(new Set(pack.map((config) => config.seed)).size).toBe(pack.length);
    expect(new Set(pack.map((config) => config.family)).size).toBeGreaterThan(3);
    for (const config of pack) {
      expect(pool).toContain(config.family);
      expect(pool).toContain(config.secondaryFamily);
      expect(config.colors).toEqual(options.colors);
      expect(config.motionDNA).toBe("tech");
      expect(config.duration).toBe(8);
      expect(config.name).toMatch(/^Neon Systems \d{2}$/);
    }
  });

  it("can create single-layer editions", () => {
    const pack = buildCreativePack({ ...options, layered: false });
    expect(pack.every((config) => config.secondaryFamily === null)).toBe(true);
  });
});

describe("applyMotionDNA", () => {
  it("applies the profile and musical timing to an existing design", () => {
    const result = applyMotionDNA(randomConfig(4), "calm");
    expect(result.motionDNA).toBe("calm");
    expect(result.bpm).toBe(MOTION_PROFILES.calm.bpm);
    expect(result.duration).toBe(
      durationFromTempo(MOTION_PROFILES.calm.bpm, MOTION_PROFILES.calm.beats),
    );
  });
});
