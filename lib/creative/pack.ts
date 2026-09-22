import { mulberry32, randomConfig } from "@/lib/shader/random";
import type {
  BlendMode,
  Family,
  MotionDNA,
  ShaderConfig,
} from "@/lib/shader/schema";

export interface MotionProfile {
  label: string;
  description: string;
  families: readonly Family[];
  speed: 1 | 2 | 3;
  scale: [number, number];
  complexity: [number, number];
  warp: [number, number];
  grain: number;
  vignette: number;
  bpm: number;
  beats: number;
}

export const MOTION_PROFILES: Record<MotionDNA, MotionProfile> = {
  calm: {
    label: "Calm",
    description: "Slow, spacious and quiet",
    families: ["mesh", "breath", "sweep", "aurora", "prism"],
    speed: 1,
    scale: [0.65, 1.15],
    complexity: [0.25, 0.55],
    warp: [0.1, 0.38],
    grain: 0.025,
    vignette: 0.42,
    bpm: 60,
    beats: 8,
  },
  fluid: {
    label: "Fluid",
    description: "Organic, soft and continuously flowing",
    families: ["silk", "smoke", "lava", "marble", "ink", "caustics"],
    speed: 1,
    scale: [0.7, 1.4],
    complexity: [0.45, 0.8],
    warp: [0.5, 0.9],
    grain: 0.04,
    vignette: 0.35,
    bpm: 80,
    beats: 16,
  },
  hypnotic: {
    label: "Hypnotic",
    description: "Repetition, symmetry and deep focus",
    families: ["rings", "kaleido", "spiral", "tunnel", "weave", "plasma"],
    speed: 1,
    scale: [0.75, 1.35],
    complexity: [0.55, 0.9],
    warp: [0.25, 0.72],
    grain: 0.03,
    vignette: 0.48,
    bpm: 90,
    beats: 16,
  },
  energetic: {
    label: "Energetic",
    description: "Fast, bold and rhythm-forward",
    families: ["rays", "ribbons", "chevron", "checker", "plasma", "equalizer"],
    speed: 2,
    scale: [0.85, 1.75],
    complexity: [0.55, 0.92],
    warp: [0.35, 0.8],
    grain: 0.045,
    vignette: 0.28,
    bpm: 128,
    beats: 16,
  },
  tech: {
    label: "Tech",
    description: "Precise, digital and interface-like",
    families: ["grid", "hex", "maze", "radar", "glitch", "cells"],
    speed: 2,
    scale: [0.9, 1.65],
    complexity: [0.5, 0.88],
    warp: [0.08, 0.42],
    grain: 0.02,
    vignette: 0.38,
    bpm: 120,
    beats: 16,
  },
  cinematic: {
    label: "Cinematic",
    description: "Layered, atmospheric and dramatic",
    families: ["nebula", "aurora", "rays", "smoke", "orbitals", "prism"],
    speed: 1,
    scale: [0.62, 1.28],
    complexity: [0.58, 0.92],
    warp: [0.32, 0.75],
    grain: 0.055,
    vignette: 0.62,
    bpm: 72,
    beats: 16,
  },
};

export const BLEND_LABELS: Record<BlendMode, string> = {
  mix: "Soft mix",
  screen: "Screen glow",
  multiply: "Multiply",
  difference: "Difference",
};

export function durationFromTempo(bpm: number, beats: number): number {
  return (60 * beats) / bpm;
}

function lerp(range: [number, number], t: number): number {
  return range[0] + (range[1] - range[0]) * t;
}

export function applyMotionDNA(config: ShaderConfig, dna: MotionDNA): ShaderConfig {
  const profile = MOTION_PROFILES[dna];
  return {
    ...config,
    motionDNA: dna,
    speed: profile.speed,
    scale: (profile.scale[0] + profile.scale[1]) / 2,
    complexity: (profile.complexity[0] + profile.complexity[1]) / 2,
    warp: (profile.warp[0] + profile.warp[1]) / 2,
    grain: profile.grain,
    vignette: profile.vignette,
    bpm: profile.bpm,
    beats: profile.beats,
    duration: durationFromTempo(profile.bpm, profile.beats),
  };
}

export interface PackOptions {
  name: string;
  count: number;
  baseSeed: number;
  motionDNA: MotionDNA;
  colors: string[];
  bpm: number;
  beats: number;
  layered: boolean;
}

/** Build a cohesive but varied product pack from one art direction. */
export function buildCreativePack(options: PackOptions): ShaderConfig[] {
  const profile = MOTION_PROFILES[options.motionDNA];
  const count = Math.min(100, Math.max(1, Math.floor(options.count)));
  const duration = durationFromTempo(options.bpm, options.beats);
  const title = options.name.trim() || profile.label;
  const blendModes: BlendMode[] = ["screen", "mix", "multiply", "difference"];

  return Array.from({ length: count }, (_, index) => {
    const seed = (options.baseSeed + index) % 1_000_000;
    const rng = mulberry32(seed ^ 0x51f15e);
    const base = randomConfig(seed);
    const family = profile.families[index % profile.families.length];
    const secondaryFamily = options.layered
      ? profile.families[(index + 1 + Math.floor(rng() * (profile.families.length - 1))) % profile.families.length]
      : null;
    return {
      ...base,
      name: `${title} ${String(index + 1).padStart(2, "0")}`,
      family,
      colors: [...options.colors],
      speed: profile.speed,
      scale: lerp(profile.scale, rng()),
      complexity: lerp(profile.complexity, rng()),
      warp: lerp(profile.warp, rng()),
      grain: Math.min(0.2, Math.max(0, profile.grain + (rng() - 0.5) * 0.025)),
      vignette: Math.min(1, Math.max(0, profile.vignette + (rng() - 0.5) * 0.16)),
      duration,
      secondaryFamily,
      blendMode: blendModes[index % blendModes.length],
      blendAmount: options.layered ? 0.28 + rng() * 0.38 : 0.5,
      motionDNA: options.motionDNA,
      bpm: Math.round(options.bpm),
      beats: Math.round(options.beats),
    };
  });
}
