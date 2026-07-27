import { strToU8, zip } from "fflate";
import { colorFamily, matchPaletteName } from "@/lib/library/color";
import { ShaderRenderer } from "@/lib/shader/renderer";
import type { ShaderConfig } from "@/lib/shader/schema";
import {
  clipExtension,
  renderClipBlob,
  safeName,
  type ExportResult,
  type ExportSettings,
} from "./encode";

export type GroupBy = "family" | "palette" | "speed" | "colorFamily" | "none";

export type ClipExt = "mp4" | "webm";

/** Folder a clip lands in for the chosen grouping axis ("" = archive root). */
export function groupFolder(config: ShaderConfig, groupBy: GroupBy): string {
  switch (groupBy) {
    case "family":
      return config.family;
    case "speed":
      return `speed-${config.speed}`;
    case "colorFamily":
      return colorFamily(config.colors);
    case "palette":
      return safeName(matchPaletteName(config.colors) ?? "custom");
    case "none":
      return "";
  }
}

/** Unique per-clip base filename — seed disambiguates same-named designs. */
export function clipBasename(config: ShaderConfig, settings: ExportSettings): string {
  return `${safeName(config.name)}-seed${config.seed}-${settings.width}x${settings.height}`;
}

/** The `?seed=&family=` deep link (best-effort quick preview, not authoritative). */
export function clipUrl(config: ShaderConfig): string {
  return `/?seed=${config.seed}&family=${config.family}`;
}

/** Full sidecar metadata object written next to each clip. */
export function clipMetadata(
  config: ShaderConfig,
  settings: ExportSettings,
  ext: ClipExt,
) {
  return {
    name: config.name,
    family: config.family,
    seed: config.seed,
    speed: config.speed,
    duration: config.duration,
    scale: config.scale,
    complexity: config.complexity,
    warp: config.warp,
    grain: config.grain,
    vignette: config.vignette,
    colors: config.colors,
    palette: matchPaletteName(config.colors),
    colorFamily: colorFamily(config.colors),
    resolution: `${settings.width}x${settings.height}`,
    fps: settings.fps,
    format: ext,
    url: clipUrl(config),
    // Authoritative reproduction handle — matrix items deviate from
    // randomConfig(seed), so the full config is what reloads them exactly.
    config,
  };
}

export interface LibraryEntry {
  config: ShaderConfig;
  group: string;
  videoPath: string;
  jsonPath: string;
  meta: ReturnType<typeof clipMetadata>;
}

/**
 * Deterministic plan of every archive entry: which folder, which paths, and the
 * sidecar metadata — with in-folder filename collisions disambiguated by suffix.
 * Pure and GPU-free so it can be unit-tested; exportLibrary renders against it so
 * the video files and the manifest always agree on paths.
 */
export function libraryEntries(
  configs: ShaderConfig[],
  settings: ExportSettings,
  groupBy: GroupBy,
  ext: ClipExt,
): LibraryEntry[] {
  const used = new Set<string>();
  return configs.map((config) => {
    const group = groupFolder(config, groupBy);
    let base = clipBasename(config, settings);
    const dir = group ? `${group}/` : "";
    if (used.has(`${dir}${base}`)) {
      let n = 2;
      while (used.has(`${dir}${base}-${n}`)) n++;
      base = `${base}-${n}`;
    }
    used.add(`${dir}${base}`);
    return {
      config,
      group,
      videoPath: `${dir}${base}.${ext}`,
      jsonPath: `${dir}${base}.json`,
      meta: clipMetadata(config, settings, ext),
    };
  });
}

export interface LibraryManifest {
  app: "jedylabs";
  generatedAt: string;
  groupedBy: GroupBy;
  settings: { width: number; height: number; fps: number; format: ClipExt };
  count: number;
  items: {
    file: string;
    group: string | null;
    name: string;
    family: string;
    seed: number;
    speed: number;
    palette: string | null;
    colorFamily: string;
  }[];
}

export function buildManifest(
  configs: ShaderConfig[],
  settings: ExportSettings,
  groupBy: GroupBy,
  ext: ClipExt,
  generatedAt: string = new Date().toISOString(),
): LibraryManifest {
  const entries = libraryEntries(configs, settings, groupBy, ext);
  return {
    app: "jedylabs",
    generatedAt,
    groupedBy: groupBy,
    settings: { width: settings.width, height: settings.height, fps: settings.fps, format: ext },
    count: entries.length,
    items: entries.map((e) => ({
      file: e.videoPath,
      group: e.group || null,
      name: e.config.name,
      family: e.config.family,
      seed: e.config.seed,
      speed: e.config.speed,
      palette: e.meta.palette,
      colorFamily: e.meta.colorFamily,
    })),
  };
}

/** Two-level progress: which clip, and how far through the current clip. */
export type LibraryProgress = (
  clipIndex: number,
  clipCount: number,
  intraPct: number,
) => void;

function zipStore(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // level 0 = store; video is already compressed, so deflate wastes CPU.
    zip(files, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

/**
 * Render every config to a clip and pack them into one store-only ZIP with
 * per-clip sidecar JSON and a manifest, grouped by the chosen axis. Reuses a
 * single WebGL context across all clips (the batch owns the renderer).
 */
export async function exportLibrary(
  configs: ShaderConfig[],
  settings: ExportSettings,
  opts: { groupBy: GroupBy },
  onProgress: LibraryProgress,
  signal?: AbortSignal,
): Promise<ExportResult> {
  if (configs.length === 0) throw new Error("The library is empty");
  const { width, height } = settings;
  const ext = clipExtension(settings);
  const entries = libraryEntries(configs, settings, opts.groupBy, ext);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const renderer = new ShaderRenderer(canvas, { preserveDrawingBuffer: true });
  const files: Record<string, Uint8Array> = {};

  try {
    for (let i = 0; i < entries.length; i++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const entry = entries[i];
      const blob = await renderClipBlob(
        renderer,
        canvas,
        entry.config,
        settings,
        (done, total) => onProgress(i, entries.length, Math.round((done / total) * 100)),
        signal,
      );
      files[entry.videoPath] = new Uint8Array(await blob.arrayBuffer());
      files[entry.jsonPath] = strToU8(JSON.stringify(entry.meta, null, 2));
    }
    const manifest = buildManifest(configs, settings, opts.groupBy, ext);
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
    const zipped = await zipStore(files);
    // Copy into a fresh ArrayBuffer so the Blob doesn't retain fflate's buffer.
    const blob = new Blob([zipped.slice()], { type: "application/zip" });
    return { blob, filename: `jedylabs-library-${entries.length}-clips.zip` };
  } finally {
    renderer.dispose({ releaseContext: true });
  }
}
