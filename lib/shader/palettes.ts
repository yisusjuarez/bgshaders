/**
 * Curated palettes for the random generator. Each reads well fullscreen and
 * survives the soft blending the shader families apply. Order matters: the
 * first color anchors the darkest / background end of the gradient.
 */
export const PALETTES: { name: string; colors: string[] }[] = [
  { name: "Deep Sea", colors: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"] },
  { name: "Ember", colors: ["#1a0908", "#7f1d1d", "#ea580c", "#fbbf24", "#fef3c7"] },
  { name: "Orchid Haze", colors: ["#10002b", "#5a189a", "#9d4edd", "#e0aaff", "#f8edff"] },
  { name: "Meadow", colors: ["#081c15", "#1b4332", "#40916c", "#95d5b2", "#d8f3dc"] },
  { name: "Midnight Neon", colors: ["#0a0a0f", "#240046", "#ff006e", "#8338ec", "#3a86ff"] },
  { name: "Peach Room", colors: ["#2b2024", "#a4508b", "#ef767a", "#ffa9a3", "#ffe3e0"] },
  { name: "Glacier", colors: ["#0b132b", "#1c2541", "#3a506b", "#5bc0be", "#e0fbfc"] },
  { name: "Solar Gold", colors: ["#231709", "#7c4a03", "#d97706", "#fcd34d", "#fffbeb"] },
  { name: "Ultraviolet", colors: ["#08080d", "#1e1b4b", "#4338ca", "#818cf8", "#c7d2fe"] },
  { name: "Rose Ink", colors: ["#160a13", "#4a1030", "#9f1239", "#fb7185", "#ffe4e6"] },
  { name: "Acid Wash", colors: ["#0d1117", "#1a3a2a", "#2dd4bf", "#a3e635", "#ecfccb"] },
  { name: "Dusk Drive", colors: ["#0f0e17", "#232946", "#eebbc3", "#b8c1ec", "#fffffe"] },
  { name: "Copper Fog", colors: ["#1c1917", "#44403c", "#a8a29e", "#d6ccc2", "#f5ebe0"] },
  { name: "Coral Reef", colors: ["#012a36", "#036666", "#14746f", "#56ab91", "#ffb5a7"] },
  { name: "Aurora Night", colors: ["#010409", "#0d2818", "#04471c", "#16db65", "#a1ffce"] },
  { name: "Candy Static", colors: ["#1b1b2f", "#e63946", "#f1faee", "#a8dadc", "#457b9d"] },
];
