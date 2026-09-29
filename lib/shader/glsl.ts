import type { BlendMode, Family } from "./schema";

/**
 * Loop-safety contract: `u_phase` is in [0,1) and time may ONLY enter a shader
 * as sin/cos of `k*T` where T = TAU*u_phase*u_speed and k is an integer.
 * u_speed is an integer uniform, so every animated term completes a whole
 * number of cycles per loop and frame 0 equals frame N exactly.
 */
export const VERTEX_SRC = `#version 300 es
void main() {
  vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);
}
`;

const PRELUDE = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_phase;      // 0..1 normalized loop position
uniform float u_speed;      // integer harmonic multiplier
uniform float u_seed;
uniform vec3 u_colors[6];
uniform int u_ncolors;
uniform float u_scale;
uniform float u_complexity;
uniform float u_warp;
uniform float u_grain;
uniform float u_sharpness;
uniform float u_vignette;
uniform float u_blend_amount;
out vec4 fragColor;
#define TAU 6.28318530718

float hash(float n) {
  return fract(sin(n * 127.1 + fract(u_seed * 0.1031) * 311.7) * 43758.5453);
}

float valueNoise(vec2 p, float T) {
  vec2 id = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = 0.5 + 0.5 * sin(T + TAU * hash(id.x * 127.1 + id.y * 311.7));
  float b = 0.5 + 0.5 * sin(T + TAU * hash((id.x + 1.0) * 127.1 + id.y * 311.7));
  float c = 0.5 + 0.5 * sin(T + TAU * hash(id.x * 127.1 + (id.y + 1.0) * 311.7));
  float d = 0.5 + 0.5 * sin(T + TAU * hash((id.x + 1.0) * 127.1 + (id.y + 1.0) * 311.7));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 pal(float t) {
  t = clamp(t, 0.0, 1.0);
  float f = t * float(u_ncolors - 1);
  int i = int(floor(f));
  int j = min(i + 1, u_ncolors - 1);
  return mix(u_colors[i], u_colors[j], smoothstep(0.0, 1.0, fract(f)));
}
`;

const MAIN = `
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * u_res) / min(u_res.x, u_res.y);
  uv /= u_scale;
  float T = TAU * u_phase * u_speed;
  vec3 col = scene(uv, T);
  if (abs(u_sharpness) > 0.001) {
    vec2 px = vec2(1.0 / min(u_res.x, u_res.y) / u_scale, 0.0);
    vec3 soft = (scene(uv + px, T) + scene(uv - px, T)
      + scene(uv + px.yx, T) + scene(uv - px.yx, T) + col * 4.0) / 8.0;
    col = u_sharpness < 0.0
      ? mix(col, soft, -u_sharpness)
      : col + (col - soft) * u_sharpness * 3.0;
  }
  float vd = length((frag - 0.5 * u_res) / u_res);
  col *= 1.0 - u_vignette * smoothstep(0.35, 0.9, vd);
  // static grain: loop-safe by construction and dithers gradient banding
  float g = fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * u_grain;
  fragColor = vec4(col, 1.0);
}
`;

const SCENES: Record<Family, string> = {
  // Soft color fields drifting on Lissajous orbits — the classic mesh gradient.
  mesh: `
vec3 scene(vec2 uv, float T) {
  uv += u_warp * 0.3 * vec2(sin(uv.y * 2.0 + sin(T)), cos(uv.x * 2.0 + cos(T)));
  float n = mix(4.0, 8.0, u_complexity);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k1 = 1.0 + floor(hash(fi * 7.0 + 1.0) * 3.0);
    float k2 = 1.0 + floor(hash(fi * 7.0 + 2.0) * 3.0);
    vec2 base = (vec2(hash(fi * 7.0 + 3.0), hash(fi * 7.0 + 4.0)) - 0.5) * 1.7;
    vec2 amp = 0.25 + 0.35 * vec2(hash(fi * 7.0 + 5.0), hash(fi * 7.0 + 6.0));
    vec2 c = base + amp * vec2(sin(k1 * T + TAU * hash(fi * 7.0 + 8.0)),
                               cos(k2 * T + TAU * hash(fi * 7.0 + 9.0)));
    float r = 0.5 + 0.6 * hash(fi * 7.0 + 10.0);
    float d2 = dot(uv - c, uv - c);
    float w = exp(-d2 / (r * r * 0.35));
    acc += pal(hash(fi * 7.0 + 11.0)) * w;
    wsum += w;
  }
  vec3 col = acc / max(wsum, 0.001);
  return mix(u_colors[0] * 0.35, col, clamp(wsum, 0.0, 1.0));
}
`,
  // Flowing bands from iteratively warped directional waves.
  silk: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * 1.6;
  float layers = mix(3.0, 7.0, u_complexity);
  float acc = 0.0, amp = 1.0, tot = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= layers) break;
    float k = 1.0 + floor(hash(fi + 31.0) * 2.0);
    float ang = TAU * hash(fi + 37.0);
    vec2 dir = vec2(cos(ang), sin(ang));
    float w = sin(dot(q, dir) * (2.0 + fi * 1.3) + k * T + TAU * hash(fi + 41.0));
    q += u_warp * 0.35 * amp * w * vec2(-dir.y, dir.x);
    acc += amp * w;
    tot += amp;
    amp *= 0.72;
  }
  float v = 0.5 + 0.5 * acc / tot;
  return pal(v);
}
`,
  // Vertical light curtains over a dark sky, additive with soft tone mapping.
  aurora: `
vec3 scene(vec2 p, float T) {
  vec3 col = u_colors[0] * 0.22;
  float n = mix(3.0, 6.0, u_complexity);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = 1.0 + floor(hash(fi + 3.0) * 2.0);
    float xc = (hash(fi + 13.0) - 0.5) * 2.2;
    float xx = p.x - xc
      + 0.45 * sin(p.y * (1.0 + 2.0 * hash(fi + 17.0)) + k * T + TAU * hash(fi + 19.0))
      * (0.3 + u_warp);
    float band = exp(-xx * xx * (6.0 + 10.0 * hash(fi + 23.0)));
    float shimmer = 0.55 + 0.45 * sin(k * T + p.y * 2.0 + TAU * hash(fi + 29.0));
    col += pal(hash(fi + 31.0)) * band * shimmer * 0.55;
  }
  return col / (0.85 + 0.3 * col);
}
`,
  // Iterated sin-warp field — slow rolling clouds of color.
  smoke: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * 2.0;
  float it = mix(4.0, 8.0, u_complexity);
  float acc = 0.0, amp = 1.0, tot = 0.0;
  mat2 R = mat2(0.86, 0.5, -0.5, 0.86);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= it) break;
    float k = 1.0 + floor(hash(fi + 51.0) * 2.0);
    q += u_warp * 0.55 * amp * vec2(sin(q.y + k * T + TAU * hash(fi + 53.0)),
                                    cos(q.x + k * T + TAU * hash(fi + 57.0)));
    acc += amp * sin(q.x + sin(q.y + k * T + TAU * hash(fi + 59.0)));
    tot += amp;
    q = R * q * 1.25;
    amp *= 0.7;
  }
  float v = 0.5 + 0.5 * acc / tot;
  return pal(v);
}
`,
  // Drifting bokeh discs, some crisp, some defocused, over a quiet gradient.
  orbs: `
