import { describe, expect, it } from "vitest";
import {
  buildManifest,
  clipBasename,
  groupFolder,
  libraryEntries,
} from "../library";
import type { ExportSettings } from "../encode";
import { PALETTES } from "@/lib/shader/palettes";
import { randomConfig } from "@/lib/shader/random";
import type { ShaderConfig } from "@/lib/shader/schema";

const settings: ExportSettings = { width: 1280, height: 720, fps: 30, format: "mp4" };

function cfg(over: Partial<ShaderConfig>): ShaderConfig {
  return { ...randomConfig(1), ...over };
}

describe("groupFolder", () => {
  const base = cfg({ family: "kaleido", speed: 2, colors: PALETTES[0].colors });
  it("groups by family", () => expect(groupFolder(base, "family")).toBe("kaleido"));
  it("groups by speed", () => expect(groupFolder(base, "speed")).toBe("speed-2"));
  it("groups by palette name", () =>
    expect(groupFolder(base, "palette")).toBe("deep-sea"));
  it("groups custom colors under 'custom'", () =>
    expect(groupFolder(cfg({ colors: ["#123456", "#654321"] }), "palette")).toBe("custom"));
  it("groups by color family", () =>
    expect(groupFolder(base, "colorFamily")).toBe(groupFolder(base, "colorFamily")));
  it("uses the archive root for 'none'", () =>
    expect(groupFolder(base, "none")).toBe(""));
});

describe("clipBasename", () => {
  it("includes seed and resolution for uniqueness", () => {
    const c = cfg({ name: "Drifting Tide", seed: 421 });
    expect(clipBasename(c, settings)).toBe("drifting-tide-seed421-1280x720");
  });
});

describe("libraryEntries", () => {
  it("builds matching video and json paths in the group folder", () => {
    const c = cfg({ family: "mesh", name: "Quiet Signal", seed: 5 });
    const [e] = libraryEntries([c], settings, "family", "mp4");
    expect(e.videoPath).toBe("mesh/quiet-signal-seed5-1280x720.mp4");
    expect(e.jsonPath).toBe("mesh/quiet-signal-seed5-1280x720.json");
    expect(e.group).toBe("mesh");
  });

  it("disambiguates same-named clips within a folder", () => {
    const a = cfg({ family: "mesh", name: "Twin", seed: 9, colors: PALETTES[0].colors });
    const b = cfg({ family: "mesh", name: "Twin", seed: 9, colors: PALETTES[1].colors });
    const entries = libraryEntries([a, b], settings, "family", "mp4");
    expect(entries[0].videoPath).toBe("mesh/twin-seed9-1280x720.mp4");
    expect(entries[1].videoPath).toBe("mesh/twin-seed9-1280x720-2.mp4");
    expect(new Set(entries.map((e) => e.videoPath)).size).toBe(2);
  });

  it("puts clips at the root for 'none' grouping", () => {
    const [e] = libraryEntries([cfg({ name: "Flat", seed: 1 })], settings, "none", "mp4");
    expect(e.videoPath).toBe("flat-seed1-1280x720.mp4");
  });

  it("carries the full config in the sidecar metadata", () => {
    const c = cfg({ seed: 3 });
    const [e] = libraryEntries([c], settings, "family", "mp4");
    expect(e.meta.config).toEqual(c);
    expect(e.meta.url).toBe(`/?seed=3&family=${c.family}`);
    expect(e.meta.format).toBe("mp4");
  });
});

describe("buildManifest", () => {
  it("reports count, grouping, settings and per-item files", () => {
    const configs = [cfg({ family: "mesh", seed: 1 }), cfg({ family: "silk", seed: 2 })];
    const m = buildManifest(configs, settings, "family", "mp4", "2026-07-20T00:00:00Z");
    expect(m.app).toBe("jedylabs");
    expect(m.count).toBe(2);
    expect(m.groupedBy).toBe("family");
    expect(m.settings).toEqual({ width: 1280, height: 720, fps: 30, format: "mp4" });
    expect(m.items.map((i) => i.file)).toEqual(
      libraryEntries(configs, settings, "family", "mp4").map((e) => e.videoPath),
    );
    expect(m.generatedAt).toBe("2026-07-20T00:00:00Z");
  });
});
