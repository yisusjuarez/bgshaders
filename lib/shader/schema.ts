import { z } from "zod";

export const FAMILIES = [
  "mesh",
  "silk",
  "aurora",
  "smoke",
  "orbs",
  "grid",
  "rings",
  "rays",
  "cells",
  "ribbons",
  "halftone",
  "nebula",
  "topo",
  "lava",
  "kaleido",
  "hex",
  "weave",
  "spiral",
  "prism",
  "breath",
  "rain",
  "chevron",
  "sweep",
  "ridge",
] as const;

export type Family = (typeof FAMILIES)[number];

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb hex color");

/**
 * Everything that affects pixels lives here. All motion inside the shaders is
 * driven by integer harmonics of a normalized phase, so any config renders a
 * perfect loop regardless of the values below. `speed` is the base harmonic
 * multiplier and MUST stay an integer — a fractional value would break the
 * loop seam.
 */
export const shaderConfigSchema = z.object({
  name: z.string().min(1).max(60),
  family: z.enum(FAMILIES),
  seed: z.number().min(0).max(999_999),
  colors: z.array(hexColor).min(2).max(6),
  /** integer cycles per loop; 1 = one full cycle over the loop duration */
  speed: z.number().int().min(1).max(3),
  /** zoom of the pattern */
  scale: z.number().min(0.4).max(3),
  /** density / layer count feel */
  complexity: z.number().min(0).max(1),
  /** domain warp intensity */
  warp: z.number().min(0).max(1),
  /** static film grain amount */
  grain: z.number().min(0).max(0.2),
  vignette: z.number().min(0).max(1),
  /** loop length in seconds (playback and export) */
  duration: z.number().min(2).max(30),
});

export type ShaderConfig = z.infer<typeof shaderConfigSchema>;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
