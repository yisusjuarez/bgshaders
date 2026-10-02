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

The 35 backgrounds use continuous fields and atmospheric scenes. Their default
duration is 16 seconds, speed is one cycle per loop, and grain is 0.006. The
central darkening mask and global highlight compression were removed at the
user's request. Authored colors now render directly, and default vignette is
zero for these backgrounds. The existing seven authored styles retain their
appearance and timing. The latest 12 add auroras, ocean light, cloud banks,
twilight, rain on glass, opal washes, ink washes and moonlit dunes.

[Rendered collection with sample lyrics](creative-collection.jpg) ·
[Latest 12 backgrounds](atmosphere-collection.jpg)

Each 1080p measurement below uses three warmup frames and 20 sampled phases,
with a one-pixel `readPixels` to synchronize and an animation frame between
samples. These are synchronized render costs, excluding shader compilation,
on the same Apple M4; no separate GPU timer measurements were taken for these
35 backgrounds. All default p95 costs were below 11 ms. Custom sharpness,
layers and extreme complexity were not included in that performance result.

| Background | Synchronized p95 (ms) |
| --- | ---: |
| Nacre currents | 5.40 |
| Velvet flow | 4.90 |
| Glass veils | 6.50 |
| Prismatic field | 4.40 |
| Satin dunes | 4.20 |
| Metallic waves | 4.70 |
| Silk currents | 4.80 |
| Aqueous veils | 6.90 |
| Layers of mist | 6.20 |
| Magnetic currents | 4.00 |
| Folded canopy | 6.20 |
| Contour relief | 3.60 |
| Floating veils | 5.70 |
| Prismatic curtains | 4.60 |
| Light painting | 6.70 |
| Spectral ribbons | 4.80 |
| Caustic pool | 4.70 |
| Eclipse halo | 8.60 |
| Stellar vortex | 6.60 |
| Drifting dust | 9.40 |
| Paper cut landscapes | 7.30 |
| Optical weave | 3.60 |
| Neon lattice | 3.70 |
| Aurora canopy | 4.90 |
| Tidal glass | 5.00 |
| Twilight haze | 7.30 |
| Sea of clouds | 7.40 |
| Amber veils | 4.50 |
| Canopy light | 7.40 |
| Rain on glass | 7.30 |
| Opal washes | 6.40 |
| Columns of light | 8.20 |
| Moonlit dunes | 5.50 |
| Ink washes | 5.00 |
| Ocean light | 10.10 |

## Verified behavior

- All 82 active families compile and pass loop-seam checks in `/gl-test`.
- All 42 authored families pass across 20 seeds and speeds 1, 2 and 3; fixed-control
  seed changes alter pixels, and frames at phases 0 and 0.25 differ.
- All four blend modes compile and close correctly for each authored family layered
  with itself; mixed new/legacy and new/new scenes also pass.
- Real renders were reviewed at landscape, portrait and square aspect ratios,
  including two structural seeds per new background.
- A 12-video ZIP of the latest backgrounds was rendered at 320 × 180, 30 fps, two seconds per loop.
  All 12 MP4 containers, 12 metadata files, manifest and catalog were checked.
- The unified Edit loop sidebar exposes all 82 active types across seven categories.
  Switching types preserves the seed, palette, scale and duration. Inline visual
  selection keeps the editor open; restoring a style applies its visual defaults.
- Palette editing, secondary layers, blend mode and amount, motion profiles,
  tempo duration, manual duration and renaming pass browser interaction checks.
- The Spanish editor fits a 390 × 667 viewport, scrolls and has no overlay.
  Escape closes a selector first and the editor on a subsequent press.
- shadcn Scroll Area hides the native scrollbar and renders its custom thumb;
  the editor header remains fixed while its controls scroll. Layers and Tempo
  start collapsed, toggle independently and retain their settings when reopened.
- All 387 WebGL checks pass. The former fixed white-text contrast gate was removed
  together with automatic darkening; scene colors are rendered at their authored intensity.
- Geometric poster, Accretion disk, Chrome knot, Petal sculpture, Jellyfish and
  both fans and Horizon folds are absent from all active selectors and generators. Saved legacy
  accretion exports remain decodable; a retired seed-only starting style is
  replaced with Stellar vortex in the app.
- Frozen fixtures confirm unchanged output for legacy seeds 0, 1, 421 and 999999.
- Removing a selected type during hot reload no longer crashes the editor.
  Obsolete live types resolve to an active type while preserving edits; obsolete
  secondary layers are cleared. The removed-Horizon-folds failure was reproduced
  in Chrome before the fix and passes the same scenario after the fix.
- 101 unit tests, TypeScript, lint and the production build pass.

## Adjustable effects

The Edit loop sidebar includes a collapsed shadcn Effects accordion with blur,
glow, saturation and contrast. Missing effect settings in old configs mean
neutral values (0, 0, 1, 1). The frozen legacy fixtures remain unchanged.
Reset effects leaves the composition, palette, timing and other edits intact.

Effects run after the complete scene and its secondary layer are rendered.
Blur and bloom use separate horizontal and vertical texture passes with mip
filtering; no scene shader is repeated for a blur sample. Glow extracts bright
areas and adds their softened light. Saturation and contrast operate on that
result. Radii scale with the frame's shorter side so preview and export retain
the same appearance. No animation history is used.

Neutral effects bypass all extra passes and preserve exact original pixels.
GPU checks verify blur reduces spatial detail, glow increases brightness
without dimming pixels, zero saturation produces monochrome, zero contrast
produces neutral grey, and resetting restores the original pixels. Combined
effects preserve loop closure for all authored styles; all four blend modes,
portrait/square/landscape resizing and returning to the neutral path pass.
The permanent `/gl-test` diagnostic also covers effects on every active family.

The real two-second MP4 ZIP test includes effect settings in its sidecar and
full config. Tray deduplication distinguishes effect variants while treating
missing effects and explicit neutral effects as the same look. 101 unit tests
cover compatibility, persistence, reproduction metadata and variant identity.

A paired 1080p run on the same Apple M4 measured Constellation trails at 32.4 ms
synchronized p95 with neutral effects and 27.3 ms with combined effects (blur
0.6, glow 0.45, saturation 1.25, contrast 1.1). The GPU p95 values were 30.16 ms
and 25.65 ms respectively, across 20 phases after warmup. These machine-specific
times vary with load; they do not establish a speed improvement from effects.
