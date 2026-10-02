"use client";

// Dev-only diagnostic: compiles every family, measures the loop seam, and
// runs a real (tiny) WebCodecs export.
import { useEffect, useState } from "react";
import { ShaderRenderer } from "@/lib/shader/renderer";
import { catalogConfig, curatedConfig, isCreativeFamily } from "@/lib/shader/catalog";
import { BLEND_MODES, CREATIVE_FAMILIES, DEFAULT_EFFECTS, FAMILIES, type BlendMode, type Family } from "@/lib/shader/schema";
import { exportMp4, webCodecsSupported } from "@/lib/export/encode";

const SIZE = 96;
// Sweep several seeds per family so seed-dependent structure (e.g. kaleido's
// fold count, which flips the loop-seam parity) is actually exercised, instead
// of trusting a single fixed seed to land on a representative case.
const SEEDS = Array.from({ length: 20 }, (_, i) => i);

function readPixels(gl: WebGL2RenderingContext): Uint8Array {
  const buf = new Uint8Array(SIZE * SIZE * 4);
  gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  return buf;
}

function meanDiff(a: Uint8Array, b: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

function edgeDetail(pixels: Uint8Array): number {
  let sum = 0;
  let count = 0;
  for (let i = 4; i < pixels.length; i += 4) {
    if ((i / 4) % SIZE === 0) continue;
    for (let channel = 0; channel < 3; channel++) {
      sum += Math.abs(pixels[i + channel] - pixels[i - 4 + channel]);
      count++;
    }
  }
  return sum / count;
}

export default function GlTest() {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const out: string[] = [];
      let renderer: ShaderRenderer | null = null;
      try {
        renderer = new ShaderRenderer(canvas, { preserveDrawingBuffer: true });
        const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
        for (const family of FAMILIES) {
          try {
            const frames = 300;
            // Track the worst case across seeds so one bad parity can't hide
            // behind a lucky seed.
            let worstExact = 0;
            let worstSeam = 0;
            let worstAdjacent = 0;
            const suspects: string[] = [];
            for (const sample of SEEDS.flatMap((seed) =>
              (isCreativeFamily(family) ? [1, 2, 3] : [1]).map((speed) => ({ seed, speed })),
            )) {
              const { seed, speed } = sample;
              const cfg = { ...catalogConfig(seed, family), speed };
              renderer.render(cfg, 0, SIZE, SIZE);
              const first = readPixels(gl);
              // phase 1.0 wraps to 0 — must be bit-exact with frame 0
              renderer.render(cfg, 1.0, SIZE, SIZE);
              const wrapped = readPixels(gl);
              // seam step: last exported frame → first frame
              renderer.render(cfg, (frames - 1) / frames, SIZE, SIZE);
              const last = readPixels(gl);
              // Reference nearby steps on both sides of the seam as well as
              // across the cycle. Hard-edged styles can have a locally large
              // but still continuous step, so sparse mid-loop samples alone
              // would produce false suspects.
              renderer.render(cfg, (frames - 2) / frames, SIZE, SIZE);
              const beforeLast = readPixels(gl);
              renderer.render(cfg, 1 / frames, SIZE, SIZE);
              const afterFirst = readPixels(gl);
              let adjacent = 0;
              adjacent = Math.max(
                meanDiff(beforeLast, last),
                meanDiff(first, afterFirst),
              );
              for (const phase of [0.15, 0.35, 0.55, 0.75]) {
                renderer.render(cfg, phase, SIZE, SIZE);
                const a = readPixels(gl);
                renderer.render(cfg, phase + 1 / frames, SIZE, SIZE);
                const b = readPixels(gl);
                adjacent = Math.max(adjacent, meanDiff(a, b));
              }
              const exact = meanDiff(first, wrapped);
              const seam = meanDiff(last, first);
              if (!(exact === 0 && seam <= adjacent * 2 + 0.5)) suspects.push(`${seed}/${speed}x`);
              worstExact = Math.max(worstExact, exact);
              worstSeam = Math.max(worstSeam, seam);
              worstAdjacent = Math.max(worstAdjacent, adjacent);
            }
            out.push(
              `${family}: OK exact=${worstExact.toFixed(4)} seam=${worstSeam.toFixed(3)} adjacent=${worstAdjacent.toFixed(3)} ${
                suspects.length === 0
                  ? "LOOP-PERFECT"
                  : `LOOP-SUSPECT seed/speed=${suspects.join(",")}`
              }`,
            );
          } catch (e) {
            out.push(`${family}: FAIL ${e instanceof Error ? e.message : e}`);
          }
        }

        // Hold all controls and colors fixed: seed must change actual structure,
        // and a mid-cycle frame must differ from the first frame.
        for (const family of CREATIVE_FAMILIES) {
          try {
            const cfg = curatedConfig(family);
            renderer.render(cfg, 0, SIZE, SIZE);
            const first = readPixels(gl);
            renderer.render({ ...cfg, seed: cfg.seed + 1 }, 0, SIZE, SIZE);
            const otherSeed = readPixels(gl);
            renderer.render(cfg, 0.25, SIZE, SIZE);
            const moving = readPixels(gl);
            const structure = meanDiff(first, otherSeed);
            const motion = meanDiff(first, moving);
            out.push(`creative ${family}: ${structure > 0.1 && motion > 0.1 ? "OK" : "FAIL"} structure=${structure.toFixed(3)} motion=${motion.toFixed(3)}`);
          } catch (e) {
            out.push(`creative ${family}: FAIL ${e instanceof Error ? e.message : e}`);
          }
        }

        // Representative layered programs cover every blend mode, helper-name
        // namespacing (glitch+glitch), and exact closure of both scenes.
        const layeredCases: [Family, Family, BlendMode][] = [
          ["mesh", "silk", "mix"],
          ["kaleido", "radar", "screen"],
          ["caustics", "checker", "multiply"],
          ["glitch", "glitch", "difference"],
          ...CREATIVE_FAMILIES.flatMap((family) => BLEND_MODES.map((mode): [Family, Family, BlendMode] => [family, family, mode])),
          ["liquidMetal", "smoke", "screen"],
          ["constellation", "iridescentGlass", "mix"],
        ];
        for (const [primary, secondary, blendMode] of layeredCases) {
          try {
            let worstExact = 0;
            let worstSeam = 0;
            let worstAdjacent = 0;
            for (const seed of SEEDS.slice(0, 5)) {
              const cfg = {
                ...catalogConfig(seed, primary),
                secondaryFamily: secondary,
                blendMode,
                blendAmount: 0.55,
              };
              renderer.render(cfg, 0, SIZE, SIZE);
              const first = readPixels(gl);
              renderer.render(cfg, 1, SIZE, SIZE);
              const wrapped = readPixels(gl);
              renderer.render(cfg, 299 / 300, SIZE, SIZE);
              const last = readPixels(gl);
              renderer.render(cfg, 298 / 300, SIZE, SIZE);
              const beforeLast = readPixels(gl);
              const exact = meanDiff(first, wrapped);
              const seam = meanDiff(last, first);
              const adjacent = meanDiff(beforeLast, last);
              worstExact = Math.max(worstExact, exact);
              worstSeam = Math.max(worstSeam, seam);
              worstAdjacent = Math.max(worstAdjacent, adjacent);
            }
            const perfect = worstExact === 0 && worstSeam <= worstAdjacent * 2 + 0.5;
            out.push(
              `layer ${primary}+${secondary}/${blendMode}: OK exact=${worstExact.toFixed(4)} seam=${worstSeam.toFixed(3)} adjacent=${worstAdjacent.toFixed(3)} ${perfect ? "LOOP-PERFECT" : "LOOP-SUSPECT"}`,
            );
          } catch (e) {
            out.push(
              `layer ${primary}+${secondary}/${blendMode}: FAIL ${e instanceof Error ? e.message : e}`,
            );
          }
        }

        // Read actual GPU output: defaults are pixel-identical, wide blur
        // removes detail, glow adds light, and desaturation produces grey.
        try {
          const cfg = { ...curatedConfig("metallicWaves"), grain: 0 };
          const draw = (patch: Partial<typeof cfg>) => {
            renderer!.render({ ...cfg, ...patch }, 0.125, SIZE, SIZE);
            return readPixels(gl);
          };
          const baseline = draw({});
          const neutral = draw({ effects: { ...DEFAULT_EFFECTS } });
          out.push(`effects neutral: ${meanDiff(baseline, neutral) === 0 ? "OK" : "FAIL"}`);
          const blurred = draw({ effects: { ...DEFAULT_EFFECTS, blur: 1 } });
          out.push(`effects blur: ${edgeDetail(blurred) < edgeDetail(baseline) * 0.8 ? "OK" : "FAIL"}`);
          const glowing = draw({ effects: { ...DEFAULT_EFFECTS, glow: 1 } });
          const addsLight = glowing.every((value, i) => i % 4 === 3 || value >= baseline[i] - 1);
          out.push(`effects glow: ${addsLight && meanDiff(baseline, glowing) > 0.1 ? "OK" : "FAIL"}`);
          const grey = draw({ effects: { ...DEFAULT_EFFECTS, saturation: 0 } });
          let monochrome = true;
          for (let i = 0; i < grey.length; i += 4) {
            if (Math.abs(grey[i] - grey[i + 1]) > 1 || Math.abs(grey[i + 1] - grey[i + 2]) > 1) monochrome = false;
          }
          out.push(`effects saturation: ${monochrome ? "OK" : "FAIL"}`);
          const flat = draw({ effects: { ...DEFAULT_EFFECTS, contrast: 0 } });
          out.push(`effects contrast: ${flat.every((value, i) => i % 4 === 3 || Math.abs(value - 128) <= 1) ? "OK" : "FAIL"}`);
          out.push(`effects reset: ${meanDiff(baseline, draw({ effects: { ...DEFAULT_EFFECTS } })) === 0 ? "OK" : "FAIL"}`);
        } catch (error) {
          out.push(`effects: FAIL ${error instanceof Error ? error.message : error}`);
        }

        for (const family of FAMILIES) {
          try {
            const cfg = { ...catalogConfig(421, family), effects: { blur: 0.6, glow: 0.45, saturation: 1.25, contrast: 1.1 } };
            renderer.render(cfg, 0, SIZE, SIZE);
            const first = readPixels(gl);
            renderer.render(cfg, 1, SIZE, SIZE);
            const exact = meanDiff(first, readPixels(gl));
            out.push(`effects ${family}: ${exact === 0 && gl.getError() === gl.NO_ERROR ? "OK" : "FAIL"} exact=${exact.toFixed(4)}`);
          } catch (error) {
            out.push(`effects ${family}: FAIL ${error instanceof Error ? error.message : error}`);
          }
        }
      } catch (e) {
        out.push(`context: FAIL ${e instanceof Error ? e.message : e}`);
      }
      renderer?.dispose();
      if (!cancelled) setResults([...out, "export: running…"]);

      if (webCodecsSupported()) {
        try {
          const cfg = { ...curatedConfig("liquidMetal"), effects: { blur: 0.6, glow: 0.45, saturation: 1.25, contrast: 1.1 }, duration: 2 };
          const { blob, filename } = await exportMp4(
            cfg,
            { width: 320, height: 180, fps: 30, format: "mp4" },
            () => {},
          );
          out.push(`export: OK ${filename} ${blob.size} bytes`);
        } catch (e) {
          out.push(`export: FAIL ${e instanceof Error ? e.message : e}`);
        }
      } else {
        out.push("export: SKIP no WebCodecs");
      }
      if (!cancelled) setResults(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <pre id="gl-results" style={{ color: "white", padding: 20 }}>
      {results.join("\n") || "running..."}
    </pre>
  );
}
