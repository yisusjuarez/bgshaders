"use client";

// Dev-only diagnostic: compiles every family, measures the loop seam, and
// runs a real (tiny) WebCodecs export.
import { useEffect, useState } from "react";
import { ShaderRenderer } from "@/lib/shader/renderer";
import { randomConfig } from "@/lib/shader/random";
import { FAMILIES, type BlendMode, type Family } from "@/lib/shader/schema";
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
            const suspects: number[] = [];
            for (const seed of SEEDS) {
              const cfg = { ...randomConfig(seed), family };
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
              if (!(exact === 0 && seam <= adjacent * 2 + 0.5)) suspects.push(seed);
              worstExact = Math.max(worstExact, exact);
              worstSeam = Math.max(worstSeam, seam);
              worstAdjacent = Math.max(worstAdjacent, adjacent);
            }
            out.push(
              `${family}: OK exact=${worstExact.toFixed(4)} seam=${worstSeam.toFixed(3)} adjacent=${worstAdjacent.toFixed(3)} ${
                suspects.length === 0
                  ? "LOOP-PERFECT"
                  : `LOOP-SUSPECT seeds=${suspects.join(",")}`
              }`,
            );
          } catch (e) {
            out.push(`${family}: FAIL ${e instanceof Error ? e.message : e}`);
          }
        }

        // Representative layered programs cover every blend mode, helper-name
        // namespacing (glitch+glitch), and exact closure of both scenes.
        const layeredCases: [Family, Family, BlendMode][] = [
          ["mesh", "silk", "mix"],
          ["kaleido", "radar", "screen"],
          ["caustics", "checker", "multiply"],
          ["glitch", "glitch", "difference"],
        ];
        for (const [primary, secondary, blendMode] of layeredCases) {
          try {
            let worstExact = 0;
            let worstSeam = 0;
            let worstAdjacent = 0;
            for (const seed of SEEDS.slice(0, 5)) {
              const cfg = {
                ...randomConfig(seed),
                family: primary,
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
      } catch (e) {
        out.push(`context: FAIL ${e instanceof Error ? e.message : e}`);
      }
      renderer?.dispose();
      if (!cancelled) setResults([...out, "export: running…"]);

      if (webCodecsSupported()) {
        try {
          const cfg = { ...randomConfig(1), duration: 2 };
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
