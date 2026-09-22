/** Shared resolution / frame-rate presets for the export and library dialogs. */

export const RESOLUTIONS = [
  { value: "1920x1080", label: "1080p landscape · 1920×1080" },
  { value: "3840x2160", label: "4K landscape · 3840×2160" },
  { value: "1280x720", label: "720p landscape · 1280×720" },
  { value: "1080x1920", label: "Vertical · 1080×1920" },
  { value: "1080x1080", label: "Square · 1080×1080" },
];

export const FPS_OPTIONS = [
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
];

export const QUALITY_OPTIONS = [
  { value: "balanced", label: "Balanced · smaller file" },
  { value: "high", label: "High · recommended" },
  { value: "master", label: "Master · maximum detail" },
] as const;
