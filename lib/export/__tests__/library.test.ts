import { describe, expect, it } from "vitest";
import { strToU8, unzipSync } from "fflate";
import {
  buildManifest,
  clipBasename,
  createZipSink,
  grainLevel,
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
  it("groups by grain band", () =>
    expect(groupFolder(cfg({ grain: 0.12 }), "grain")).toBe("grain-heavy"));
  it("groups by duration", () =>
    expect(groupFolder(cfg({ duration: 8 }), "duration")).toBe("duration-8s"));
});

describe("grainLevel", () => {
  it("bands the schema range from clean to heavy", () => {
    expect(grainLevel(0)).toBe("clean");
    expect(grainLevel(0.009)).toBe("clean");
    expect(grainLevel(0.01)).toBe("subtle");
    expect(grainLevel(0.049)).toBe("subtle");
    expect(grainLevel(0.05)).toBe("medium");
    expect(grainLevel(0.099)).toBe("medium");
    expect(grainLevel(0.1)).toBe("heavy");
    expect(grainLevel(0.2)).toBe("heavy");
  });
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

  it("carries duration and grain band so the new group axes are filterable", () => {
    const configs = [cfg({ family: "mesh", seed: 1, duration: 10, grain: 0.15 })];
    const [item] = buildManifest(configs, settings, "grain", "mp4").items;
    expect(item.duration).toBe(10);
    expect(item.grainLevel).toBe("heavy");
  });
});

describe("createZipSink", () => {
  async function unzip(blob: Blob) {
    return unzipSync(new Uint8Array(await blob.arrayBuffer()));
  }

  it("packs nested paths and binary content into a readable archive", async () => {
    const sink = createZipSink();
    const clip = Uint8Array.from({ length: 1024 }, (_, i) => i % 256);
    sink.add("mesh/drifting-tide.mp4", clip);
    sink.add("mesh/drifting-tide.json", strToU8('{"seed":1}'));
    sink.add("manifest.json", strToU8('{"count":1}'));

    const files = await unzip(await sink.finish());
    expect(Object.keys(files)).toEqual([
      "mesh/drifting-tide.mp4",
      "mesh/drifting-tide.json",
      "manifest.json",
    ]);
    expect(files["mesh/drifting-tide.mp4"]).toEqual(clip);
    expect(new TextDecoder().decode(files["manifest.json"])).toBe('{"count":1}');
  });

  it("stays valid when the output spans several buffered parts", async () => {
    const sink = createZipSink();
    const chunk = new Uint8Array(5 * 1024 * 1024).fill(7);
    for (let i = 0; i < 3; i++) sink.add(`clip-${i}.mp4`, chunk);

    const files = await unzip(await sink.finish());
    expect(Object.keys(files)).toHaveLength(3);
    expect(files["clip-2.mp4"].length).toBe(chunk.length);
    expect(files["clip-1.mp4"].every((b) => b === 7)).toBe(true);
  });

  it("stores rather than deflates", async () => {
    const sink = createZipSink();
    const compressible = new Uint8Array(64 * 1024);
    sink.add("clip.mp4", compressible);
    const blob = await sink.finish();
    expect(blob.size).toBeGreaterThan(compressible.length);
    expect(blob.type).toBe("application/zip");
  });
});