vec3 scene(vec2 p, float T) {
  vec3 col = mix(u_colors[0], u_colors[1] * 0.6, 0.5 + 0.5 * p.y) * 0.4;
  float n = mix(6.0, 14.0, u_complexity);
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k1 = 1.0 + floor(hash(fi * 9.0 + 1.0) * 2.0);
    float k2 = 1.0 + floor(hash(fi * 9.0 + 2.0) * 2.0);
    vec2 base = (vec2(hash(fi * 9.0 + 3.0), hash(fi * 9.0 + 4.0)) - 0.5) * 2.0;
    vec2 c = base + (0.15 + 0.3 * hash(fi * 9.0 + 5.0) + 0.3 * u_warp)
      * vec2(sin(k1 * T + TAU * hash(fi * 9.0 + 6.0)),
             cos(k2 * T + TAU * hash(fi * 9.0 + 7.0)));
    float r = 0.06 + 0.22 * hash(fi * 9.0 + 8.0);
    float soft = mix(0.02, 0.3, hash(fi * 9.0 + 9.0));
    float a = smoothstep(r + soft, r - soft, length(p - c));
    col += pal(hash(fi * 9.0 + 10.0)) * a * (0.25 + 0.3 * hash(fi * 9.0 + 11.0));
  }
  return col / (0.8 + 0.3 * col);
}
`,
  // Concentric ripples travelling outward from a few drifting centers.
  rings: `
vec3 scene(vec2 p, float T) {
  p += u_warp * 0.25 * vec2(sin(p.y * 2.0 + T), cos(p.x * 2.0 + T));
  float n = mix(2.0, 5.0, u_complexity);
  float v = 0.0, tot = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = 1.0 + floor(hash(fi + 71.0) * 2.0);
    vec2 c = (vec2(hash(fi + 73.0), hash(fi + 79.0)) - 0.5) * 1.6;
    float freq = 4.0 + 6.0 * hash(fi + 83.0);
    float w = 1.0 / (1.0 + fi);
    v += w * sin(length(p - c) * freq - k * T + TAU * hash(fi + 89.0));
    tot += w;
  }
  return pal(0.5 + 0.5 * v / tot);
}
`,
  // Soft conic beams sweeping around the center; integer fold symmetry keeps
  // the angular seam invisible.
  rays: `
vec3 scene(vec2 p, float T) {
  float r = length(p);
  float ang = atan(p.y, p.x) + u_warp * 0.3 * sin(r * 3.0 - T);
  vec3 col = u_colors[0] * 0.3;
  float n = mix(2.0, 5.0, u_complexity);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float m = 2.0 + floor(hash(fi + 11.0) * 5.0);
    float k = 1.0 + floor(hash(fi + 13.0) * 2.0);
    float dir = hash(fi + 17.0) > 0.5 ? 1.0 : -1.0;
    float beam = 0.5 + 0.5 * sin(ang * m + dir * k * T + TAU * hash(fi + 19.0));
    beam = pow(beam, mix(2.0, 6.0, hash(fi + 23.0)));
    col += pal(hash(fi + 29.0)) * beam * 0.4 * smoothstep(0.0, 0.35, r) * exp(-r * 0.55);
  }
  return col / (0.8 + 0.3 * col);
}
`,
  // Voronoi mosaic whose feature points orbit inside their cells.
  cells: `
vec3 scene(vec2 p, float T) {
  vec2 g = p * mix(2.5, 6.0, u_complexity);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float amp = 0.18 + 0.24 * u_warp;
  float d1 = 8.0, d2 = 8.0, hc = 0.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 cid = id + o;
    float h = hash(cid.x * 57.0 + cid.y * 113.0);
    float k1 = 1.0 + floor(hash(cid.x * 31.0 + cid.y * 61.0 + 5.0) * 2.0);
    float k2 = 1.0 + floor(hash(cid.x * 41.0 + cid.y * 71.0 + 9.0) * 2.0);
    vec2 pt = o + 0.5
      + amp * vec2(sin(k1 * T + h * TAU), cos(k2 * T + h * TAU * 2.0)) - f;
    float d = dot(pt, pt);
    if (d < d1) { d2 = d1; d1 = d; hc = h; }
    else if (d < d2) { d2 = d; }
  }
  d1 = sqrt(d1); d2 = sqrt(d2);
  float edge = d2 - d1;
  vec3 col = pal(hc) * (0.6 + 0.4 * smoothstep(0.0, 0.5, edge));
  col *= 0.3 + 0.7 * smoothstep(0.0, 0.12, edge); // dark seams between cells
  return col;
}
`,
  // Flowing bands of near-hard color that scroll a whole number of periods
  // per loop.
  ribbons: `
