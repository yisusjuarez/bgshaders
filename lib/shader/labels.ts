import { FAMILIES, type Family } from "./schema";

/** Human-readable names for each shader family, shared across the UI. */
export const FAMILY_LABELS: Record<Family, string> = {
  mesh: "Mesh gradient",
  silk: "Silk waves",
  aurora: "Aurora",
  smoke: "Smoke",
  orbs: "Bokeh orbs",
  grid: "Pulse grid",
  rings: "Ripple rings",
  rays: "Light rays",
  cells: "Drift cells",
  ribbons: "Ribbon bands",
  halftone: "Halftone print",
  nebula: "Star nebula",
  topo: "Contour lines",
  lava: "Lava blobs",
  kaleido: "Kaleidoscope",
  hex: "Hex tiles",
  weave: "Wave weave",
  spiral: "Spiral arms",
  prism: "Prism strips",
  breath: "Breathing glow",
  rain: "Rain streaks",
  chevron: "Chevron flow",
  sweep: "Gradient sweep",
  ridge: "Ridge lines",
};

export const familyItems = FAMILIES.map((f) => ({
  value: f,
  label: FAMILY_LABELS[f],
}));
