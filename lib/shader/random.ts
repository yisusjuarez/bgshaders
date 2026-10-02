import { PALETTES } from "./palettes";
import {
  LEGACY_FAMILIES,
  type Family,
  type LegacyFamily,
  type MotionDNA,
  type ShaderConfig,
} from "./schema";

/** mulberry32 — deterministic PRNG so a seed always regenerates the same look */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJECTIVES = [
  "Drifting", "Molten", "Quiet", "Electric", "Velvet", "Hollow", "Radiant",
  "Slow", "Fractured", "Liquid", "Midnight", "Pale", "Feverish", "Gentle",
];
const NOUNS = [
  "Tide", "Bloom", "Signal", "Current", "Mirage", "Ember", "Static",
  "Horizon", "Pulse", "Veil", "Orbit", "Reverie", "Meadow", "Depth",
];

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Per-family ranges tuned so random draws land somewhere good, not just valid. */
export const TUNING: Record<
  LegacyFamily,
  { scale: [number, number]; warp: [number, number]; complexity: [number, number] }
> = {
  mesh: { scale: [0.7, 1.6], warp: [0.1, 0.6], complexity: [0.3, 0.9] },
  silk: { scale: [0.6, 1.8], warp: [0.3, 1.0], complexity: [0.4, 1.0] },
  aurora: { scale: [0.8, 1.6], warp: [0.2, 0.8], complexity: [0.4, 0.9] },
  smoke: { scale: [0.6, 1.5], warp: [0.5, 1.0], complexity: [0.5, 1.0] },
  orbs: { scale: [0.7, 1.7], warp: [0.0, 0.4], complexity: [0.3, 0.9] },
  grid: { scale: [0.8, 2.2], warp: [0.0, 0.5], complexity: [0.3, 0.8] },
  rings: { scale: [0.6, 1.6], warp: [0.1, 0.7], complexity: [0.3, 0.9] },
  rays: { scale: [0.7, 1.5], warp: [0.1, 0.6], complexity: [0.3, 0.9] },
  cells: { scale: [0.6, 1.6], warp: [0.2, 0.9], complexity: [0.2, 0.8] },
  ribbons: { scale: [0.6, 1.8], warp: [0.3, 1.0], complexity: [0.3, 0.9] },
  halftone: { scale: [0.8, 2.0], warp: [0.0, 0.5], complexity: [0.3, 0.8] },
  nebula: { scale: [0.7, 1.6], warp: [0.4, 1.0], complexity: [0.4, 0.9] },
  topo: { scale: [0.6, 1.6], warp: [0.2, 0.9], complexity: [0.4, 1.0] },
  lava: { scale: [0.6, 1.5], warp: [0.2, 0.8], complexity: [0.4, 1.0] },
  kaleido: { scale: [0.7, 1.4], warp: [0.2, 0.8], complexity: [0.3, 0.9] },
  hex: { scale: [0.7, 1.8], warp: [0.0, 0.6], complexity: [0.2, 0.8] },
  weave: { scale: [0.6, 1.8], warp: [0.1, 0.7], complexity: [0.3, 1.0] },
  spiral: { scale: [0.7, 1.4], warp: [0.2, 0.9], complexity: [0.3, 1.0] },
  prism: { scale: [0.6, 1.6], warp: [0.2, 0.9], complexity: [0.2, 0.8] },
  breath: { scale: [0.6, 1.3], warp: [0.1, 0.8], complexity: [0.3, 0.9] },
  rain: { scale: [0.7, 1.6], warp: [0.2, 0.8], complexity: [0.3, 0.9] },
  chevron: { scale: [0.6, 1.8], warp: [0.1, 0.7], complexity: [0.2, 0.8] },
  sweep: { scale: [0.7, 1.4], warp: [0.1, 0.8], complexity: [0.2, 0.9] },
  marble: { scale: [0.6, 1.5], warp: [0.45, 1.0], complexity: [0.4, 1.0] },
  caustics: { scale: [0.7, 1.7], warp: [0.2, 0.8], complexity: [0.35, 0.9] },
  ink: { scale: [0.65, 1.5], warp: [0.4, 1.0], complexity: [0.3, 0.9] },
  checker: { scale: [0.65, 1.8], warp: [0.1, 0.75], complexity: [0.2, 0.85] },
  tunnel: { scale: [0.65, 1.5], warp: [0.15, 0.75], complexity: [0.25, 0.9] },
  maze: { scale: [0.7, 1.8], warp: [0.0, 0.55], complexity: [0.25, 0.9] },
  orbitals: { scale: [0.65, 1.45], warp: [0.1, 0.7], complexity: [0.3, 1.0] },
  plasma: { scale: [0.6, 1.7], warp: [0.25, 0.9], complexity: [0.3, 1.0] },
  glitch: { scale: [0.7, 1.8], warp: [0.15, 0.85], complexity: [0.25, 0.9] },
  equalizer: { scale: [0.7, 1.8], warp: [0.0, 0.6], complexity: [0.25, 0.9] },
  radar: { scale: [0.65, 1.4], warp: [0.05, 0.6], complexity: [0.25, 0.9] },
  hologram: { scale: [0.7, 1.6], warp: [0.1, 0.55], complexity: [0.35, 0.85] },
  accretion: { scale: [0.65, 1.45], warp: [0.15, 0.7], complexity: [0.4, 0.95] },
  fractals: { scale: [0.7, 1.4], warp: [0.15, 0.65], complexity: [0.35, 0.9] },
  noise: { scale: [0.7, 1.6], warp: [0.0, 0.5], complexity: [0.3, 0.9] },
  waves: { scale: [0.7, 1.7], warp: [0.15, 0.7], complexity: [0.3, 0.9] },
  singularity: { scale: [0.65, 1.45], warp: [0.1, 0.55], complexity: [0.35, 0.9] },
  warpedNoise: { scale: [0.7, 1.5], warp: [0.45, 1.0], complexity: [0.45, 0.95] },
};

