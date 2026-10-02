import type { BackdropFamily } from "./schema";

// Scene-local helpers are namespaced by the layered shader builder. Surfaces
// are analytic; animation uses integer harmonics and needs no simulation state.
const STUDIO = `
mat2 turn(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
float cover(float d) {
  float aa = max(fwidth(d), 0.00065);
  return 1.0 - smoothstep(-aa, aa, d);
}
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 v = b - a;
  return length(p - a - v * clamp(dot(p - a, v) / max(dot(v, v), 0.000001), 0.0, 1.0));
}
float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 studio(vec3 n, float tint, float gloss) {
  n = normalize(n);
  vec3 reflection = reflect(vec3(0.0, 0.0, -1.0), n);
  float field = 0.48 + 0.22 * sin(reflection.y * 5.0) + 0.18 * cos(reflection.x * 4.0);
  vec3 base = mix(pal(field), pal(tint), 0.32);
  float light = max(0.0, dot(n, normalize(vec3(-0.45, 0.65, 0.85))));
  float box = pow(max(0.0, 1.0 - abs(reflection.y - 0.35) * 3.6), gloss);
  float strip = pow(max(0.0, 1.0 - abs(reflection.x + reflection.y * 0.3 + 0.55) * 8.0), 6.0);
  return base * (0.22 + light * 0.75) + pal(0.98) * (box * 0.75 + strip * 0.32)
    + pal(0.7) * pow(1.0 - max(0.0, n.z), 3.0) * 0.35;
}
`;

const COMPOSITIONS = {
  nacreFlow: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn(hash(201.0) * TAU) * p;
  float phase = p.x * (4.0 + u_complexity * 3.0) + u_warp * 1.2 * sin(p.y * 3.0 + T);
  float height = sin(phase) + 0.35 * cos(p.y * 4.0 - T);
  vec3 n = normalize(vec3(cos(phase) * 0.8, sin(p.y * 4.0 - T) * 0.35, 1.0));
  float nacre = 0.5 + 0.3 * sin(n.z * 8.0 + p.y * 2.0 + sin(T));
  return mix(studio(n, nacre, 5.0), pal(0.35 + height * 0.22), 0.42);
}
`,
  velvetFlow: `${STUDIO}
