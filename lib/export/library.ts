import { strToU8, Zip, ZipPassThrough } from "fflate";
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

export type GroupBy =
  | "family"
  | "palette"
  | "speed"
  | "colorFamily"
  | "grain"
  | "duration"
  | "none";

export type GrainLevel = "clean" | "subtle" | "medium" | "heavy";

/**
 * Coarse grain bands for grouping "by grain". Schema allows 0..0.2; the bands
 * are narrow at the bottom because that is where the visible difference is.
 */
export function grainLevel(grain: number): GrainLevel {
  if (grain < 0.01) return "clean";
  if (grain < 0.05) return "subtle";
  if (grain < 0.1) return "medium";
  return "heavy";
}

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
    case "grain":
      return `grain-${grainLevel(config.grain)}`;
    case "duration":
      return `duration-${config.duration}s`;
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
    grainLevel: grainLevel(config.grain),
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
    duration: number;
    palette: string | null;
    colorFamily: string;
    grainLevel: GrainLevel;
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
      duration: e.config.duration,
      palette: e.meta.palette,
      colorFamily: e.meta.colorFamily,
      grainLevel: e.meta.grainLevel,
    })),
  };
}

/** Two-level progress: which clip, and how far through the current clip. */
export type LibraryProgress = (
  clipIndex: number,
  clipCount: number,
  intraPct: number,
) => void;

const ZIP_PART_BYTES = 8 * 1024 * 1024;
const ZIP32_MAX_BYTES = 0xffffffff;

export interface ZipSink {
  add(path: string, data: Uint8Array): void;
  finish(): Promise<Blob>;
  terminate(): void;
}

/**
 * Store-only ZIP writer that streams its output straight into Blob parts, so
 * the archive never has to exist as one contiguous heap buffer (which is what
 * made fflate's one-shot zip() throw "Out of memory" on large libraries).
 * Store, not deflate: video is already compressed, so deflate only wastes CPU.
 */
export function createZipSink(): ZipSink {
  const parts: Blob[] = [];
  let pending: Uint8Array<ArrayBuffer>[] = [];
  let pendingBytes = 0;
  let written = 0;
  let failure: Error | null = null;
  let resolveBlob: ((blob: Blob) => void) | null = null;
  let rejectBlob: ((error: Error) => void) | null = null;

  const flushPending = () => {
    if (pendingBytes === 0) return;
    parts.push(new Blob(pending));
    pending = [];
    pendingBytes = 0;
  };

  const abort = (error: Error) => {
    failure ??= error;
    pending = [];
    pendingBytes = 0;
    parts.length = 0;
    rejectBlob?.(failure);
  };

  const zip = new Zip((error, chunk, final) => {
    if (failure) return;
    if (error) {
      abort(error);
      return;
    }
    written += chunk.length;
    // fflate writes 32-bit ZIP offsets, so past 4 GB the archive is silently
    // corrupt rather than merely large.
    if (written > ZIP32_MAX_BYTES) {
      zip.terminate();
      abort(new Error("Archive exceeds the 4 GB ZIP limit — export fewer or shorter clips"));
      return;
    }
    pending.push(chunk as Uint8Array<ArrayBuffer>);
    pendingBytes += chunk.length;
    if (final || pendingBytes >= ZIP_PART_BYTES) flushPending();
    if (final) resolveBlob?.(new Blob(parts, { type: "application/zip" }));
  });

  return {
    add(path, data) {
      if (failure) throw failure;
      const file = new ZipPassThrough(path);
      zip.add(file);
      file.push(data, true);
      if (failure) throw failure;
    },
    finish() {
      return new Promise<Blob>((resolve, reject) => {
        if (failure) {
          reject(failure);
          return;
        }
        resolveBlob = resolve;
        rejectBlob = reject;
        zip.end();
      });
    },
    terminate() {
      zip.terminate();
    },
  };
}

/**
 * Render every config to a clip and pack them into one store-only ZIP with
 * per-clip sidecar JSON and a manifest, grouped by the chosen axis. Reuses a
 * single WebGL context across all clips (the batch owns the renderer). Each
 * clip is streamed into the archive as soon as it is rendered, so peak memory
 * tracks the largest clip rather than the whole library.
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
  const sink = createZipSink();

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
      sink.add(entry.videoPath, new Uint8Array(await blob.arrayBuffer()));
      sink.add(entry.jsonPath, strToU8(JSON.stringify(entry.meta, null, 2)));
    }
    onProgress(entries.length, entries.length, 100);
    const manifest = buildManifest(configs, settings, opts.groupBy, ext);
    sink.add("manifest.json", strToU8(JSON.stringify(manifest, null, 2)));
    return {
      blob: await sink.finish(),
      filename: `jedylabs-library-${entries.length}-clips.zip`,
    };
  } catch (error) {
    sink.terminate();
    throw error;
  } finally {
    renderer.dispose({ releaseContext: true });
  }
}