vec3 scene(vec2 p, float T) {
  float ang = TAU * hash(31.0);
  vec2 dir = vec2(cos(ang), sin(ang));
  float v = dot(p, dir) * 4.0;
  float layers = mix(2.0, 5.0, u_complexity);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi >= layers) break;
    float k = 1.0 + floor(hash(fi + 41.0) * 2.0);
    v += (0.25 + 0.45 * u_warp) / (1.0 + fi * 0.7)
      * sin(dot(p, vec2(-dir.y, dir.x)) * (1.5 + fi) + k * T + TAU * hash(fi + 43.0));
  }
  // The banding below repeats every 2 units of v, so scroll 2 units per
  // harmonic cycle: exactly u_speed whole pattern-periods per loop.
  v += 2.0 * (T / TAU);
  float bands = 3.0 + floor(hash(47.0) * 3.0);
  float fv = fract(v * 0.5);
  float idx = floor(fv * bands) / bands;
  float e = fract(fv * bands);
  vec3 a = pal(idx);
  vec3 b = pal(fract(idx + 1.0 / bands));
  return mix(a, b, smoothstep(0.9, 1.0, e));
}
`,
  // Print-style halftone: dot size follows a slow interference wave.
  halftone: `
vec3 scene(vec2 p, float T) {
  float a = 0.15 + hash(3.0) * 0.5;
  mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 q = R * p;
  q += u_warp * 0.2 * vec2(sin(q.y * 2.5 + T), cos(q.x * 2.5 + T));
  float cells = mix(18.0, 46.0, u_complexity);
  vec2 id = floor(q * cells);
  vec2 f = fract(q * cells) - 0.5;
  vec2 cp = (id + 0.5) / cells;
  float w = 0.5 * sin(cp.x * 3.0 + sin(cp.y * 2.0 + T) + T)
          + 0.5 * sin(cp.y * 4.0 - T + TAU * hash(7.0));
  float s = 0.30 + 0.20 * w;
  float m = smoothstep(s, s - 0.1, length(f));
  vec3 paper = u_colors[0] * 0.45;
  vec3 ink = pal(0.6 + 0.4 * w * 0.5);
  return mix(paper, ink, m);
}
`,
  // Slow nebula clouds behind a twinkling starfield.
  nebula: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * 1.5;
  float acc = 0.0, amp = 1.0, tot = 0.0;
  mat2 R = mat2(0.86, 0.5, -0.5, 0.86);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float k = 1.0 + floor(hash(fi + 61.0) * 2.0);
    q += u_warp * 0.4 * amp * vec2(sin(q.y + k * T + TAU * hash(fi + 63.0)),
                                   cos(q.x + k * T + TAU * hash(fi + 67.0)));
    acc += amp * sin(q.x + sin(q.y + k * T));
    tot += amp;
    q = R * q * 1.35;
    amp *= 0.65;
  }
  float v = 0.5 + 0.5 * acc / tot;
  vec3 col = pal(v * 0.55) * 0.75;
  float sc = mix(8.0, 20.0, u_complexity);
  vec2 sid = floor(p * sc);
  vec2 sf = fract(p * sc);
  float h = hash(sid.x * 57.0 + sid.y * 113.0);
  if (h > 0.62) {
    vec2 spos = vec2(hash(sid.x * 91.0 + sid.y * 33.0 + 1.0),
                     hash(sid.x * 23.0 + sid.y * 87.0 + 2.0)) * 0.6 + 0.2;
    float k = 1.0 + floor(h * 3.0);
    float tw = 0.55 + 0.45 * sin(k * T + h * TAU * 5.0);
    float d = length(sf - spos);
    col += mix(vec3(1.0), pal(0.9), 0.35) * exp(-d * d * 260.0) * tw;
  }
  return col;
}
`,
  // Thin topographic iso-lines over a slowly morphing height field.
  topo: `
vec3 scene(vec2 p, float T) {
  float h = 0.0, amp = 1.0, tot = 0.0;
  float n = mix(3.0, 6.0, u_complexity);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = 1.0 + floor(hash(fi + 3.0) * 2.0);
    float aa = TAU * hash(fi + 5.0);
    vec2 dir = vec2(cos(aa), sin(aa));
    h += amp * sin(dot(p, dir) * (1.5 + fi * 0.9) * (0.6 + 0.8 * u_warp)
                   + k * T + TAU * hash(fi + 7.0));
    tot += amp;
    amp *= 0.75;
  }
  h /= tot;
  vec3 col = pal(0.5 + 0.5 * h);
  float f = fract(h * 5.0);
  float line = 1.0 - smoothstep(0.0, 0.07, f) * smoothstep(1.0, 0.93, f);
  return col * (1.0 - 0.55 * line);
}
`,
  // Metaball blobs that merge and split, lava-lamp style.
  lava: `
vec3 scene(vec2 p, float T) {
  float field = 0.0, wsum = 0.0;
  vec3 tint = vec3(0.0);
  float n = mix(4.0, 9.0, u_complexity);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k1 = 1.0 + floor(hash(fi * 5.0 + 1.0) * 2.0);
    float k2 = 1.0 + floor(hash(fi * 5.0 + 2.0) * 2.0);
    vec2 c = (vec2(hash(fi * 5.0 + 3.0), hash(fi * 5.0 + 4.0)) - 0.5) * 1.5;
    c += (0.2 + 0.35 * u_warp) * vec2(sin(k1 * T + TAU * hash(fi * 5.0 + 6.0)),
                                      cos(k2 * T + TAU * hash(fi * 5.0 + 7.0)));
    float r = 0.09 + 0.13 * hash(fi * 5.0 + 8.0);
    float w = r * r / max(dot(p - c, p - c), 1e-4);
    field += w;
    tint += pal(hash(fi * 5.0 + 9.0)) * w;
    wsum += w;
  }
  vec3 blob = tint / max(wsum, 1e-3);
  float m = smoothstep(1.05, 1.4, field);
  float glow = smoothstep(0.45, 1.05, field) * 0.3;
  return mix(u_colors[0] * 0.35, blob, m) + blob * glow * (1.0 - m);
}
`,
  // Mirrored sectors of a warped field, spinning a whole number of fold-periods
  // per cycle so the mirror seam stays invisible for any fold count.
  kaleido: `
vec3 scene(vec2 p, float T) {
  float m = 3.0 + floor(hash(5.0) * 5.0);
  float sector = TAU / m;
  float r = length(p);
  // The mirror fold below has period 2*sector, which is finer than a full turn
  // whenever m > 2, so a raw '+ T' rotation only closes the loop when m*u_speed
  // is even. Advance a whole number of fold-periods per loop instead: this is
  // bit-identical to a full-turn spin when m*u_speed is already even, and keeps
  // the seam invisible for every m and integer u_speed otherwise.
  float turns = floor(u_speed * m * 0.5 + 0.5);
  float th = atan(p.y, p.x) + turns * sector * 2.0 * u_phase;
  th = abs(mod(th, sector * 2.0) - sector);
  vec2 q = vec2(cos(th), sin(th)) * r * 2.4;
  float v = 0.0, amp = 1.0, tot = 0.0;
  float n = mix(2.0, 4.0, u_complexity);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = 1.0 + floor(hash(fi + 7.0) * 2.0);
    v += amp * sin(q.x * (3.5 + fi * 2.0)
                   + (0.5 + u_warp) * sin(q.y * (2.5 + fi * 1.5) + k * T + TAU * hash(fi + 11.0)));
    v += amp * 0.5 * sin((q.x + q.y) * (2.5 + fi) - k * T + TAU * hash(fi + 15.0));
    tot += amp * 1.5;
    amp *= 0.7;
  }
  vec3 col = pal(0.5 + 0.5 * v / tot);
  return col * (0.45 + 0.55 * smoothstep(1.6, 0.2, r));
}
`,
  // Hexagonal tiles lit by a pulse travelling out from the center.
  hex: `
vec3 scene(vec2 p, float T) {
  p += u_warp * 0.15 * vec2(sin(p.y * 2.0 + T), cos(p.x * 2.0 + T));
  vec2 g = p * mix(3.0, 8.0, u_complexity);
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(g, s) - s * 0.5;
  vec2 b = mod(g - s * 0.5, s) - s * 0.5;
  vec2 f = dot(a, a) < dot(b, b) ? a : b;
  vec2 c = g - f;
  // Hex centers land on half-integer coords; double + round before hashing so
  // float error can't flip a tile's hash between neighboring pixels.
  vec2 hc = floor(c * 2.0 + 0.5);
  float h = hash(hc.x * 57.0 + hc.y * 113.0);
  float k = 1.0 + floor(hash(hc.x * 31.0 + hc.y * 71.0 + 3.0) * 2.0);
  float pulse = 0.5 + 0.5 * sin(k * T - length(c) * 0.45 + h * TAU);
  vec2 q = abs(f);
  float hd = max(q.x * 0.8660254 + q.y * 0.5, q.y);
  vec3 tile = pal(fract(h * 0.7 + 0.3 * pulse)) * (0.4 + 0.6 * pulse);
  return mix(u_colors[0] * 0.3, tile, smoothstep(0.5, 0.45, hd));
}
`,
  // Interference moiré from a few crossing wave gratings.
  weave: `
vec3 scene(vec2 p, float T) {
  p += u_warp * 0.2 * vec2(sin(p.y * 3.0 + T), cos(p.x * 3.0 + T));
  float v = 1.0, sum = 0.0, tot = 0.0;
  float n = 2.0 + floor(u_complexity * 2.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = 1.0 + floor(hash(fi + 21.0) * 2.0);
    float aa = TAU * hash(fi + 23.0);
    vec2 dir = vec2(cos(aa), sin(aa));
    float g = sin(dot(p, dir) * (10.0 + 12.0 * hash(fi + 27.0)) + k * T + TAU * hash(fi + 29.0));
    v *= 0.5 + 0.5 * g;
    sum += g;
    tot += 1.0;
  }
  return mix(pal(0.35 + 0.65 * v), pal(0.5 + 0.5 * sum / tot), 0.35);
}
`,
  // Log-spiral arms swirling around the center.
  spiral: `
vec3 scene(vec2 p, float T) {
  float r = max(length(p), 1e-3);
  float th = atan(p.y, p.x);
  float arms = 2.0 + floor(hash(3.0) * 4.0);
  float twist = 2.0 + 4.0 * u_warp;
  float v = 0.0, tot = 0.0;
  float n = 1.0 + floor(u_complexity * 2.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = 1.0 + floor(hash(fi + 9.0) * 2.0);
    float dir = hash(fi + 11.0) > 0.35 ? 1.0 : -1.0;
    float amp = 1.0 / (1.0 + fi);
    v += amp * sin(th * (arms + fi) + log(r) * (arms + fi) * twist * 0.5
                   - dir * k * T + TAU * hash(fi + 13.0));
    tot += amp;
  }
  vec3 col = pal(0.5 + 0.5 * v / tot);
  col *= 0.35 + 0.65 * smoothstep(1.6, 0.3, r);
  col *= 0.6 + 0.4 * smoothstep(0.0, 0.12, r);
  return col;
}
`,
  // Sliding glass strips, each a full palette gradient with an edge sheen.
  prism: `
vec3 scene(vec2 p, float T) {
  float ang = TAU * hash(13.0);
  vec2 dir = vec2(cos(ang), sin(ang));
  float s = dot(p, dir) * mix(1.5, 4.0, u_complexity);
  s += u_warp * 0.4 * sin(dot(p, vec2(-dir.y, dir.x)) * 2.0 + T);
  s += T / TAU; // fract period is 1 → shifts u_speed whole strips per loop
  float e = fract(s);
  vec3 col = pal(e);
  col += vec3(1.0) * (pow(e, 8.0) * 0.35 + pow(1.0 - e, 14.0) * 0.3);
  col *= 0.75 + 0.25 * smoothstep(0.0, 0.05, min(e, 1.0 - e));
  return col;
}
`,
  // A soft glow that inhales and exhales, with a slow rotating sheen.
  breath: `
vec3 scene(vec2 p, float T) {
  float r = length(p);
  float breathe = 0.5 + 0.18 * sin(T);
  // smoothstep from a negative edge keeps the center below 1.0 — no flat
  // blown-out plateau, just a soft peak.
  float v = 1.0 - smoothstep(-0.6, breathe + 0.6, r);
  float th = atan(p.y, p.x);
  v += 0.1 * (0.5 + 0.5 * sin(th + T)) * (1.0 - smoothstep(0.2, 1.2, r));
  v += u_warp * 0.07 * sin(r * 6.0 - 2.0 * T);
  v = pow(clamp(v, 0.0, 1.0), mix(1.4, 0.9, u_complexity));
  return pal(v * 0.92);
}
`,
  // Streaks falling at different depths; each column scrolls a whole number
  // of periods per loop.
  rain: `
vec3 scene(vec2 p, float T) {
  vec3 col = mix(u_colors[0] * 0.4, u_colors[1] * 0.25, 0.5 + 0.5 * p.y);
  float ncols = mix(6.0, 16.0, u_complexity);
  float slant = (u_warp - 0.5) * 0.8;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float cscale = ncols * (1.0 + fi * 0.7);
    float x = (p.x + p.y * slant) * cscale + hash(fi + 81.0) * 13.0;
    float id = floor(x);
    float fx = fract(x) - 0.5;
    float h = hash(id * 7.31 + fi * 91.0);
    float nper = 1.0 + floor(h * 2.99);
    float y = fract(-p.y * (0.4 + 0.5 * h) * (1.0 + fi * 0.5) + nper * (T / TAU) + h * 7.0);
    float trail = pow(1.0 - y, 3.0);
    float wd = smoothstep(0.18, 0.02, abs(fx));
    col += pal(0.55 + 0.35 * h) * trail * wd * step(0.3, h) * (0.5 - fi * 0.15);
  }
  return col;
}
`,
  // Zigzag color bands marching upward.
  chevron: `
vec3 scene(vec2 p, float T) {
  p.x += u_warp * 0.15 * sin(p.y * 2.0 + T);
  float fx = mix(1.5, 4.5, u_complexity);
  float zig = abs(fract(p.x * fx) - 0.5) * 2.0;
  float v = p.y * fx * 0.8 + zig * 0.5;
  v += T / TAU; // fract period is 1 → u_speed whole bands per loop
  float bands = 4.0 + floor(hash(17.0) * 3.0);
  float fv = fract(v);
  float idx = floor(fv * bands) / bands;
  float e = fract(fv * bands);
  vec3 aC = pal(idx);
  vec3 bC = pal(fract(idx + 1.0 / bands));
  return mix(aC, bC, smoothstep(0.92, 1.0, e));
}
`,
  // A clean linear gradient whose direction makes one full turn per loop.
  sweep: `
vec3 scene(vec2 p, float T) {
  float dirn = hash(9.0) > 0.5 ? 1.0 : -1.0;
  float th = TAU * hash(11.0) + dirn * T;
  vec2 dir = vec2(cos(th), sin(th));
  float g = dot(p, dir);
  g += u_warp * 0.25 * sin(dot(p, vec2(-dir.y, dir.x)) * 3.0 + T);
  float v = smoothstep(-1.1, 1.1, g);
  v = pow(v, mix(1.25, 0.8, u_complexity));
  return pal(v);
}
`,
  // Flowing marble veins built from repeated, loop-safe domain warps.
  marble: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * 2.1;
  float layers = mix(3.0, 6.0, u_complexity);
  float vein = 0.0, amp = 1.0, total = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= layers) break;
    float k = 1.0 + floor(hash(fi + 101.0) * 2.0);
    float phase = TAU * hash(fi + 103.0);
    vec2 bend = vec2(sin(q.y * (1.1 + fi * 0.3) + k * T + phase),
                     cos(q.x * (0.9 + fi * 0.25) - k * T + phase));
    q += bend * (0.18 + 0.38 * u_warp) * amp;
    vein += amp * sin(q.x * 1.5 + q.y * 0.55 + k * T + phase);
    total += amp;
    q = mat2(0.92, -0.38, 0.38, 0.92) * q * 1.18;
    amp *= 0.7;
  }
  float v = 0.5 + 0.5 * sin((vein / total) * 4.2 + q.x * 0.18);
  float fine = pow(1.0 - abs(2.0 * v - 1.0), 4.0);
  return mix(pal(v), pal(fract(v + 0.35)), fine * (0.25 + 0.35 * u_warp));
}
`,
  // Intersecting wave fronts form a refracted underwater light network.
  caustics: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * 3.0;
  float layers = mix(3.0, 6.0, u_complexity);
  float light = 0.0, total = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= layers) break;
    float a = TAU * hash(fi + 121.0);
    vec2 dir = vec2(cos(a), sin(a));
    float k = 1.0 + floor(hash(fi + 123.0) * 3.0);
    float wave = sin(dot(q, dir) * (1.0 + fi * 0.22) + k * T + TAU * hash(fi + 127.0));
    q += vec2(-dir.y, dir.x) * wave * u_warp * 0.12;
    light += pow(1.0 - abs(wave), 7.0) / (1.0 + fi * 0.28);
    total += 1.0 / (1.0 + fi * 0.28);
  }
  light = clamp(light / total * 3.4, 0.0, 1.0);
  float water = 0.45 + 0.25 * sin(q.x * 0.45 + q.y * 0.3 + T);
  vec3 base = pal(clamp(water, 0.0, 1.0)) * 0.55;
  return base + pal(0.92) * light * (0.65 + 0.35 * sin(T) * sin(T));
}
`,
  // Soft pigment blooms orbit, merge and reveal fine ink contours.
  ink: `
vec3 scene(vec2 p, float T) {
  float n = mix(4.0, 9.0, u_complexity);
  float field = 0.0;
  vec3 pigment = vec3(0.0);
  float weight = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k1 = 1.0 + floor(hash(fi + 141.0) * 2.0);
    float k2 = 1.0 + floor(hash(fi + 143.0) * 3.0);
    float ph = TAU * hash(fi + 147.0);
    vec2 c = (vec2(hash(fi + 149.0), hash(fi + 151.0)) - 0.5) * 1.35;
    c += (0.12 + 0.32 * u_warp) * vec2(sin(k1 * T + ph), cos(k2 * T + ph));
    vec2 d = p - c;
    d.x += 0.18 * u_warp * sin(d.y * 5.0 + T + ph);
    float radius = 0.16 + 0.28 * hash(fi + 157.0);
    float w = exp(-dot(d, d) / (radius * radius));
    field += w;
    pigment += pal(hash(fi + 163.0)) * w;
    weight += w;
  }
  vec3 paper = pal(0.04) * 0.42;
  vec3 inkCol = pigment / max(weight, 0.001);
  float fill = smoothstep(0.08, 0.75, field);
  float contour = pow(0.5 + 0.5 * sin(field * 18.0 - T), 10.0) * fill;
  return mix(paper, inkCol, fill * 0.88) + pal(0.9) * contour * 0.22;
}
`,
  // A checkerboard flexes like a sheet while color pulses cross its cells.
  checker: `
vec3 scene(vec2 p, float T) {
  float a = (hash(211.0) - 0.5) * 0.7;
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  p += u_warp * 0.2 * vec2(sin(p.y * 3.0 + T), cos(p.x * 3.0 - T));
  float cells = mix(4.0, 11.0, u_complexity);
  vec2 g = p * cells;
  vec2 id = floor(g);
  vec2 f = fract(g);
  float parity = mod(id.x + id.y, 2.0);
  float pulse = 0.5 + 0.5 * sin(T + (id.x + id.y) * 0.35);
  vec3 aCol = pal(0.08 + pulse * 0.25);
  vec3 bCol = pal(0.65 + pulse * 0.3);
  float edge = min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y));
  vec3 col = mix(aCol, bCol, parity);
  col += pal(0.95) * exp(-edge * edge * 900.0) * 0.12;
  return col;
}
`,
  // Angular and radial waves create a repeating flight through a neon tunnel.
  tunnel: `
vec3 scene(vec2 p, float T) {
  p += u_warp * 0.12 * vec2(sin(T), cos(T));
  float r = max(length(p), 0.015);
  float a = atan(p.y, p.x);
  float sides = 5.0 + floor(u_complexity * 7.0);
  float depthPhase = log(r) * (2.2 + u_complexity) - T / TAU;
  float rings = 0.5 + 0.5 * cos(TAU * depthPhase);
  float spokes = 0.5 + 0.5 * cos(a * sides + u_warp * sin(T));
  float grid = pow(rings, 5.0) + pow(spokes, 10.0) * 0.55;
  float flow = 0.5 + 0.5 * sin(TAU * depthPhase + a * 2.0);
  vec3 col = pal(flow) * (0.28 + 0.72 * clamp(grid, 0.0, 1.0));
  col += pal(0.95) * pow(max(0.0, 1.0 - r), 5.0) * 0.2;
  return col;
}
`,
  // Diagonal traces in seeded tiles assemble into a pulsing circuit maze.
  maze: `
vec3 scene(vec2 p, float T) {
  p += u_warp * 0.08 * vec2(sin(p.y * 2.0 + T), cos(p.x * 2.0 + T));
  float cells = mix(5.0, 13.0, u_complexity);
  vec2 g = p * cells;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id.x * 71.0 + id.y * 131.0);
  float s = h > 0.5 ? 1.0 : -1.0;
  float trace = 1.0 - smoothstep(0.045, 0.12, abs(f.x + s * f.y));
  float node = 1.0 - smoothstep(0.06, 0.13, length(abs(f) - vec2(0.42)));
  float pulse = 0.5 + 0.5 * sin(T * (1.0 + floor(h * 2.0)) - (id.x + id.y) * 0.32);
  vec3 base = pal(0.05 + 0.18 * h) * 0.38;
  vec3 wire = pal(0.45 + 0.5 * pulse);
  return base + wire * max(trace, node * 0.6) * (0.35 + 0.65 * pulse);
}
`,
  // Elliptical tracks and their luminous bodies move in closed orbits.
  orbitals: `
vec3 scene(vec2 p, float T) {
  vec3 col = pal(0.03) * 0.3;
  float n = mix(3.0, 7.0, u_complexity);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float ph = TAU * hash(fi + 227.0);
    float angle = TAU * hash(fi + 229.0);
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 q = rot * p;
    float radius = 0.2 + fi * 0.105;
    float squash = 0.52 + 0.38 * hash(fi + 233.0);
    float orbitD = abs(length(vec2(q.x, q.y / squash)) - radius);
    float line = exp(-orbitD * orbitD * 4200.0);
    float k = 1.0 + floor(hash(fi + 239.0) * 3.0);
    vec2 body = rot * vec2(radius * cos(k * T + ph), radius * squash * sin(k * T + ph));
    body += u_warp * 0.035 * vec2(sin(T + ph), cos(T + ph));
    float glow = exp(-dot(p - body, p - body) * (240.0 - fi * 12.0));
    vec3 c = pal(hash(fi + 241.0));
    col += c * (line * 0.16 + glow * 0.8);
  }
  return col / (0.8 + 0.22 * col);
}
`,
  // Classic layered sine plasma with a modern palette treatment.
  plasma: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * (2.2 + u_complexity * 1.8);
  float v = sin(q.x + T);
  v += sin(q.y * 1.25 - 2.0 * T + TAU * hash(251.0));
  v += sin((q.x + q.y) * 0.72 + T + TAU * hash(257.0));
  vec2 c = q + u_warp * 1.2 * vec2(sin(T), cos(T));
  v += sin(length(c) * (2.0 + u_complexity * 2.0) - 2.0 * T);
  v += u_warp * sin(q.x * 1.7 + sin(q.y + T) * 2.0 - T);
  v = 0.5 + 0.5 * sin(v * 1.15);
  return pal(v);
}
`,
  // Horizontal digital slices displace color channels on rhythmic pulses.
  glitch: `
