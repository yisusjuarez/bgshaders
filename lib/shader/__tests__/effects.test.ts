import { describe, expect, it } from "vitest";
import { DEFAULT_EFFECTS, getShaderEffects, shaderConfigSchema } from "../schema";
import { curatedConfig } from "../catalog";
import { addConfigs, parseLibrary } from "@/lib/library/store";
import { buildManifest, clipMetadata } from "@/lib/export/library";

const config = curatedConfig("metallicWaves");
const effects = { blur: 0.65, glow: 0.4, saturation: 1.25, contrast: 0.85 };
const settings = { width: 1920, height: 1080, fps: 30, format: "mp4" as const };

describe("loop effects persistence", () => {
  it("keeps existing loops neutral without rewriting their stored config", () => {
    expect(getShaderEffects(config)).toEqual(DEFAULT_EFFECTS);
    expect(parseLibrary(JSON.stringify([config]))).toEqual([config]);
    expect(shaderConfigSchema.parse({ ...config, effects: {} }).effects).toEqual(DEFAULT_EFFECTS);
  });

  it("round-trips all effect values in the tray and export reproduction metadata", () => {
    const edited = { ...config, effects };
    expect(parseLibrary(JSON.stringify([edited]))).toEqual([edited]);
    const metadata = clipMetadata(edited, settings, "mp4");
    expect(metadata.config.effects).toEqual(effects);
    expect(metadata.effects).toEqual(effects);
    expect(buildManifest([edited], settings, "catalog", "mp4").items[0].effects).toEqual(effects);
  });

  it("can save an effects variant without treating it as a duplicate", () => {
    for (const changed of [
      { ...DEFAULT_EFFECTS, blur: 0.5 },
      { ...DEFAULT_EFFECTS, glow: 0.5 },
      { ...DEFAULT_EFFECTS, saturation: 0.5 },
      { ...DEFAULT_EFFECTS, contrast: 0.5 },
    ]) {
      expect(addConfigs([config], [{ ...config, effects: changed }])).toHaveLength(2);
    }
    expect(addConfigs([config], [{ ...config, effects: { ...DEFAULT_EFFECTS } }])).toHaveLength(1);
  });

  it("rejects invalid effects without dropping other valid saved loops", () => {
    const invalid = { ...config, effects: { ...effects, blur: 2 } };
    expect(shaderConfigSchema.safeParse(invalid).success).toBe(false);
    expect(parseLibrary(JSON.stringify([invalid, { ...config, effects }]))).toEqual([{ ...config, effects }]);
  });
});
