# jedylabs — loop studio

Generate seamless looping background videos in the browser: animated WebGL
shaders with modern designs, randomized or edited by hand, exported as MP4.

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

- **Space** play/pause · **R** random design · **C** edit loop · **L** pack
- `?seed=N` in the URL reproduces a specific random design.
- Use the **ES / EN** switch in the top bar to change the interface language.
  The choice is saved in the browser; first-time visitors use their browser language.
- Use the **GitHub** button in the top bar to view the source and contribute.

## Main workflow

- **Edit** contains the current loop's design, fine controls and venue preview.
  Changes appear immediately behind the dialog.
- **Random** samples all 41 loop types, including hologram, accretion, fractals,
  noise, waves, singularity, warped noise, and the existing aurora, plasma,
  smoke, nebula, and lava lamp effects.
- **Beat sync** converts BPM and beat count into a mathematically exact loop length.
- Palettes can use a preset or 2–6 individually editable custom colors.
- **Pack** adds the current loop or creates a group of loops. Guided creation is
  the default; random and matrix methods remain in the creation menu.
- **Export** saves the current video or all loops in the Tray as one ZIP.
- Pack ZIPs default to a searchable structure: `catalog.html` provides visual
  previews and combined filters for type, color, speed and motion; `index.csv`
  works in spreadsheets and asset managers. Organization and pack finishing
  remain available under **Pack options** in Export. High/Master encoding preserves fine detail.

AI generation is temporarily disabled. The dock button, `G` shortcut, and API
are available again when `NEXT_PUBLIC_AI_ENABLED=true` is set and the app is rebuilt.

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
