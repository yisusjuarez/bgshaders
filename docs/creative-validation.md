# Creative collection validation

Measured on October 2, 2026 in Chrome using ANGLE Metal on an Apple M4.

## Rendering at 1920 × 1080

Each measurement used three warmup frames and 20 sampled phases. GPU times
used `EXT_disjoint_timer_query_webgl2`; synchronized times include rendering
and a one-pixel `readPixels` to wait for completed GPU work. Shader compilation
is excluded. These are rendering costs on this machine, not cross-device FPS
guarantees or complete browser frame timings.

| Authored composition | GPU p95 (ms) | Synchronized p95 (ms) |
| --- | ---: | ---: |
| Liquid metal | 1.41 | 3.50 |
| Iridescent glass | 5.07 | 7.00 |
| Ribbon sculpture | 3.61 | 5.30 |
| Architectural tunnel | 4.68 | 6.40 |
| Constellation trails | 10.24 | 11.80 |
| Luminous orbits | 1.20 | 3.00 |
| Optical moiré | 0.86 | 3.00 |

The authored compositions fit within the 33.3 ms rendering budget for 30 fps.
Sharpness at 0.5 and same-family screen blending were also measured separately.
The most expensive case was constellation sharpness: reducing the trail from
five to four segments, while retaining its duration, brought synchronized p95
from 36.9 ms to 32.8 ms. Combining sharpness, layers and maximum complexity can
cost more; those simultaneous extremes are not covered by the performance claim.

## Backgrounds for projected lyrics

The 24 new backgrounds use continuous fields rather than isolated figurative
objects. Their default duration is 16 seconds, speed is one cycle per loop,
and grain is 0.006. A screen-relative central field suppresses highlights;
this remains in the same place when the pattern scale or aspect ratio changes.
The existing seven authored styles retain their appearance and timing.

[Rendered collection with sample lyrics](creative-collection.jpg)

Each 1080p measurement below uses three warmup frames and 20 sampled phases,
with a one-pixel `readPixels` to synchronize and an animation frame between
samples. These are synchronized render costs, excluding shader compilation,
on the same Apple M4; no separate GPU timer measurements were taken for these
24 backgrounds. All default p95 costs were below 12 ms. Custom sharpness,
layers and extreme complexity were not included in that performance result.

| Background | Synchronized p95 (ms) |
| --- | ---: |
| Nacre currents | 3.10 |
| Velvet flow | 3.70 |
| Glass veils | 3.70 |
| Prismatic field | 3.20 |
| Satin dunes | 2.10 |
| Metallic waves | 4.10 |
| Silk currents | 2.70 |
| Aqueous veils | 6.20 |
| Layers of mist | 5.00 |
| Magnetic currents | 4.10 |
| Folded canopy | 2.30 |
| Contour relief | 3.30 |
| Floating veils | 6.00 |
| Prismatic curtains | 3.30 |
| Light painting | 6.00 |
| Spectral ribbons | 6.80 |
| Caustic pool | 4.90 |
| Eclipse halo | 3.00 |
| Stellar vortex | 3.40 |
| Drifting dust | 11.50 |
| Paper cut landscapes | 6.00 |
| Optical weave | 2.80 |
| Neon lattice | 3.10 |
| Horizon folds | 4.70 |

## Verified behavior

- All 71 active families compile and pass loop-seam checks in `/gl-test`.
- All 31 authored families pass across 20 seeds and speeds 1, 2 and 3; fixed-control
  seed changes alter pixels, and frames at phases 0 and 0.25 differ.
- All four blend modes compile and close correctly for each authored family layered
  with itself; mixed new/legacy and new/new scenes also pass.
- Real renders were reviewed at landscape, portrait and square aspect ratios,
  including two structural seeds per new background.
- A 24-video ZIP of the new backgrounds was rendered at 320 × 180, 30 fps, two seconds per loop.
  All 24 MP4 containers, 24 metadata files, manifest and catalog were checked.
- The unified Edit loop sidebar exposes all 71 active types across seven categories.
  Switching types preserves the seed, palette, scale and duration. Inline visual
  selection keeps the editor open; restoring a style applies its visual defaults.
- Palette editing, secondary layers, blend mode and amount, motion profiles,
  tempo duration, manual duration and renaming pass browser interaction checks.
- The Spanish editor fits a 390 × 667 viewport, scrolls and has no overlay.
  Escape closes a selector first and the editor on a subsequent press.
- shadcn Scroll Area hides the native scrollbar and renders its custom thumb;
  the editor header remains fixed while its controls scroll. Layers and Tempo
  start collapsed, toggle independently and retain their settings when reopened.
- Projected white text is checked against rendered pixels in the central half
  of the width and central 60% of the height, across four phases, using both
  authored palettes and an all-white palette. All 24 backgrounds exceed 4.5:1
  contrast in that region; all 257 WebGL checks pass. These checks use default controls;
  arbitrary sharpness, layers and grain are not covered by the contrast result.
- Geometric poster, Accretion disk, Chrome knot, Petal sculpture, Jellyfish and
  both fans are absent from all active selectors and generators. Saved legacy
  accretion exports remain decodable; a retired seed-only starting style is
  replaced with Stellar vortex in the app.
- Frozen fixtures confirm unchanged output for legacy seeds 0, 1, 421 and 999999.
- 94 unit tests, TypeScript, lint and the production build pass.
