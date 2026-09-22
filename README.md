# jedylabs — loop studio

Generate seamless looping background videos in the browser: animated WebGL
shaders with modern designs, randomized or AI-generated, exported as MP4.

## Why the loops are perfect

Every shader is driven by a normalized phase `t ∈ [0,1)`, and time only enters
the GLSL as `sin`/`cos` of **integer harmonics** of `2π·t`. Every animated term
therefore completes a whole number of cycles per loop, so frame 0 and frame N
are mathematically identical — the seam does not exist. `/gl-test` verifies
this on your GPU: it renders phase 0 and phase 1 and asserts the pixels match
byte-for-byte, and runs a small real export through the encoder.

Export renders offline, frame by frame (exactly `fps × duration` frames), and
encodes with WebCodecs → H.264 MP4 (`mp4-muxer`). Browsers without WebCodecs
fall back to a realtime WebM capture via MediaRecorder.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- **Space** play/pause · **R** random design · **G** AI generate · **C** Loop Designer · **L** Pack Builder · **P** parameters
- `?seed=N` in the URL reproduces a specific random design.

## Loop Designer and Pack Builder

- **Loop Designer** edits only the current loop: it blends two shader families with
  mix, screen, multiply or difference and controls its palette, movement and timing.
- **Beat sync** converts BPM and beat count into a mathematically exact loop length.
- **Venue Preview** shows the current loop on a projection screen, concert LED
  wall, and projection-mapped immersive room.
- Palettes can use a preset or 2–6 individually editable custom colors.
- **Pack Builder & Batch Export** owns every multi-loop workflow: Directed Pack
  creates a coherent sale-ready collection, Matrix Batch creates all chosen
  combinations, and Random Batch explores the design space.
- Every multi-loop method adds to the same **Tray**. The ZIP export always renders
  exactly the loops currently in that Tray.
- Pack ZIPs default to a searchable structure: `catalog.html` provides visual
  previews and combined filters for type, color, speed and motion; `index.csv`
  works in spreadsheets and asset managers; filenames and JSON sidecars retain
  the same searchable tags. Legacy single-axis folders remain optional.
- Export finishing can override sharpness, grain and vignette for one video or
  normalize the entire pack. High/Master encoding preserves fine detail.

OpenRouter key and model selection live inside the **Generate with AI** dialog.

## AI generator (OpenRouter)

The Generate dialog asks a model for a shader config (family, palette, motion)
matching your prompt — output is validated server-side, so results always
compile and always loop. Provide a key either way:

- Paste it in **Settings** in the app (stored in your browser's localStorage), or
- Set `OPENROUTER_API_KEY` in `.env.local` (see `.env.example`) for a
  server-side key shared by all users of your deployment.

## Stack

Next.js (App Router) · Tailwind 4 + shadcn/ui · WebGL2 · WebCodecs + mp4-muxer
· zod · OpenRouter.

## Tests

```bash
npm test        # vitest: config schema, RNG determinism, loop-safety of GLSL
```

Visit `/gl-test` in a browser for the GPU-level loop-exactness and export
diagnostics.
