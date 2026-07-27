import { PALETTES } from "@/lib/shader/palettes";
import { hexToRgb } from "@/lib/shader/schema";

/** Normalize a color list to a stable, case-insensitive comparison key. */
function colorsKey(colors: string[]): string {
  return colors.map((c) => c.toLowerCase()).join(",");
}

/**
 * Recover the palette name a config came from by matching its exact color list
 * against the curated PALETTES. Returns null for AI-generated or hand-edited
 * colors that don't match any curated palette. Mirrors the reverse-match trick
 * used in components/params-panel.tsx.
 */
export function matchPaletteName(colors: string[]): string | null {
  const key = colorsKey(colors);
  return PALETTES.find((p) => colorsKey(p.colors) === key)?.name ?? null;
}

/** HSL (h in [0,360), s/l in [0,1]) from a #rrggbb hex color. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

// Ordered hue buckets. Reds wrap around 360, handled explicitly below.
const HUE_BUCKETS: { name: string; min: number; max: number }[] = [
  { name: "orange", min: 15, max: 45 },
  { name: "yellow", min: 45, max: 70 },
  { name: "green", min: 70, max: 160 },
  { name: "teal", min: 160, max: 200 },
  { name: "blue", min: 200, max: 255 },
  { name: "purple", min: 255, max: 290 },
  { name: "magenta", min: 290, max: 345 },
];

export type ColorFamily =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "magenta"
  | "neutral";

/**
 * Derive a coarse color-family label for grouping "by color". Uses the hue of
 * the most saturated color (the one that gives the loop its character), so it
 * works for any config — curated palette, AI, or hand-edited. Falls back to
 * "neutral" when no color is saturated enough to have a meaningful hue.
 */
export function colorFamily(colors: string[]): ColorFamily {
  let best = { h: 0, s: -1, l: 0 };
  for (const c of colors) {
    const hsl = hexToHsl(c);
    // Weight by how visible the hue is: fully-dark/light colors read as grey.
    const chroma = hsl.s * (1 - Math.abs(2 * hsl.l - 1));
    const bestChroma = best.s * (1 - Math.abs(2 * best.l - 1));
    if (chroma > bestChroma) best = hsl;
  }
  if (best.s < 0.15) return "neutral";
  const h = best.h;
  if (h >= 345 || h < 15) return "red";
  return (HUE_BUCKETS.find((b) => h >= b.min && h < b.max)?.name ??
    "neutral") as ColorFamily;
}
