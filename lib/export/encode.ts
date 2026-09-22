import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { ShaderRenderer } from "@/lib/shader/renderer";
import type { ShaderConfig } from "@/lib/shader/schema";

export interface ExportSettings {
  width: number;
  height: number;
  fps: 30 | 60;
  format: "mp4" | "webm";
  quality?: "balanced" | "high" | "master";
}

function targetBitrate(settings: ExportSettings, webm = false): number {
  const multiplier = settings.quality === "master"
    ? 0.34
    : settings.quality === "high"
      ? 0.22
      : webm ? 0.1 : 0.12;
  const cap = settings.quality === "master" ? 80_000_000 : settings.quality === "high" ? 50_000_000 : 30_000_000;
  return Math.min(cap, Math.round(settings.width * settings.height * settings.fps * multiplier));
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

export type ProgressFn = (done: number, total: number) => void;

export function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function avcCodec(width: number, height: number, fps: number): string {
  // High profile; level 4.2 covers 1080p60, 5.1 covers up to 4k.
  return width * height > 1920 * 1080 || (width * height >= 1920 * 1080 && fps > 30)
    ? "avc1.640033"
    : "avc1.64002a";
}

export function webCodecsSupported(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
}

/**
 * Frame-exact MP4 render into a Blob using a caller-owned renderer/canvas.
 * Renders exactly fps*duration frames at phase i/N. Because frame N would equal
 * frame 0, stopping at N-1 makes the file tile seamlessly when a player loops
 * it. The renderer is NOT disposed here — the caller owns its lifecycle so a
 * batch can reuse one WebGL context across many clips.
 */
export async function renderMp4Blob(
  renderer: ShaderRenderer,
  canvas: HTMLCanvasElement,
  config: ShaderConfig,
  settings: ExportSettings,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<Blob> {
  const { width, height, fps } = settings;
  const total = Math.round(config.duration * fps);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e instanceof Error ? e : new Error(String(e));
    },
  });

  const codec = avcCodec(width, height, fps);
  const support = await VideoEncoder.isConfigSupported({
    codec,
    width,
    height,
    framerate: fps,
  });
  if (!support.supported) {
    encoder.close();
    throw new Error(`H.264 encoding not supported for ${width}x${height}@${fps}`);
  }

  encoder.configure({
    codec,
    width,
    height,
    framerate: fps,
    bitrate: targetBitrate(settings),
  });

  try {
    const usPerFrame = 1_000_000 / fps;
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      if (encoderError) throw encoderError;
      renderer.render(config, i / total, width, height);
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(i * usPerFrame),
        duration: Math.round(usPerFrame),
      });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      onProgress(i + 1, total);
      // Backpressure: keep the encode queue short and yield so the UI paints.
      while (encoder.encodeQueueSize > 4) {
        await new Promise((r) => setTimeout(r, 1));
      }
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    await encoder.flush();
    if (encoderError) throw encoderError;
    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  } finally {
    try {
      encoder.close();
    } catch {
      // already closed on error paths
    }
  }
}

/**
 * WebM fallback render into a Blob using a caller-owned renderer/canvas.
 * Realtime capture via MediaRecorder — still loop-accurate because the canvas is
 * driven by phase and we record exactly one loop of wall-clock time. The
 * renderer is NOT disposed here (caller owns it).
 */
export async function renderWebmBlob(
  renderer: ShaderRenderer,
  canvas: HTMLCanvasElement,
  config: ShaderConfig,
  settings: ExportSettings,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<Blob> {
  const { width, height, fps } = settings;
  const stream = canvas.captureStream(fps);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
    (m) => MediaRecorder.isTypeSupported(m),
  );
  if (!mime) {
    throw new Error("This browser supports neither WebCodecs nor WebM recording");
  }
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: targetBitrate(settings, true),
  });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const durationMs = config.duration * 1000;
  return new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    rec.onerror = () => reject(new Error("Recording failed"));
    rec.start(250);
    const t0 = performance.now();
    const tick = () => {
      const elapsed = performance.now() - t0;
      if (signal?.aborted) {
        rec.stop();
        reject(new DOMException("Export cancelled", "AbortError"));
        return;
      }
      if (elapsed >= durationMs) {
        rec.stop();
        return;
      }
      renderer.render(config, elapsed / durationMs, width, height);
      onProgress(Math.round((elapsed / durationMs) * 100), 100);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Render one clip to a Blob on a caller-owned renderer, picking MP4 when
 * WebCodecs is available and WebM otherwise. Used by the batch/library export to
 * reuse a single WebGL context across every clip.
 */
export function renderClipBlob(
  renderer: ShaderRenderer,
  canvas: HTMLCanvasElement,
  config: ShaderConfig,
  settings: ExportSettings,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<Blob> {
  if (settings.format === "mp4" && webCodecsSupported()) {
    return renderMp4Blob(renderer, canvas, config, settings, onProgress, signal);
  }
  return renderWebmBlob(renderer, canvas, config, settings, onProgress, signal);
}

/** File extension matching the format that renderClipBlob will actually use. */
export function clipExtension(settings: ExportSettings): "mp4" | "webm" {
  return settings.format === "mp4" && webCodecsSupported() ? "mp4" : "webm";
}

/** Create a detached, sized canvas + renderer for offscreen export rendering. */
function makeExportRenderer(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const renderer = new ShaderRenderer(canvas, { preserveDrawingBuffer: true });
  return { canvas, renderer };
}

export async function exportMp4(
  config: ShaderConfig,
  settings: ExportSettings,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const { width, height } = settings;
  const { canvas, renderer } = makeExportRenderer(width, height);
  try {
    const blob = await renderMp4Blob(renderer, canvas, config, settings, onProgress, signal);
    return { blob, filename: `${safeName(config.name)}-loop-${width}x${height}.mp4` };
  } finally {
    renderer.dispose();
  }
}

export async function exportWebm(
  config: ShaderConfig,
  settings: ExportSettings,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const { width, height } = settings;
  const { canvas, renderer } = makeExportRenderer(width, height);
  try {
    const blob = await renderWebmBlob(renderer, canvas, config, settings, onProgress, signal);
    return { blob, filename: `${safeName(config.name)}-loop-${width}x${height}.webm` };
  } finally {
    renderer.dispose();
  }
}

export async function exportVideo(
  config: ShaderConfig,
  settings: ExportSettings,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<ExportResult> {
  if (settings.format === "mp4" && webCodecsSupported()) {
    return exportMp4(config, settings, onProgress, signal);
  }
  return exportWebm(config, settings, onProgress, signal);
}

export function downloadBlob({ blob, filename }: ExportResult) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
