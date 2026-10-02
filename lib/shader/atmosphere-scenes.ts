import type { AtmosphereFamily } from "./schema";

// Static seeded noise drifts along closed paths. No simulation or texture
// history is required, so export and live playback share the same frames.
const ATMOSPHERE = `
float atmosphereNoise(vec2 p) {
  return valueNoise(p, 0.0) * 0.57 + valueNoise(p * 2.03 + 17.0, 0.0) * 0.28
    + valueNoise(p * 4.07 - 9.0, 0.0) * 0.15;
}
`;

export const ATMOSPHERE_SCENES = {
  auroraCanopy: `
vec3 scene(vec2 p, float T) {
  float offset = hash(501.0) * TAU;
  vec3 col = pal(0.0) * 0.7;
  float count = 3.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i), phase = offset + fi * 1.7;
    if (fi >= count) break;
    float curve = 0.22 + fi * 0.09 + 0.12 * sin(p.x * 2.4 + sin(T + phase));
    curve += u_warp * 0.09 * sin(p.x * 6.0 - T + phase);
    float d = p.y - curve;
    float curtain = exp(-d * d * 65.0) * (0.65 + 0.35 * sin(p.x * 12.0 + phase + cos(T)));
    col += pal(0.28 + fi / count * 0.62) * curtain * 0.55;
  }
  return col;
}
`,
  tidalGlass: `
vec3 scene(vec2 p, float T) {
  float phase = hash(511.0) * TAU;
  vec2 q = p + u_warp * 0.09 * vec2(sin(T + phase), cos(T + phase));
  float f = 7.0 + u_complexity * 10.0;
  float swell = sin(q.x * 3.0 + q.y * 2.0 + sin(T + phase));
  float ripple = sin(q.y * f + swell * 1.8 - T);
  float crossing = cos(q.x * f * 0.7 - q.y * 3.0 + T + phase);
  float height = ripple * 0.7 + crossing * 0.3;
  vec3 n = normalize(vec3(crossing * 0.3, cos(q.y * f + swell * 1.8 - T) * 0.7, 1.0));
  float reflection = pow(max(0.0, dot(n, normalize(vec3(-0.3, 0.6, 1.0)))), 16.0);
  return pal(0.22 + height * 0.18) * (0.6 + n.z * 0.4) + pal(0.9) * reflection * 0.6;
}
`,
  twilightHaze: `${ATMOSPHERE}
vec3 scene(vec2 p, float T) {
  float phase = hash(521.0) * TAU;
  float horizon = -0.17 + 0.025 * sin(T + phase);
  float sky = smoothstep(horizon - 0.45, horizon + 0.5, p.y);
  vec3 col = pal(0.12 + sky * 0.65) * (0.65 + sky * 0.25);
  float glow = exp(-pow((p.y - horizon) * 4.0, 2.0));
  col += pal(0.94) * glow * 0.22;
  vec2 drift = u_warp * 0.1 * vec2(sin(T + phase), cos(T + phase));
  float mist = atmosphereNoise(p * vec2(1.8, 7.0 + u_complexity * 5.0) + drift);
  return col * (0.72 + mist * 0.28);
}
`,
  cloudSea: `
vec3 scene(vec2 p, float T) {
  float phase = hash(531.0) * TAU;
  vec3 sky = pal(0.15 + smoothstep(-0.3, 0.6, p.y) * 0.15);
  vec3 fog = vec3(0.0);
  float density = 0.0;
  float count = 5.0 + floor(u_complexity * 4.0);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float h = hash(fi + 532.0);
    vec2 center = vec2((fi - (count - 1.0) * 0.5) * 0.3, -0.22 + h * 0.18);
    center += (0.025 + u_warp * 0.04) * vec2(sin(T + phase + fi), cos(T + phase + fi));
    vec2 q = (p - center) / vec2(0.3 + h * 0.17, 0.13 + h * 0.1);
    q.y += 0.12 * sin(q.x * 3.0 + phase + fi);
    float cloud = exp(-dot(q, q));
    float light = 0.6 + 0.28 * smoothstep(-0.4, 0.8, q.y);
    fog += pal(0.65 + h * 0.28) * cloud * light;
    density += cloud;
  }
  return mix(sky, fog / max(density, 0.0001), 1.0 - exp(-density * 2.0));
}
`,
  emberVeil: `
vec3 scene(vec2 p, float T) {
  float phase = hash(541.0) * TAU;
  vec3 col = pal(0.0) * 0.8;
  float count = 3.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float bend = sin(p.y * 2.5 + sin(T + phase + fi));
    float x = (fi - (count - 1.0) * 0.5) * 0.3 + (0.1 + u_warp * 0.16) * bend;
    float veil = exp(-pow((p.x - x) * (9.0 + fi), 2.0));
    float light = 0.65 + 0.35 * sin(p.y * 4.0 - T + phase + fi * 0.7);
    col += pal(0.35 + fi / count * 0.58) * veil * light * 0.45;
  }
  return col;
}
`,
  forestLight: `${ATMOSPHERE}
vec3 scene(vec2 p, float T) {
  float phase = hash(551.0) * TAU;
  vec2 q = vec2(p.x * 0.85 + p.y * 0.55, p.y);
  q += (0.04 + u_warp * 0.1) * vec2(sin(T + phase), cos(T + phase));
  float leaves = atmosphereNoise(q * (4.0 + u_complexity * 4.0));
  float beam = pow(0.5 + 0.5 * sin(q.x * 14.0 + phase), 6.0);
  float canopy = smoothstep(0.1, 0.6, p.y);
  vec3 shade = pal(0.12 + leaves * 0.3) * 0.75;
  vec3 light = pal(0.9) * (beam * 0.38 + smoothstep(0.6, 0.82, leaves) * 0.24);
  return shade + light * (0.35 + canopy * 0.65);
}
`,
  rainWindow: `${ATMOSPHERE}
vec3 scene(vec2 p, float T) {
  float phase = hash(561.0) * TAU;
  float f = 7.0 + u_complexity * 9.0;
  vec2 q = p * vec2(f, f * 0.7);
  vec2 id = floor(q), local = fract(q) - 0.5;
  float h = hash(id.x * 71.0 + id.y * 137.0 + 562.0);
  vec2 center = vec2((h - 0.5) * 0.55, (hash(id.x * 53.0 + id.y * 97.0 + 563.0) - 0.5) * 0.36);
  center.y += 0.08 * sin(T + h * TAU);
  vec2 delta = (local - center) * vec2(1.0, 0.75);
  float radius = 0.08 + h * 0.07;
  float lens = exp(-dot(delta, delta) / (radius * radius));
  vec2 refract = p + delta * lens * (0.05 + u_warp * 0.08);
  vec2 drift = 0.08 * vec2(sin(T + phase), cos(T + phase));
  float blurred = atmosphereNoise(refract * 2.5 + drift);
  vec3 col = pal(0.17 + blurred * 0.58) * 0.75;
  float rim = exp(-pow((length(delta) - radius) * 55.0, 2.0));
  col += pal(0.95) * rim * smoothstep(-0.03, 0.1, delta.y) * 0.22;
  col -= pal(0.35) * lens * 0.08;
  return col;
}
`,
  opalWash: `${ATMOSPHERE}
vec3 scene(vec2 p, float T) {
  float phase = hash(571.0) * TAU;
  vec2 q = p * (2.0 + u_complexity * 2.0);
  q += u_warp * 0.3 * vec2(sin(q.y * 2.0 + T + phase), cos(q.x * 2.0 - T + phase));
  float n = atmosphereNoise(q);
  float sheen = 0.5 + 0.5 * sin(n * 12.0 + q.y * 2.0 + sin(T + phase));
  return mix(pal(0.15 + n * 0.7), pal(0.35 + sheen * 0.6), 0.38) * (0.65 + sheen * 0.25);
}
`,
  lightColumns: `
vec3 scene(vec2 p, float T) {
  float phase = hash(581.0) * TAU;
  vec3 col = pal(0.0) * 0.65;
  float count = 3.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float x = (fi - (count - 1.0) * 0.5) * 0.38;
    x += (0.02 + u_warp * 0.06) * sin(T + phase + fi);
    float width = 0.06 + (p.y + 0.6) * (p.y + 0.6) * 0.065;
    float beam = exp(-pow((p.x - x) / width, 2.0));
    float falloff = 0.6 + 0.25 * sin(T + phase + fi * 0.65);
    col += pal(0.28 + fi / count * 0.62) * beam * falloff;
  }
  return col;
}
`,
  lunarDunes: `
vec3 scene(vec2 p, float T) {
  float phase = hash(591.0) * TAU;
  vec3 col = pal(0.12 + smoothstep(-0.2, 0.7, p.y) * 0.15) * 0.7;
  float count = 4.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float y = 0.08 - fi * 0.085 + 0.12 * sin(p.x * 2.0 + phase + fi * 0.65);
    y += (0.01 + u_warp * 0.035) * sin(p.x * 5.0 + sin(T + fi));
    float d = p.y - y;
    float mask = 1.0 - smoothstep(-0.006, 0.006, d);
    float ridge = exp(-abs(d) * 55.0);
    vec3 dune = pal(0.3 + fi / count * 0.45) * (0.45 + ridge * 0.22);
    col = mix(col, dune, mask);
  }
  return col;
}
`,
  inkWash: `${ATMOSPHERE}
vec3 scene(vec2 p, float T) {
  float phase = hash(601.0) * TAU;
  vec2 q = p * (2.0 + u_complexity * 2.0);
  q += (0.12 + u_warp * 0.25) * vec2(sin(q.y * 2.5 + T + phase), cos(q.x * 2.5 - T + phase));
  float density = atmosphereNoise(q);
  float front = smoothstep(0.3, 0.6, density);
  float feather = exp(-pow((density - 0.46) * 14.0, 2.0));
  vec3 paper = pal(0.72) * 0.6;
  vec3 ink = pal(0.1 + density * 0.4) * 0.85;
  return mix(paper, ink, front) + pal(0.85) * feather * 0.09;
}
`,
  deepOcean: `
vec3 scene(vec2 p, float T) {
  float phase = hash(611.0) * TAU;
  float depth = smoothstep(-0.5, 0.7, p.y);
  vec3 col = pal(0.05 + depth * 0.32) * (0.35 + depth * 0.3);
  float surface = 0.3 + 0.035 * sin(p.x * 4.0 + sin(T + phase));
  float count = 4.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float slant = p.x * (2.4 + fi * 0.2) + p.y * 0.75;
    slant += (0.08 + u_warp * 0.2) * sin(T + phase + fi * 0.8);
    float beam = pow(0.5 + 0.5 * cos(slant * 7.0 + fi * 1.9), 12.0);
    float fade = exp(-max(surface - p.y, 0.0) * 2.8);
    col += pal(0.5 + fi / count * 0.43) * beam * fade * 0.1;
  }
  col += pal(0.9) * exp(-pow((p.y - surface) * 23.0, 2.0)) * 0.2;
  return col;
}
`,
} satisfies Record<AtmosphereFamily, string>;