float velvetHeight(vec2 p, float T) {
  vec2 q = turn(hash(211.0) * TAU) * p;
  q += u_warp * 0.22 * vec2(sin(q.y * 3.0 + T), cos(q.x * 3.0 - T));
  return 0.55 * sin(q.x * 3.5 + q.y * 1.5 + sin(T))
    + 0.28 * cos(q.y * (4.0 + u_complexity * 4.0) + cos(T))
    + 0.17 * sin(length(q + vec2(0.3, -0.2)) * 7.0 - T);
}
vec3 scene(vec2 p, float T) {
  float h = velvetHeight(p, T);
  vec2 slope = vec2(velvetHeight(p + vec2(0.004, 0.0), T), velvetHeight(p + vec2(0.0, 0.004), T)) - h;
  vec3 n = normalize(vec3(-slope * 70.0, 1.0));
  float grazing = pow(max(0.0, dot(n, normalize(vec3(-0.3, 0.65, 0.8)))), 7.0);
  vec3 fabric = pal(0.25 + (h * 0.5 + 0.5) * 0.6) * (0.45 + 0.55 * n.z);
  fabric += pal(0.92) * grazing * 0.22;
  return fabric;
}
`,
  glassVeil: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(221.0) - 0.5) * 0.8) * p;
  vec3 col = pal(0.0) * 0.65;
  float count = 3.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = hash(fi + 222.0) * TAU;
    float y = (fi - count * 0.5) * 0.24 + (0.15 + u_warp * 0.2) * sin(p.x * 2.0 + sin(T + phase));
    float across = (p.y - y) / (0.15 + 0.03 * cos(T + phase));
    float z = sqrt(max(0.0, 1.0 - across * across));
    float edge = pow(clamp(abs(across), 0.0, 1.0), 7.0);
    vec3 tint = pal(0.3 + fi / count * 0.55);
    vec3 glass = mix(col, tint, 0.12 + edge * 0.22);
    glass += pal(0.95) * edge * 0.12 + tint * pow(z, 8.0) * 0.1;
    col = mix(col, glass, cover((abs(across) - 1.0) * 0.15));
  }
  return col;
}
`,
  prismField: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(231.0) - 0.5) * 0.8) * p;
  p += 0.035 * u_warp * vec2(sin(T), cos(T));
  float f = 3.0 + u_complexity * 4.0;
  vec2 q = p * f;
  q.x += q.y * 0.45;
  vec2 cell = floor(q), uv = fract(q);
  float triangle = step(uv.x, uv.y);
  float id = hash(cell.x * 31.0 + cell.y * 71.0 + triangle * 37.0 + 232.0);
  float plane = mix(uv.x, uv.y, triangle);
  vec3 n = normalize(vec3(0.25 + id * 0.3, (triangle - 0.5) * 0.5, 1.0));
  float light = 0.55 + 0.15 * sin(T + id * TAU);
  vec3 glass = pal(0.18 + id * 0.5) * (light + plane * 0.12);
  float d = min(min(uv.x, uv.y), abs(uv.x - uv.y)) / f;
  glass += studio(n, 0.45, 12.0) * 0.12;
  glass += pal(0.9) * exp(-d * 120.0) * 0.05;
  return glass;
}
`,
  satinDunes: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn(0.35 + (hash(241.0) - 0.5) * 0.7) * p;
  float f = 5.0 + u_complexity * 6.0;
  float s = p.y * f + 1.3 * sin(p.x * 3.0 + T) + u_warp * cos(p.x * 7.0 - T);
  float dx = 3.9 * cos(p.x * 3.0 + T) - 7.0 * u_warp * sin(p.x * 7.0 - T);
  vec3 n = normalize(vec3(-0.18 * cos(s) * dx, -0.18 * cos(s) * f, 1.0));
  float h = 0.5 + 0.5 * sin(s);
  float weave = 0.94 + 0.06 * sin(p.x * 550.0) * sin(p.y * 600.0);
  vec3 col = pal(0.22 + h * 0.63) * (0.35 + 0.65 * max(0.0, n.z * 0.7 + n.y * 0.5));
  col += pal(0.94) * pow(max(0.0, dot(n, normalize(vec3(-0.25, 0.65, 0.8)))), 12.0) * 0.28;
  return col * weave;
}
`,
  metallicWaves: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(251.0) - 0.5) * 1.1) * p;
  float f = 8.0 + 12.0 * u_complexity;
  float s = f * p.x + 2.0 * u_warp * sin(p.y * 5.0 + T) + sin(T);
  float across = sin(s);
  vec3 n = normalize(vec3(cos(s) * 1.8, 0.35 * sin(p.y * 5.0 + T), 0.6 + 0.4 * across));
  vec3 metal = studio(n, 0.35 + 0.4 * (0.5 + 0.5 * sin(p.y * 2.0 - T)), 12.0);
  float groove = pow(0.5 + 0.5 * sin(s + 1.5), 18.0);
  return metal * (0.55 + 0.45 * (1.0 - groove));
}
`,
  silkCurrent: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(261.0) - 0.5) * 0.65) * p;
  float bend = p.y + (0.16 + 0.2 * u_warp) * sin(p.x * 2.8 + sin(T));
  float s = bend * (6.0 + u_complexity * 8.0) + 0.6 * sin(p.x * 4.0 - T);
  float fold = 0.5 + 0.5 * cos(s);
  vec3 n = normalize(vec3(0.35 * cos(p.x * 2.8 + sin(T)), sin(s) * 0.9, 0.8));
  vec3 silk = pal(0.2 + fold * 0.58) * (0.35 + 0.65 * n.z);
  silk += pal(0.95) * pow(max(0.0, dot(n, normalize(vec3(-0.2, 0.7, 0.9)))), 14.0) * 0.24;
  return silk;
}
`,
  aquaVeil: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(271.0) - 0.5) * 0.5) * p;
  vec3 col = pal(0.0) * 0.7;
  float count = 5.0 + floor(u_complexity * 4.0);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = hash(fi + 272.0) * TAU;
    float center = (fi - (count - 1.0) * 0.5) * 0.16;
    center += (0.06 + u_warp * 0.12) * sin(p.y * 3.0 + T + phase);
    float width = 0.08 + 0.03 * cos(p.y * 2.0 - T + phase);
    float across = (p.x - center) / width;
    float mask = cover((abs(across) - 1.0) * width);
    float z = sqrt(max(0.0, 1.0 - across * across));
    vec3 tint = pal(0.25 + fi / count * 0.6);
    vec3 veil = mix(col, tint, 0.16 + 0.2 * z);
    veil += pal(0.93) * pow(1.0 - z, 7.0) * 0.22;
    veil += tint * pow(z, 9.0) * 0.14;
    col = mix(col, veil, mask);
  }
  return col;
}
`,
  mistLayers: `${STUDIO}
