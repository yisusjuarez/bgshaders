import { PALETTES } from "@/lib/shader/palettes";
import { randomConfig } from "@/lib/shader/random";
import { type Family, type ShaderConfig } from "@/lib/shader/schema";

/** Axes the user picks in the matrix tab. The library is the cartesian product. */
export interface MatrixAxes {
  families: Family[];
  /** integer cycles per loop, subset of 1..3 */
  speeds: number[];
  /** names referencing PALETTES entries */
  paletteNames: string[];
  /** how many seed variations per (family,speed,palette) cell; >= 1 */
  seedsPerCombo: number;
  /** first seed; each item gets a unique consecutive seed for reproducibility */
  baseSeed?: number;
  /** loop length in seconds applied to every item */
  duration?: number;
}

export const DEFAULT_BASE_SEED = 100_000;
export const DEFAULT_MATRIX_DURATION = 8;

/** How many loops a set of axes will produce, for the live count in the UI. */
export function matrixCount(axes: MatrixAxes): number {
  return (
    axes.families.length *
    axes.speeds.length *
    axes.paletteNames.length *
    Math.max(0, Math.floor(axes.seedsPerCombo))
  );
}

/**
 * Expand the axes into concrete configs. Each item starts from randomConfig(seed)
 * — which gives varied, in-range look params and a generated name — then the
 * controlled axes (family, speed, palette colors, duration) are overridden and a
 * unique seed is assigned. random.ts is left untouched, so existing seed outputs
 * are unchanged; the full config (persisted in the sidecar) is the authoritative
 * reproduction handle, since overriding means seed alone no longer rebuilds it.
 */
export function buildMatrix(axes: MatrixAxes): ShaderConfig[] {
  const baseSeed = axes.baseSeed ?? DEFAULT_BASE_SEED;
  const duration = axes.duration ?? DEFAULT_MATRIX_DURATION;
  const perCombo = Math.max(1, Math.floor(axes.seedsPerCombo));
  const out: ShaderConfig[] = [];
  let index = 0;
  for (const family of axes.families) {
    for (const speed of axes.speeds) {
      for (const paletteName of axes.paletteNames) {
        const palette = PALETTES.find((p) => p.name === paletteName);
        if (!palette) continue; // ignore unknown palette names defensively
        for (let v = 0; v < perCombo; v++) {
          const seed = (baseSeed + index) % 1_000_000;
          index++;
          const base = randomConfig(seed);
          out.push({
            ...base,
            family,
            speed,
            colors: [...palette.colors],
            duration,
            seed,
          });
        }
      }
    }
  }
  return out;
}
