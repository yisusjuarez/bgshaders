import { describe, expect, it } from "vitest";
import { catalogConfig, CREATIVE_STYLES, curatedConfig } from "../catalog";
import { randomConfig, TUNING } from "../random";
import { CREATIVE_FAMILIES, FAMILIES, normalizeActiveConfig, shaderConfigSchema, type Family } from "../schema";
import { layeredFragmentSource } from "../glsl";
import legacySeeds from "./legacy-seeds.json";
import { buildMatrix } from "@/lib/library/matrix";
import { buildRandomBatch } from "@/lib/library/random-batch";
import { buildCreativePack, MOTION_PROFILES } from "@/lib/creative/pack";
import { PALETTES } from "../palettes";
import { parseLibrary } from "@/lib/library/store";
import { clipMetadata } from "@/lib/export/library";
import { LOOP_CATEGORIES, categoryForFamily } from "../categories";

describe("expanded creative catalog", () => {
  it("preserves exact legacy seeded designs", () => {
    for (const config of legacySeeds) expect(randomConfig(config.seed)).toEqual(config);
  });

  it("covers every active family with deterministic, valid draws", () => {
    const seen = new Set();
    for (let seed = 0; seed < 2000; seed++) {
      const config = catalogConfig(seed);
      expect(config).toEqual(catalogConfig(seed));
      expect(shaderConfigSchema.safeParse(config).success).toBe(true);
      seen.add(config.family);
    }
    expect(seen).toEqual(new Set(FAMILIES));
  });

  it("provides valid authored compositions and independent color arrays", () => {
    for (const family of CREATIVE_FAMILIES) {
      const config = curatedConfig(family);
      expect(shaderConfigSchema.safeParse(config).success).toBe(true);
      config.colors[0] = "#FFFFFF";
      expect(curatedConfig(family).colors).toEqual([...CREATIVE_STYLES[family].palettes[0]]);
      expect(catalogConfig(1, family)).not.toEqual(catalogConfig(2, family));
    }
  });

  it("exposes each active family in exactly one editor category", () => {
    const categorized = LOOP_CATEGORIES.flatMap((category) => [...category.families]);
    expect(categorized).toHaveLength(FAMILIES.length);
    expect(new Set(categorized)).toEqual(new Set(FAMILIES));
    for (const family of FAMILIES) expect(categoryForFamily(family).families).toContain(family);
  });

  it("recovers a removed live type while preserving its edits", () => {
    const original = curatedConfig("tidalGlass");
    for (const removed of ["horizonFold", "graphicPoster", "chromeKnot", "petalBloom", "jellyfish", "coralFan", "origamiFan"]) {
      const stale = { ...original, family: removed as Family };
      const restored = normalizeActiveConfig(stale);
      expect(restored).toEqual({ ...original, family: "mesh" });
      expect(restored.colors).toBe(original.colors);
      expect(shaderConfigSchema.safeParse(restored).success).toBe(true);
      expect(categoryForFamily(stale.family).families).toContain(restored.family);
    }
  });

  it("clears a removed live layer without altering the primary composition", () => {
    const original = curatedConfig("opalWash");
    expect(normalizeActiveConfig({ ...original, secondaryFamily: "horizonFold" as Family })).toEqual(original);
    expect(normalizeActiveConfig({ ...original, family: "accretion" }).family).toBe("starVortex");
  });

  it("retains active config identity and valid secondary layers", () => {
    const config = { ...curatedConfig("rainWindow"), secondaryFamily: "smoke" as const };
    expect(normalizeActiveConfig(config)).toBe(config);
  });

  it("never generates retired families, including explicitly requested draws", () => {
    expect(catalogConfig(421, "accretion").family).toBe("starVortex");
    for (const profile of Object.values(MOTION_PROFILES)) {
      expect(profile.families).not.toContain("accretion");
      expect(profile.families).not.toContain("graphicPoster");
    }
  });

  it("tunes forced legacy families rather than inheriting another style", () => {
    for (const family of ["mesh", "smoke", "noise"] as const) {
      for (const seed of [0, 421, 999_999]) {
        const config = catalogConfig(seed, family);
        expect(config.family).toBe(family);
        for (const key of ["scale", "complexity", "warp"] as const) {
          expect(config[key]).toBeGreaterThanOrEqual(TUNING[family][key][0]);
          expect(config[key]).toBeLessThanOrEqual(TUNING[family][key][1]);
        }
      }
    }
  });

  it("namespaces helpers when a new scene is layered with itself", () => {
    const source = layeredFragmentSource("constellation", "constellation", "screen");
    for (const name of ["scene", "particlePath", "segmentDistance"]) {
      expect(source).toContain(`${name}A(`);
      expect(source).toContain(`${name}B(`);
      expect(source).not.toMatch(new RegExp(`\\b${name}\\(`));
    }
  });

  it("includes new families in Random Batch, Matrix and motion-directed packs", () => {
    expect(buildRandomBatch({ count: 200, baseSeed: 0 }).some((config) => CREATIVE_FAMILIES.includes(config.family as typeof CREATIVE_FAMILIES[number]))).toBe(true);
    const matrix = buildMatrix({ families: [...CREATIVE_FAMILIES], speeds: [1], paletteNames: [PALETTES[0].name], seedsPerCombo: 1 });
    expect(matrix.map((config) => config.family)).toEqual([...CREATIVE_FAMILIES]);
    const seen = new Set();
    for (const motionDNA of Object.keys(MOTION_PROFILES) as (keyof typeof MOTION_PROFILES)[]) {
      const pack = buildCreativePack({ name: "Creative", count: 30, baseSeed: 100, motionDNA, colors: ["#070B12", "#F9F1FF"], bpm: 120, beats: 16, layered: true });
      for (const config of pack) {
        expect(shaderConfigSchema.safeParse(config).success).toBe(true);
        seen.add(config.family);
      }
    }
    for (const family of CREATIVE_FAMILIES) expect(seen.has(family)).toBe(true);
  });

  it("round-trips old and new library entries and export metadata", () => {
    const configs = [randomConfig(421), ...CREATIVE_FAMILIES.map(curatedConfig)];
    expect(parseLibrary(JSON.stringify(configs))).toEqual(configs);
    for (const config of configs) {
      expect(clipMetadata(config, { width: 1920, height: 1080, fps: 30, format: "mp4" }, "mp4").config).toEqual(config);
    }
  });
});