float glitchField(vec2 p, float T) {
  return 0.5 + 0.25 * sin(p.x * 3.2 + T) + 0.25 * sin(p.y * 4.7 - 2.0 * T);
}
vec3 scene(vec2 p, float T) {
  float rows = mix(7.0, 24.0, u_complexity);
  float row = floor((p.y + 1.5) * rows);
  float h = hash(row + 271.0);
  float gate = pow(0.5 + 0.5 * sin(T * (1.0 + floor(h * 3.0)) + h * TAU), 7.0);
  float shift = (h - 0.5) * u_warp * 0.42 * gate;
  vec2 q = p + vec2(shift, 0.0);
  float split = (0.006 + 0.025 * u_warp) * (0.3 + gate);
  vec3 left = pal(glitchField(q - vec2(split, 0.0), T));
  vec3 mid = pal(glitchField(q, T));
  vec3 right = pal(glitchField(q + vec2(split, 0.0), T));
  vec3 col = vec3(left.r, mid.g, right.b);
  float cut = 1.0 - smoothstep(0.0, 0.035, abs(fract((p.y + 1.5) * rows) - 0.5));
  return mix(col, pal(fract(h + T / TAU)), cut * gate * 0.28);
}
`,
  // Spectrum columns pulse in harmonized waves across the frame.
  equalizer: `