export function motionForFamily(family: Family): MotionDNA {
  if (["mesh", "breath", "sweep", "aurora", "prism", "waves"].includes(family)) return "calm";
  if (["silk", "smoke", "lava", "marble", "ink", "caustics", "warpedNoise"].includes(family)) return "fluid";
  if (["rings", "kaleido", "spiral", "tunnel", "weave", "plasma", "fractals", "accretion", "singularity"].includes(family)) return "hypnotic";
  if (["rays", "ribbons", "chevron", "checker", "equalizer"].includes(family)) return "energetic";
  if (["grid", "hex", "maze", "radar", "glitch", "cells", "noise", "hologram"].includes(family)) return "tech";
  return "cinematic";
}

/** Frozen legacy generator for existing seed-only URLs. Use catalogConfig for new draws. */
export function randomConfig(seed?: number): ShaderConfig {
  const s = seed ?? Math.floor(Math.random() * 1_000_000);
  const rng = mulberry32(s);
  const family = pick(rng, LEGACY_FAMILIES);
  const palette = pick(rng, PALETTES);
  const t = TUNING[family];
  return {
    name: `${pick(rng, ADJECTIVES)} ${pick(rng, NOUNS)}`,
    family,
    seed: s,
    colors: [...palette.colors],
    speed: 1 + Math.floor(rng() * 2), // 1 or 2; 3 gets frantic for backgrounds
    scale: lerp(t.scale[0], t.scale[1], rng()),
    complexity: lerp(t.complexity[0], t.complexity[1], rng()),
    warp: lerp(t.warp[0], t.warp[1], rng()),
    grain: 0.03 + rng() * 0.05,
    sharpness: 0.2 + rng() * 0.35,
    vignette: 0.25 + rng() * 0.35,
    duration: [6, 8, 10, 12][Math.floor(rng() * 4)],
    secondaryFamily: null,
    blendMode: "mix",
    blendAmount: 0.5,
    motionDNA: motionForFamily(family),
    bpm: 120,
    beats: 16,
  };
}