vec3 scene(vec2 p, float T) {
  vec3 col = pal(0.0) * 0.75;
  float weight = 0.0;
  float count = 4.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = hash(fi * 5.0 + 281.0) * TAU;
    vec2 center = (vec2(hash(fi * 5.0 + 282.0), hash(fi * 5.0 + 283.0)) - 0.5) * vec2(1.8, 1.2);
    center += u_warp * 0.16 * vec2(sin(T + phase), cos(T + phase));
    vec2 q = p - center;
    float cloud = exp(-dot(q, q) * (2.0 + hash(fi + 284.0) * 3.0));
    col += pal(0.2 + fi / count * 0.55) * cloud * 0.36;
    weight += cloud * 0.22;
  }
  return col / (1.0 + weight);
}
`,
  magneticFlow: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn(hash(291.0) * TAU) * p;
  vec2 q = p + u_warp * 0.15 * vec2(sin(p.y * 5.0 + T), cos(p.x * 4.0 - T));
  float f = 7.0 + u_complexity * 8.0;
  float s = q.x * f + 0.6 * sin(q.y * 6.0 + T);
  vec3 n = normalize(vec3(cos(s) * 1.4, 0.3 * sin(q.y * 6.0 + T), 0.9));
  float height = 0.5 + 0.5 * sin(s);
  vec3 material = studio(n, 0.28 + height * 0.42, 10.0);
  return material * (0.65 + height * 0.35);
}
`,
  foldedCanopy: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn(0.3 + (hash(301.0) - 0.5) * 0.4) * p;
  float f = 3.0 + u_complexity * 5.0;
  float x = p.x + u_warp * 0.06 * sin(p.y * 3.0 + T);
  float local = fract(x * f + 0.1 * sin(T));
  float face = abs(local * 2.0 - 1.0);
  vec3 n = normalize(vec3(local < 0.5 ? -0.6 : 0.6, 0.12, 0.85));
  float tint = 0.25 + 0.32 * (0.5 + 0.5 * sin(p.y * 2.0 + hash(302.0) * TAU));
  vec3 plane = pal(tint) * (local < 0.5 ? 0.56 : 0.9);
  plane += studio(n, tint, 8.0) * 0.2;
  plane += pal(0.87) * exp(-abs(local - 0.5) * 80.0) * 0.08;
  return plane * (0.85 + face * 0.15);
}
`,
  contourRelief: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p += (vec2(hash(311.0), hash(312.0)) - 0.5) * 0.8;
  float a = atan(p.y, p.x), r = length(p);
  float field = r + (0.025 + u_warp * 0.055) * sin(3.0 * a + T);
  float f = 9.0 + u_complexity * 12.0;
  float local = fract(field * f);
  float bevel = smoothstep(0.0, 0.25, local) * (1.0 - smoothstep(0.65, 1.0, local));
  float tone = 0.25 + 0.4 * (0.5 + 0.5 * sin(field * 4.0 - sin(T)));
  vec3 paper = pal(tone) * (0.45 + bevel * 0.45);
  paper += pal(0.88) * exp(-local * 60.0) * 0.06;
  return paper;
}
`,
  floatingVeils: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(321.0) - 0.5) * 0.8) * p;
  vec3 col = pal(0.0) * 0.65;
  float count = 4.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = hash(fi + 322.0) * TAU;
    float y = (fi - count * 0.5) * 0.16 + (0.1 + u_warp * 0.16) * sin(p.x * 2.5 + sin(T + phase));
    float d = p.y - y;
    float width = 0.13 + 0.06 * sin(p.x * 1.5 + phase);
    float across = d / width;
    float z = sqrt(max(0.0, 1.0 - across * across));
    vec3 tint = pal(0.22 + fi / count * 0.65);
    vec3 material = mix(col, tint * (0.32 + 0.68 * z), 0.55);
    material += pal(0.95) * exp(-abs(d + width * 0.8) * 50.0) * 0.1;
    col = mix(col, material, cover(abs(d) - width));
  }
  return col;
}
`,
  prismCurtain: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(331.0) - 0.5) * 0.5) * p;
  float f = 4.0 + u_complexity * 5.0;
  float bend = p.x + u_warp * 0.14 * sin(p.y * 2.0 + sin(T));
  float phase = bend * f + hash(332.0) * TAU;
  float z = 0.5 + 0.5 * cos(phase);
  vec3 tint = pal(0.25 + z * 0.5);
  vec3 n = normalize(vec3(sin(phase) * 0.6, 0.1 * cos(T), 0.85));
  vec3 glass = tint * (0.35 + z * 0.4) + studio(n, 0.55, 20.0) * 0.12;
  glass += pal(0.92) * pow(z, 16.0) * 0.07;
  return glass;
}
`,
  lightPainting: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(341.0) - 0.5) * 0.6) * p;
  vec3 col = pal(0.0) * 0.7;
  float count = 6.0 + floor(u_complexity * 6.0);
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = hash(fi + 342.0) * TAU;
    float y = (fi - count * 0.5) * 0.07 + (0.12 + u_warp * 0.1) * sin(p.x * 2.3 + sin(T + phase));
    float d = p.y - y;
    vec3 tint = pal(0.25 + fi / count * 0.6);
    col += tint * exp(-d * d / 0.00025) * 0.22;
    col += tint * exp(-d * d / 0.009) * 0.035;
  }
  return col;
}
`,
  spectralRibbons: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(351.0) - 0.5) * 0.8) * p;
  vec3 col = pal(0.0) * 0.5;
  float count = 5.0 + floor(u_complexity * 5.0);
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float s = p.x * 4.0 + T + fi * 0.35;
    float y = (fi - count * 0.5) * 0.035 + (0.12 + u_warp * 0.16) * sin(s);
    float d = p.y - y;
    float twist = 0.006 + 0.025 * abs(cos(s));
    float mask = cover(abs(d) - twist);
    vec3 tint = pal(0.25 + fi / count * 0.72);
    col = mix(col, tint * (0.2 + 0.65 * exp(-d * d / max(twist * twist, 0.00001))), mask * 0.85);
    col += tint * exp(-abs(abs(d) - twist) * 210.0) * 0.35;
    col += tint * exp(-d * d * 700.0) * 0.04;
  }
  return col;
}
`,
  causticPool: `${STUDIO}
vec3 scene(vec2 p, float T) {
  vec2 q = p * (5.0 + 3.0 * u_complexity);
  float phase = hash(361.0) * TAU;
  float nearest = 10.0, next = 10.0;
  vec2 cell = floor(q);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 id = cell + vec2(float(x), float(y));
      float h = hash(id.x * 71.0 + id.y * 137.0 + 362.0);
      vec2 point = id + 0.5 + (0.16 + 0.22 * u_warp) * vec2(sin(T + h * TAU), cos(T + h * TAU + phase));
      float d = length(q - point);
      if (d < nearest) { next = nearest; nearest = d; }
      else next = min(next, d);
    }
  }
  float edge = next - nearest;
  float light = exp(-edge * 24.0);
  float water = 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 5.0 + sin(T));
  vec3 col = pal(0.12 + 0.3 * water) * (0.5 + nearest * 0.35);
  col += pal(0.85) * light * 0.85 + pal(0.65) * exp(-edge * 6.0) * 0.18;
  return col;
}
`,
  eclipseHalo: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p -= (vec2(hash(371.0), hash(372.0)) - 0.5) * 0.1;
  float r = length(p), a = atan(p.y, p.x);
  float radius = 0.22 + u_warp * 0.012 * sin(T);
  float d = r - radius;
  float rays = pow(0.5 + 0.5 * cos(a * (18.0 + floor(u_complexity * 30.0)) + T), 8.0);
  float corona = exp(-max(d, 0.0) * (14.0 + 10.0 * rays)) * smoothstep(-0.002, 0.012, d);
  vec3 col = pal(0.0) * 0.5 + pal(0.6 + 0.3 * sin(a + T)) * corona * 0.65;
  col += pal(0.98) * exp(-d * d * 18000.0) * 0.9;
  float hotspot = pow(0.5 + 0.5 * cos(a - T - hash(373.0) * TAU), 30.0);
  col += pal(0.98) * hotspot * exp(-d * d * 1200.0) * 0.75;
  return mix(col, pal(0.0) * 0.04, cover(d + 0.002));
}
`,
  starVortex: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn(hash(381.0) * TAU) * p;
  p.y /= 0.64;
  float r = length(p) + 0.0001, a = atan(p.y, p.x);
  float arms = 3.0 + floor(hash(382.0) * 3.0);
  float winding = a * arms + r * (13.0 + u_warp * 14.0) - T;
  float arm = pow(0.5 + 0.5 * cos(winding), 10.0);
  float cloud = exp(-r * 4.5) * smoothstep(0.025, 0.09, r);
  float filaments = pow(0.5 + 0.5 * sin(winding * 3.0 + r * 85.0 + sin(T)), 8.0);
  vec3 col = pal(0.0) * 0.35 + pal(0.3 + r) * arm * cloud * (1.6 + filaments * 0.4);
  col += pal(0.95) * exp(-r * r * 900.0) * 0.8;
  vec2 grid = p * (50.0 + 35.0 * u_complexity);
  vec2 id = floor(grid), local = fract(grid) - 0.5;
  float h = hash(id.x * 71.0 + id.y * 113.0 + 383.0);
  float stars = exp(-dot(local, local) * 160.0) * step(0.55, h);
  col += pal(0.98) * stars * (0.08 + arm) * exp(-r * 2.7) * (0.65 + 0.35 * sin(T + h * TAU)) * 1.7;
  return col;
}
`,
  dustDrift: `${STUDIO}
vec3 scene(vec2 p, float T) {
  vec3 col = pal(0.0) * 0.7;
  float count = 12.0 + floor(u_complexity * 14.0);
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = hash(fi * 5.0 + 391.0) * TAU;
    vec2 center = (vec2(hash(fi * 5.0 + 392.0), hash(fi * 5.0 + 393.0)) - 0.5) * vec2(2.4, 1.5);
    center += (0.03 + u_warp * 0.07) * vec2(sin(T + phase), cos(T + phase));
    float size = 0.004 + hash(fi * 5.0 + 394.0) * 0.022;
    float d = length(p - center);
    vec3 tint = pal(0.45 + hash(fi * 5.0 + 395.0) * 0.4);
    col += tint * exp(-d * d / (size * size)) * 0.28;
    col += tint * exp(-d * d / (size * size * 8.0)) * 0.06;
  }
  return col;
}
`,
  cutPaper: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(401.0) - 0.5) * 0.5) * p;
  vec3 col = pal(0.0);
  float count = 5.0 + floor(u_complexity * 5.0);
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = hash(fi + 402.0) * TAU;
    float y = 0.34 - fi * 0.075 + 0.13 * sin(p.x * 3.5 + phase + u_warp * sin(T));
    y += 0.035 * sin(p.x * 9.0 + fi - T);
    float d = p.y - y;
    vec3 paper = pal(0.18 + fi / count * 0.76);
    float shadow = exp(-max(d, 0.0) * 100.0) * (1.0 - cover(d));
    col *= 1.0 - shadow * 0.36;
    paper += pal(0.97) * exp(-abs(d) * 170.0) * 0.08;
    col = mix(col, paper, cover(d));
  }
  return col;
}
`,
  opArtWeave: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn(0.4 + (hash(411.0) - 0.5) * 0.8) * p;
  float f = 12.0 + u_complexity * 20.0;
  vec2 q = p + u_warp * 0.1 * vec2(sin(p.y * 5.0 + T), cos(p.x * 5.0 - T));
  vec2 cell = floor(q * f), local = fract(q * f) - 0.5;
  float across = mod(cell.x + cell.y, 2.0) < 1.0 ? local.x : local.y;
  float thickness = 0.23 + 0.04 * sin(T + hash(412.0) * TAU);
  float mask = cover((abs(across) - thickness) / f);
  float z = sqrt(max(0.0, 1.0 - pow(across / thickness, 2.0)));
  vec3 strand = pal(0.28 + 0.5 * (0.5 + 0.5 * sin((cell.x - cell.y) * 0.25 + T)));
  strand *= 0.38 + z * 0.62;
  strand += pal(0.98) * pow(z, 16.0) * 0.14;
  return mix(pal(0.0) * 0.75, strand, mask);
}
`,
  neonLattice: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn(0.55 + (hash(421.0) - 0.5) * 0.6) * p;
  float f = 7.0 + u_complexity * 9.0;
  vec2 q = p;
  q.y += u_warp * 0.08 * sin(p.x * 7.0 + T);
  vec2 cell = floor(q * f), local = fract(q * f) - 0.5;
  float h = hash(cell.x * 31.0 + cell.y * 71.0 + 422.0);
  float line = min(abs(local.x), abs(local.y)) / f;
  float light = 0.2 + 0.8 * pow(0.5 + 0.5 * sin(T + cell.x * 0.45 + cell.y * 0.5), 3.0);
  vec3 tint = pal(0.3 + h * 0.65);
  float sphere = length(local) / f;
  vec3 col = pal(0.0) * 0.45 + tint * exp(-line * 300.0) * light * 0.65;
  col += tint * exp(-line * 70.0) * light * 0.09;
  col += pal(0.95) * exp(-sphere * sphere * 18000.0) * light * 0.6;
  return col * (0.4 + 0.6 * exp(-dot(p, p) * 1.6));
}
`,
  horizonFold: `${STUDIO}