vec3 scene(vec2 p, float T) {
  float bars = mix(9.0, 28.0, u_complexity);
  float gx = (p.x + 1.25) * bars * 0.45;
  float id = floor(gx);
  float x = abs(fract(gx) - 0.5);
  float h = hash(id + 293.0);
  float k = 1.0 + floor(h * 3.0);
  float level = 0.2 + 0.65 * (0.5 + 0.5 * sin(k * T + id * 0.47 + h * TAU));
  level *= 0.78 + 0.22 * sin(p.x * 2.0 + T) * sin(p.x * 2.0 + T);
  float bar = (1.0 - smoothstep(0.32, 0.46, x))
            * (1.0 - smoothstep(level, level + 0.035, p.y + 0.75));
  float segments = 0.65 + 0.35 * smoothstep(0.08, 0.16, fract((p.y + 1.0) * 18.0));
  vec3 bg = pal(0.03) * 0.32;
  vec3 c = pal(clamp((p.y + 0.75) / 1.5 + 0.18 * sin(T + h * TAU), 0.0, 1.0));
  return bg + c * bar * segments * (0.65 + 0.35 * u_warp);
}
`,
  // Range rings, blinking targets and a soft rotating radar beam.
  radar: `
vec3 scene(vec2 p, float T) {
  p += u_warp * 0.035 * vec2(sin(T), cos(T));
  float r = length(p);
  float a = atan(p.y, p.x);
  float ringCount = mix(4.0, 8.0, u_complexity);
  float rings = pow(0.5 + 0.5 * cos(r * ringCount * TAU), 22.0);
  float axes = exp(-p.x * p.x * 1800.0) + exp(-p.y * p.y * 1800.0);
  float beamAngle = T + TAU * hash(307.0);
  float beam = pow(max(0.0, 0.5 + 0.5 * cos(a - beamAngle)), 28.0) * smoothstep(0.04, 0.9, r);
  vec3 col = pal(0.04) * 0.28 + pal(0.5) * (rings * 0.18 + axes * 0.1);
  col += pal(0.82) * beam * 0.55;
  float n = mix(3.0, 8.0, u_complexity);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float ph = TAU * hash(fi + 311.0);
    float rr = 0.16 + 0.68 * hash(fi + 313.0);
    vec2 target = rr * vec2(cos(ph), sin(ph));
    float ping = 0.5 + 0.5 * sin(T * (1.0 + floor(hash(fi + 317.0) * 3.0)) + ph);
    float dotGlow = exp(-dot(p - target, p - target) * 850.0) * pow(ping, 5.0);
    col += pal(hash(fi + 319.0)) * dotGlow * 0.85;
  }
  return col;
}
`,
  // Dot lattice with a radial pulse travelling outward once per cycle.
  grid: `
