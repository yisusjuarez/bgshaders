import { resolveActiveFamily, type Family } from "./schema";

export const LOOP_CATEGORIES = [
  { value: "materials", label: "Materials", families: ["liquidMetal", "iridescentGlass", "ribbonSculpture", "nacreFlow", "velvetFlow", "glassVeil", "prismField", "satinDunes", "metallicWaves", "tidalGlass", "opalWash", "rainWindow", "silk", "marble", "caustics", "ink"] },
  { value: "organic", label: "Organic", families: ["silkCurrent", "aquaVeil", "mistLayers", "magneticFlow", "twilightHaze", "cloudSea", "emberVeil", "forestLight", "inkWash", "mesh", "smoke", "cells", "lava", "breath", "rain", "noise", "waves", "warpedNoise"] },
  { value: "geometry", label: "Geometry", families: ["architecture", "foldedCanopy", "contourRelief", "floatingVeils", "prismCurtain", "lunarDunes", "kaleido", "fractals", "grid", "rings", "ribbons", "hex", "weave", "spiral", "checker", "tunnel", "chevron", "topo"] },
  { value: "light", label: "Light", families: ["lightPainting", "spectralRibbons", "causticPool", "eclipseHalo", "auroraCanopy", "lightColumns", "deepOcean", "aurora", "orbs", "rays", "prism", "sweep"] },
  { value: "space", label: "Space", families: ["constellation", "luminousOrbits", "starVortex", "dustDrift", "nebula", "orbitals", "singularity"] },
  { value: "graphic", label: "Graphic", families: ["moire", "cutPaper", "opArtWeave", "halftone"] },
  { value: "digital", label: "Digital", families: ["neonLattice", "maze", "plasma", "glitch", "equalizer", "radar", "hologram"] },
] as const satisfies readonly { value: string; label: string; families: readonly Family[] }[];

export function categoryForFamily(family: Family) {
  const activeFamily = resolveActiveFamily(family);
  return LOOP_CATEGORIES.find((category) => (category.families as readonly Family[]).includes(activeFamily)) ?? LOOP_CATEGORIES[1];
}
