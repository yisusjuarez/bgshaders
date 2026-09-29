import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AI_ENABLED } from "@/lib/features";
import {
  BLEND_MODES,
  FAMILIES,
  MOTION_DNAS,
  shaderConfigSchema,
  type ShaderConfig,
} from "@/lib/shader/schema";

const requestSchema = z.object({
  prompt: z.string().min(1).max(500),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

const SYSTEM_PROMPT = `You design looping animated background videos by emitting a JSON config for a WebGL shader engine. Respond with ONLY a JSON object, no markdown fences, no prose.

Schema:
{
  "name": string,            // short evocative title for the design, max 4 words
  "family": one of ${JSON.stringify(FAMILIES)},
  "colors": string[2..6],    // #rrggbb hex, ordered dark → light; first color anchors the background
  "speed": 1 | 2 | 3,        // integer cycles per loop; 1 = calm, 3 = energetic
  "scale": 0.4..3,           // pattern size; higher = bigger, visually softer shapes
  "complexity": 0..1,        // layer density
  "warp": 0..1,              // organic distortion amount
  "grain": 0..0.2,           // film grain
  "sharpness": -1..1,        // -1 soft focus, 0 neutral, 1 crisp detail
  "vignette": 0..1,          // edge darkening
  "duration": 2..30,         // loop length in seconds
  "secondaryFamily": one of ${JSON.stringify(FAMILIES)} or null,
  "blendMode": one of ${JSON.stringify(BLEND_MODES)},
  "blendAmount": 0..1,
  "motionDNA": one of ${JSON.stringify(MOTION_DNAS)},
  "bpm": integer 30..240,
  "beats": integer 1..64
}

Family guide:
- mesh: soft drifting mesh-gradient color fields (modern, calm, great for hero sections)
- silk: flowing fabric-like wave bands
- aurora: vertical light curtains on a dark sky
- smoke: rolling clouds of blended color
- orbs: drifting bokeh circles
- grid: pulsing dot lattice, tech feel
- rings: concentric ripples spreading from drifting centers, water feel
- rays: soft light beams sweeping around the center, spotlight feel
- cells: organic voronoi mosaic with dark seams, stained-glass feel
- ribbons: bold near-hard bands of color flowing diagonally
- halftone: print-style dots whose size follows a slow wave, editorial feel
- nebula: twinkling starfield over slow nebula clouds, space feel
- topo: thin topographic contour lines over morphing terrain, cartographic feel
- lava: metaball blobs merging and splitting, lava-lamp feel
- kaleido: mirrored kaleidoscope sectors rotating, ornamental feel
- hex: hexagonal tiles lit by a travelling pulse, honeycomb tech feel
- weave: crossing wave gratings forming moiré interference, textile feel
- spiral: swirling log-spiral arms, hypnotic feel
- prism: sliding glass gradient strips with edge sheen, glassmorphism feel
- breath: one soft glow slowly inhaling/exhaling, meditative minimal feel
- rain: streaks falling at different depths, rainy-window feel
- chevron: zigzag color bands marching steadily, sporty graphic feel
- sweep: a clean linear gradient whose direction slowly rotates, ultra-minimal
- marble: liquid marbling with flowing colored veins, luxurious organic feel
- caustics: refracted networks of underwater light, luminous aquatic feel
- ink: soft ink blooms expanding and folding into one another, expressive organic feel
- checker: a warped checkerboard rippling in perspective, kinetic graphic feel
- tunnel: a radial retro tunnel with repeating depth, energetic synthwave feel
- maze: animated circuit-like labyrinth tiles, precise technological feel
- orbitals: elliptical paths with glowing bodies in motion, elegant astronomical feel
- plasma: layered sine fields producing vivid liquid color, classic digital feel
- glitch: sliced blocks with rhythmic RGB displacement, disruptive experimental feel
- equalizer: rows of spectrum bars pulsing in waves, musical graphic feel
- radar: luminous sweep, range rings and blinking targets, interface sci-fi feel
- hologram: iridescent interference stripes with subtle scanlines
- accretion: bright rotating disk surrounding a dark center
- fractals: folded, self-similar filaments and branching boundaries
- noise: layered animated value noise with fine granular detail
- waves: broad stacked water-like wave bands with bright crests
- singularity: dark event horizon with gravitationally bent light arcs
- warpedNoise: smooth turbulent noise displaced by other noise fields

Pick colors that match the mood of the user's request. Prefer speed 1 and duration 8-12 for ambient backgrounds unless the request implies energy.`;

/** Clamp/repair a model response into a valid config rather than failing on
 *  near-misses (e.g. speed 1.5 or scale slightly out of range). */
function repair(raw: Record<string, unknown>): ShaderConfig | null {
  const num = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  const colors = Array.isArray(raw.colors)
    ? raw.colors.filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 6)
    : [];
  const bpm = Math.round(num(raw.bpm, 30, 240, 120));
  const beats = Math.round(num(raw.beats, 1, 64, 16));
  const beatDuration = (60 * beats) / bpm;
  const candidate = {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 60) : "Untitled Loop",
    family: FAMILIES.includes(raw.family as never) ? raw.family : "mesh",
    seed: Math.floor(Math.random() * 1_000_000),
    colors,
    speed: Math.round(num(raw.speed, 1, 3, 1)),
    scale: num(raw.scale, 0.4, 3, 1),
    complexity: num(raw.complexity, 0, 1, 0.6),
    warp: num(raw.warp, 0, 1, 0.4),
    grain: num(raw.grain, 0, 0.2, 0.05),
    sharpness: num(raw.sharpness, -1, 1, 0.25),
    vignette: num(raw.vignette, 0, 1, 0.4),
    duration:
      beatDuration >= 2 && beatDuration <= 30
        ? beatDuration
        : num(raw.duration, 2, 30, 10),
    secondaryFamily: FAMILIES.includes(raw.secondaryFamily as never)
      ? raw.secondaryFamily
      : null,
    blendMode: BLEND_MODES.includes(raw.blendMode as never) ? raw.blendMode : "mix",
    blendAmount: num(raw.blendAmount, 0, 1, 0.45),
    motionDNA: MOTION_DNAS.includes(raw.motionDNA as never) ? raw.motionDNA : "fluid",
    bpm,
    beats,
  };
  const parsed = shaderConfigSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { error: "AI generation is temporarily unavailable." },
      { status: 503 },
    );
  }

  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { prompt, apiKey, model } = body.data;
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "No OpenRouter API key. Add one in Settings or set OPENROUTER_API_KEY." },
      { status: 401 },
    );
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://localhost",
      "X-Title": "jedylabs loop studio",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message =
      res.status === 401
        ? "OpenRouter rejected the API key."
        : `OpenRouter request failed (${res.status}).`;
    console.error("openrouter error", res.status, detail.slice(0, 500));
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) {
    return NextResponse.json({ error: "Empty response from the model." }, { status: 502 });
  }

  let raw: Record<string, unknown>;
  try {
    // Tolerate fenced output despite instructions.
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return NextResponse.json({ error: "The model returned invalid JSON. Try again." }, { status: 502 });
  }

  const config = repair(raw);
  if (!config || config.colors.length < 2) {
    return NextResponse.json({ error: "The model returned an unusable config. Try again." }, { status: 502 });
  }
  return NextResponse.json({ config });
}