vec3 scene(vec2 p, float T) {
  p += u_warp * 0.12 * vec2(sin(p.y * 3.0 + T), cos(p.x * 3.0 + T));
  vec3 col = u_colors[0] * 0.28;
  vec2 g = p * mix(6.0, 14.0, u_complexity);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id.x * 57.0 + id.y * 113.0);
  float pulse = 0.5 + 0.5 * sin(T - length(id) * 0.6 + h * 0.8);
  float r = mix(0.08, 0.34, pulse);
  float d = length(f);
  vec3 dotCol = pal(fract(h * 0.6 + pulse * 0.35));
  col = mix(col, dotCol, smoothstep(r, r - 0.06, d));
  col += dotCol * exp(-d * d * 9.0) * pulse * 0.22;
  return col;
}
`,
  // Transparent-looking interference stripes with a moving iridescent sheen.
  hologram: `
vec3 scene(vec2 p, float T) {
  vec2 q = p + 0.08 * u_warp * vec2(sin(p.y * 8.0 + T), cos(p.x * 7.0 - T));
  float bands = sin(q.x * (12.0 + 12.0 * u_complexity) + q.y * 5.0 + 2.0 * T);
  float foil = sin(q.x * 5.0 - q.y * 8.0 - T + 0.8 * bands);
  float scan = pow(0.5 + 0.5 * sin(q.y * 70.0 + T), 8.0);
  float edge = pow(0.5 + 0.5 * sin(q.x * 31.0 + q.y * 19.0 + T), 18.0);
  vec3 col = pal(0.5 + 0.32 * bands + 0.18 * foil);
  col = mix(col * 0.42, col, 0.55 + 0.45 * foil);
  return col + pal(0.85) * (scan * 0.12 + edge * 0.3);
}
`,
  // An elliptical hot disk of particles circling a dark core.
  accretion: `
