import { z } from "zod";

// Keep this order frozen: legacy ?seed= links depend on it.
export const LEGACY_FAMILIES = [
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
  "marble",
  "caustics",
  "ink",
  "checker",
  "tunnel",
  "maze",
  "orbitals",
  "plasma",
  "glitch",
  "equalizer",
  "radar",
  "hologram",
  "accretion",
  "fractals",
  "noise",
  "waves",
  "singularity",
  "warpedNoise",
] as const;

export const BACKDROP_FAMILIES = [
  "nacreFlow", "velvetFlow", "glassVeil", "prismField", "satinDunes", "metallicWaves",
  "silkCurrent", "aquaVeil", "mistLayers", "magneticFlow",
  "foldedCanopy", "contourRelief", "floatingVeils", "prismCurtain",
  "lightPainting", "spectralRibbons", "causticPool", "eclipseHalo",
  "starVortex", "dustDrift", "cutPaper", "opArtWeave", "neonLattice", "horizonFold",
] as const;
export type BackdropFamily = (typeof BACKDROP_FAMILIES)[number];
export const CREATIVE_FAMILIES = [
  "liquidMetal", "iridescentGlass", "ribbonSculpture", "architecture",
  "constellation", "luminousOrbits", "moire", ...BACKDROP_FAMILIES,
] as const;
export type CreativeFamily = (typeof CREATIVE_FAMILIES)[number];
export type LegacyFamily = (typeof LEGACY_FAMILIES)[number];
// Retain decoding/rendering for saved exports; retired types are never offered
// by the editor, Random, Matrix or directed packs.
export const RETIRED_FAMILIES = ["accretion"] as const;
export const FAMILIES = [...LEGACY_FAMILIES.filter((family) => family !== "accretion"), ...CREATIVE_FAMILIES] as const;
export type Family = LegacyFamily | CreativeFamily;

export const BLEND_MODES = ["mix", "screen", "multiply", "difference"] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

export const MOTION_DNAS = [
  "calm",
  "fluid",
  "hypnotic",
  "energetic",
  "tech",
  "cinematic",
] as const;
export type MotionDNA = (typeof MOTION_DNAS)[number];

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
  family: z.enum([...FAMILIES, ...RETIRED_FAMILIES]),
  seed: z.number().min(0).max(999_999),
  colors: z.array(hexColor).min(2).max(6),
  /** integer cycles per loop; 1 = one full cycle over the loop duration */
  speed: z.number().int().min(1).max(3),
  /** pattern size; higher values enlarge features and can read as visually softer */
  scale: z.number().min(0.4).max(3),
  /** density / layer count feel */
  complexity: z.number().min(0).max(1),
  /** domain warp intensity */
  warp: z.number().min(0).max(1),
  /** static film grain amount */
  grain: z.number().min(0).max(0.2),
  /** post-process focus: -1 softens, 0 is neutral, 1 adds crisp local contrast */
  sharpness: z.number().min(-1).max(1).default(0.25),
  vignette: z.number().min(0).max(1),
  /** loop length in seconds (playback and export) */
  duration: z.number().min(2).max(30),
  /** Optional second shader rendered in the same loop-safe fragment program. */
  secondaryFamily: z.enum([...FAMILIES, ...RETIRED_FAMILIES]).nullable().default(null),
  blendMode: z.enum(BLEND_MODES).default("mix"),
  blendAmount: z.number().min(0).max(1).default(0.5),
  /** Creative intent and musical timing used by Pack Studio. */
  motionDNA: z.enum(MOTION_DNAS).default("fluid"),
  bpm: z.number().int().min(30).max(240).default(120),
  beats: z.number().int().min(1).max(64).default(16),
});

export type ShaderConfig = z.infer<typeof shaderConfigSchema>;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