vec3 scene(vec2 p, float T) {
  p = turn((hash(431.0) - 0.5) * 0.35) * p;
  float count = 4.0 + floor(u_complexity * 4.0);
  vec3 col = pal(0.0) * 0.7;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float y = -0.4 + fi * 0.1 + 0.025 * sin(T + fi * 0.4);
    float curve = y + u_warp * 0.12 * sin(p.x * 2.0 + sin(T + hash(432.0) * TAU));
    float d = p.y - curve;
    float ridge = exp(-abs(d) * 80.0);
    vec3 tint = pal(0.2 + fi / count * 0.5);
    col = mix(col, tint * (0.42 + ridge * 0.5), cover(d));
  }
  return col;
}
`,
} satisfies Record<BackdropFamily, string>;

// Reserve a quiet central field for projected lyrics. Keep highlights toward
// the edges and bound their intensity without altering the palette's hue.
export const EXTENDED_SCENES = Object.fromEntries(
  Object.entries(COMPOSITIONS).map(([family, source]) => [family,
    source.replace("vec3 scene(", "vec3 composition(") + `
vec3 scene(vec2 p, float T) {
  vec3 col = max(composition(p, T), vec3(0.0));
  float highlight = max(max(col.r, col.g), col.b);
  col /= 1.0 + highlight;
  vec2 textField = (gl_FragCoord.xy / u_res - 0.5) * vec2(1.4, 1.8);
  float quiet = 1.0 - smoothstep(0.52, 0.92, length(textField));
  return col * mix(0.68, 0.32, quiet);
}
`]),
) as { [Family in keyof typeof COMPOSITIONS]: string };