vec3 scene(vec2 p, float T) {
  vec2 q = vec2(p.x, p.y * 2.25);
  float r = length(q) + 0.0001;
  float a = atan(q.y, q.x);
  float swirl = sin(a * 9.0 - 2.0 * T + r * 24.0);
  float disk = smoothstep(0.16, 0.25, r) * (1.0 - smoothstep(0.68, 0.94, r));
  float streaks = pow(0.5 + 0.5 * sin(a * (16.0 + 10.0 * u_complexity) - 2.0 * T + r * 34.0 + u_warp * swirl), 5.0);
  float inner = exp(-pow((r - 0.24) * 10.0, 2.0));
  vec3 col = pal(0.04) * 0.14;
  col += pal(0.42 + 0.32 * streaks) * disk * (0.18 + 0.6 * streaks);
  col += pal(0.9) * inner * 0.75;
  float voidMask = 1.0 - smoothstep(0.11, 0.17, r);
  return mix(col, pal(0.0) * 0.025, voidMask);
}
`,
  // Repeated plane folding creates branching self-similar boundaries.
  fractals: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * (1.5 + u_complexity);
  float angle = 0.2 * sin(T);
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  q = rot * q;
  float trace = 0.0;
  float weight = 1.0;
  for (int i = 0; i < 6; i++) {
    q = abs(q) / max(dot(q, q), 0.16) - vec2(0.88, 0.55);
    q += 0.07 * u_warp * vec2(sin(T), cos(T));
    trace += weight * exp(-15.0 * abs(length(q) - 0.75));
    weight *= 0.63;
  }
  float filaments = clamp(trace * 0.68, 0.0, 1.0);
  vec3 col = pal(0.14 + 0.72 * filaments);
  return mix(pal(0.02) * 0.22, col, 0.22 + 0.78 * filaments);
}
`,
  // Grainy, multi-scale value-noise tiles with animated corner values.
  noise: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * (5.0 + 7.0 * u_complexity);
  q += u_warp * 0.25 * vec2(sin(T), cos(T));
  float coarse = valueNoise(q, T);
  float fine = valueNoise(q * 2.0, 2.0 * T);
  float detail = valueNoise(q * 4.0, 3.0 * T);
  float v = clamp(0.58 * coarse + 0.29 * fine + 0.13 * detail, 0.0, 1.0);
  float contour = smoothstep(0.44, 0.48, v) - smoothstep(0.53, 0.57, v);
  return pal(v) + pal(0.9) * contour * 0.08;
}
`,
  // Broad stacked water-like waves with distinct bright crests.
  waves: `
vec3 scene(vec2 p, float T) {
  vec3 col = pal(clamp(0.22 + 0.2 * p.y, 0.0, 1.0)) * 0.55;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float y = -0.75 + fi * 0.25;
    float crest = y + (0.07 + 0.1 * u_warp) * sin(p.x * (2.6 + fi * 0.27) + T + fi * 0.8)
                    + 0.035 * sin(p.x * 6.0 - 2.0 * T + fi);
    float below = 1.0 - smoothstep(crest - 0.035, crest + 0.035, p.y);
    float gleam = exp(-pow((p.y - crest) * 24.0, 2.0));
    col = mix(col, pal(0.2 + fi * 0.11), below * (0.45 + 0.25 * u_complexity));
    col += pal(0.8) * gleam * (0.08 + 0.04 * sin(T + fi));
  }
  return col;
}
`,
  // Gravitational lens with a dark event horizon and curved light arcs.
  singularity: `
vec3 scene(vec2 p, float T) {
  float r = length(p) + 0.0001;
  float a = atan(p.y, p.x);
  float bend = a + (0.25 + 0.5 * u_warp) / (r + 0.18);
  float lens = exp(-pow((r - 0.35) * 9.0, 2.0));
  float arcs = pow(0.5 + 0.5 * sin(12.0 * bend + T + r * 6.0), 14.0) * lens;
  float photon = exp(-pow((r - 0.29) * 35.0, 2.0));
  float outer = exp(-pow((r - 0.63) * 8.0, 2.0)) * (0.5 + 0.5 * sin(7.0 * bend - T));
  vec3 col = pal(0.02) * 0.1 + pal(0.66) * (arcs * 0.8 + outer * 0.25);
  col += pal(0.98) * photon * 0.95;
  float horizon = 1.0 - smoothstep(0.18, 0.23, r);
  return mix(col, pal(0.0) * 0.01, horizon);
}
`,
  // Smooth value noise displaced by two independently animated noise fields.
  warpedNoise: `
vec3 scene(vec2 p, float T) {
  vec2 q = p * (2.1 + u_complexity * 1.2);
  vec2 offset = vec2(valueNoise(q + vec2(7.3, 1.2), T),
                     valueNoise(q + vec2(-2.1, 9.4), 2.0 * T)) - 0.5;
  vec2 warped = q + offset * (1.0 + 3.0 * u_warp);
  float a = valueNoise(warped * 1.6, T);
  float b = valueNoise(warped * 3.2 + 4.7, 2.0 * T);
  float v = clamp(a * 0.76 + b * 0.24, 0.0, 1.0);
  return pal(smoothstep(0.25, 0.75, v));
}
`,
};

export function fragmentSource(family: Family): string {
  return PRELUDE + SCENES[family] + MAIN;
}

function namespaceScene(source: string, suffix: "A" | "B"): string {
  return source
    .replace(/\bscene\b/g, `scene${suffix}`)
    .replace(/\bglitchField\b/g, `glitchField${suffix}`);
}

const BLEND_GLSL: Record<BlendMode, string> = {
  mix: "mix(primary, secondary, u_blend_amount)",
  screen:
    "mix(primary, 1.0 - (1.0 - primary) * (1.0 - secondary), u_blend_amount)",
  multiply: "mix(primary, primary * secondary * 1.35, u_blend_amount)",
  difference: "mix(primary, abs(primary - secondary), u_blend_amount)",
};

/** Build one fragment program containing two independently evaluated scenes. */
export function layeredFragmentSource(
  primary: Family,
  secondary: Family,
  blendMode: BlendMode,
): string {
  const main = `
vec3 renderLayers(vec2 uv, float T) {
  vec3 primary = sceneA(uv, T);
  vec2 uv2 = mat2(0.9397, -0.3420, 0.3420, 0.9397) * uv * 1.08;
  uv2 += 0.045 * vec2(sin(T), cos(T));
  vec3 secondary = sceneB(uv2, -T);
  return ${BLEND_GLSL[blendMode]};
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * u_res) / min(u_res.x, u_res.y);
  uv /= u_scale;
  float T = TAU * u_phase * u_speed;
  vec3 col = renderLayers(uv, T);
  if (abs(u_sharpness) > 0.001) {
    vec2 px = vec2(1.0 / min(u_res.x, u_res.y) / u_scale, 0.0);
    vec3 soft = (renderLayers(uv + px, T) + renderLayers(uv - px, T)
      + renderLayers(uv + px.yx, T) + renderLayers(uv - px.yx, T) + col * 4.0) / 8.0;
    col = u_sharpness < 0.0
      ? mix(col, soft, -u_sharpness)
      : col + (col - soft) * u_sharpness * 3.0;
  }
  float vd = length((frag - 0.5 * u_res) / u_res);
  col *= 1.0 - u_vignette * smoothstep(0.35, 0.9, vd);
  float g = fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * u_grain;
  fragColor = vec4(col, 1.0);
}
`;
  return (
    PRELUDE +
    namespaceScene(SCENES[primary], "A") +
    namespaceScene(SCENES[secondary], "B") +
    main
  );
}
