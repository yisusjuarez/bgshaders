import type { CreativeFamily } from "./schema";
import { EXTENDED_SCENES } from "./extended-scenes";

// Analytic materials and paths: no frame history, textures or simulation state.
// Every time-dependent trajectory closes over an integer number of turns.
export const CREATIVE_SCENES: Record<CreativeFamily, string> = {
  ...EXTENDED_SCENES,
  liquidMetal: `
vec3 scene(vec2 p, float T) {
  vec2 center = (vec2(hash(11.0), hash(12.0)) - 0.5) * 0.22;
  p -= center + 0.035 * vec2(sin(T), cos(T));
  float angle = TAU * hash(13.0) + 0.18 * sin(T);
  p = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
  p.x *= 0.88 + hash(14.0) * 0.35;
  float a = atan(p.y, p.x);
  float r = length(p);
  float lobes = 3.0 + floor(hash(15.0) * 3.0);
  float radius = 0.34 + u_warp * 0.055 * sin(lobes * a + T)
    + u_warp * 0.035 * cos((lobes + 1.0) * a - 2.0 * T);
  float edge = r - radius;
  float aa = max(fwidth(edge), 0.001);
  float mask = 1.0 - smoothstep(-aa, aa, edge);
  vec3 bg = pal(0.02) * (0.65 + 0.5 * exp(-r * r * 4.0));
  float z = sqrt(max(1.0 - pow(r / max(radius, 0.1), 2.0), 0.0));
  vec2 ripple = u_warp * 0.16 * vec2(
    sin(p.y * (12.0 + u_complexity * 12.0) + T),
    cos(p.x * (10.0 + u_complexity * 9.0) - T));
  vec3 n = normalize(vec3(p / max(radius, 0.1) + ripple, z + 0.04));
  vec3 ref = reflect(vec3(0.0, 0.0, -1.0), n);
  float field = 0.5 + 0.28 * sin(ref.y * 5.0 + 0.5 * sin(T))
    + 0.2 * cos(ref.x * 3.0 - cos(T));
  vec3 metal = pal(clamp(field, 0.0, 1.0));
  float softbox = pow(max(0.0, 1.0 - abs(ref.y - 0.3) * 4.0), 7.0);
  float strip = pow(max(0.0, 1.0 - abs(ref.x + ref.y * 0.3 + 0.6) * 9.0), 4.0);
  float fresnel = pow(1.0 - z, 3.0);
  metal = metal * (0.32 + 0.68 * z) + vec3(softbox * 0.8 + strip * 0.45);
  metal += pal(0.75) * fresnel * 0.6;
  bg += pal(0.55) * exp(-abs(edge) * 60.0) * 0.1;
  return mix(bg, metal, mask);
}
`,
  iridescentGlass: `
vec3 scene(vec2 p, float T) {
  vec3 col = pal(0.01) * 0.55;
  col += pal(0.35) * exp(-dot(p - vec2(-0.3, 0.1), p - vec2(-0.3, 0.1)) * 3.0) * 0.1;
  float count = 3.0 + floor(u_complexity * 3.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = TAU * hash(fi * 7.0 + 31.0);
    float orbit = 0.1 + 0.16 * hash(fi * 7.0 + 32.0);
    vec2 c = orbit * vec2(cos(T + phase), sin(T + phase) * 0.8);
    float ang = phase + 0.4 * sin(T + phase);
    vec2 q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * (p - c);
    q *= vec2(0.7 + hash(fi * 7.0 + 33.0) * 0.6, 1.3);
    float size = 0.2 + 0.1 * hash(fi * 7.0 + 34.0);
    float r = length(q) / size;
    float aa = max(fwidth(r), 0.003);
    float inside = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
    float z = sqrt(max(0.0, 1.0 - r * r));
    float fresnel = pow(clamp(r, 0.0, 1.0), 5.0);
    float interference = 0.5 + 0.5 * sin(12.0 * z + 3.0 * q.x + T + phase);
    vec3 tint = pal(0.3 + interference * 0.65);
    float rim = exp(-abs(r - 0.94) * 70.0);
    float highlight = pow(max(0.0, dot(normalize(vec3(q / size, z + 0.01)), normalize(vec3(-0.4, 0.7, 0.7)))), 32.0);
    vec3 glass = mix(col, tint, 0.1 + fresnel * 0.4);
    glass += tint * rim * 0.9 + vec3(highlight * 0.75);
    glass += pal(0.7 + 0.2 * sin(T + fi)) * pow(0.5 + 0.5 * sin(q.x * 13.0 + q.y * 7.0 + u_warp * sin(T)), 12.0) * 0.15;
    col = mix(col, glass, inside);
    col += tint * exp(-abs(r - 1.0) * 28.0) * 0.08;
  }
  return col;
}
`,
  ribbonSculpture: `
vec3 scene(vec2 p, float T) {
  float angle = (hash(61.0) - 0.5) * 1.0;
  p = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
  vec3 col = pal(0.0) * 0.65;
  float count = 3.0 + floor(u_complexity * 4.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = TAU * hash(fi * 5.0 + 62.0);
    float y = (fi - (count - 1.0) * 0.5) * 0.13;
    float frequency = 3.0 + 2.5 * hash(fi * 5.0 + 63.0);
    float amplitude = 0.12 + 0.17 * u_warp;
    float line = y + amplitude * sin(p.x * frequency + T + phase)
      + 0.055 * cos(p.x * 8.0 - 2.0 * T + phase);
    float twist = sin(p.x * 4.0 + T + phase);
    float width = 0.018 + 0.07 * (0.3 + 0.7 * abs(twist));
    float across = (p.y - line) / width;
    float aa = max(fwidth(across), 0.015);
    float mask = (1.0 - smoothstep(1.0 - aa, 1.0 + aa, abs(across)))
      * (1.0 - smoothstep(0.55, 0.85, abs(p.x)));
    float z = sqrt(max(0.0, 1.0 - across * across));
    float light = 0.24 + 0.7 * max(0.0, z * 0.75 + across * 0.45 * sign(twist));
    vec3 material = pal(0.25 + 0.65 * hash(fi * 5.0 + 64.0)) * light;
    material += pal(0.95) * pow(max(0.0, z * 0.7 - across * 0.65), 18.0) * 0.65;
    float shadow = exp(-pow((p.y - line + width * 0.8) / (width * 1.9), 2.0)) * 0.22;
    col *= 1.0 - shadow * (1.0 - mask);
    col = mix(col, material, mask);
  }
  return col;
}
`,
  architecture: `
float frameDistance(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 scene(vec2 p, float T) {
  vec2 focus = (vec2(hash(81.0), hash(82.0)) - 0.5) * 0.22;
  p -= focus;
  float tilt = (hash(83.0) - 0.5) * 0.5 + u_warp * 0.15 * sin(T);
  p = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p;
  vec3 col = pal(0.0) * 0.3;
  float count = 6.0 + floor(u_complexity * 7.0);
  float aspect = 0.65 + hash(84.0) * 0.55;
  for (int i = 0; i < 13; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float depth = fract(fi / count + T / TAU);
    float size = 0.025 + 2.3 * depth * depth;
    vec2 q = p - u_warp * 0.035 * sin(T) * depth * vec2(1.0, -1.0);
    float d = frameDistance(q, vec2(size * aspect, size), size * 0.12);
    float thickness = size * 0.045 + 0.002;
    float aa = max(fwidth(d), 0.0005);
    float mask = 1.0 - smoothstep(thickness - aa, thickness + aa, abs(d));
    float fade = smoothstep(0.0, 0.1, depth) * (1.0 - smoothstep(0.82, 1.0, depth));
    float bevel = clamp(0.5 + d / max(thickness * 2.0, 0.001), 0.0, 1.0);
    vec3 material = pal(0.3 + 0.55 * depth) * (0.3 + 0.7 * bevel);
    col = mix(col, material, mask * fade);
    col += pal(0.8) * exp(-abs(d) / max(size * 0.015, 0.001)) * fade * 0.12;
  }
  return col;
}
`,
  constellation: `
vec2 particlePath(float fi, float T) {
  float phase = TAU * hash(fi * 9.0 + 101.0);
  float radius = 0.12 + hash(fi * 9.0 + 102.0) * 0.58;
  float k = 1.0 + floor(hash(fi * 9.0 + 103.0) * 2.0);
  vec2 center = (vec2(hash(fi * 9.0 + 104.0), hash(fi * 9.0 + 105.0)) - 0.5) * 0.4;
  return center + radius * vec2(cos(k * T + phase), sin(k * T + phase) * (0.3 + u_warp * 0.55));
}
float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 v = b - a;
  float h = clamp(dot(p - a, v) / max(dot(v, v), 0.000001), 0.0, 1.0);
  return length(p - a - v * h);
}
vec3 scene(vec2 p, float T) {
  vec3 col = pal(0.0) * 0.5;
  float count = 8.0 + floor(u_complexity * 14.0);
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float depth = 0.35 + 0.65 * hash(fi * 9.0 + 106.0);
    vec2 head = particlePath(fi, T);
    vec3 tint = pal(0.35 + hash(fi * 9.0 + 107.0) * 0.65);
    float size = 0.004 + 0.009 * depth;
    float d = length(p - head);
    float aa = max(fwidth(d), 0.0005);
    col += tint * (1.0 - smoothstep(size, size + aa, d)) * depth;
    col += tint * exp(-d * d / (size * size * 16.0)) * depth * 0.22;
    vec2 last = head;
    for (int j = 1; j <= 4; j++) {
      float fj = float(j);
      vec2 next = particlePath(fi, T - fj * 0.08125);
      float trail = segmentDistance(p, last, next);
      float weight = (1.0 - fj / 5.0) * depth;
      col += tint * exp(-trail * trail / (size * size * 0.45)) * weight * 0.24;
      last = next;
    }
  }
  return col / (1.0 + col * 0.15);
}
`,
  luminousOrbits: `
vec3 scene(vec2 p, float T) {
  p -= (vec2(hash(131.0), hash(132.0)) - 0.5) * 0.18;
  vec3 col = pal(0.0) * 0.4;
  float count = 3.0 + floor(u_complexity * 4.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float angle = TAU * hash(fi * 6.0 + 133.0) + 0.2 * u_warp * sin(T);
    vec2 q = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
    float radius = 0.17 + fi * 0.055;
    float squash = 0.4 + 0.35 * hash(fi * 6.0 + 134.0);
    q.y /= squash;
    float d = abs(length(q) - radius);
    float theta = atan(q.y, q.x);
    float phase = TAU * hash(fi * 6.0 + 135.0);
    float k = 1.0 + floor(hash(fi * 6.0 + 136.0) * 2.0);
    float arc = pow(0.5 + 0.5 * cos(theta - k * T - phase), 4.0);
    vec3 tint = pal(0.25 + 0.7 * hash(fi * 6.0 + 137.0));
    float aa = max(fwidth(d), 0.0006);
    col += tint * (1.0 - smoothstep(0.0015, 0.0015 + aa, d)) * (0.16 + arc * 0.9);
    col += tint * exp(-d * 90.0) * arc * 0.3;
    vec2 body = radius * vec2(cos(k * T + phase), sin(k * T + phase));
    float bd = length(q - body);
    col += pal(0.96) * exp(-bd * bd * 5500.0) * 0.9;
  }
  float r = length(p);
  float core = 1.0 - smoothstep(0.092, 0.097, r);
  float z = sqrt(max(0.0, 1.0 - pow(r / 0.095, 2.0)));
  vec3 material = pal(0.2 + z * 0.35) * (0.2 + z * 0.5);
  col = mix(col, material, core);
  col += pal(0.75) * exp(-abs(r - 0.098) * 180.0) * 0.18;
  return col;
}
`,
  moire: `
vec3 scene(vec2 p, float T) {
  vec2 offset = (vec2(hash(181.0), hash(182.0)) - 0.5) * 0.25;
  float angle = TAU * hash(183.0) + 0.12 * sin(T);
  vec2 q = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (p - offset);
  float frequency = 55.0 + u_complexity * 65.0;
  float turn = 0.11 + u_warp * 0.18 * sin(T);
  vec2 r = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * q;
  float phaseA = frequency * (q.x + u_warp * 0.12 * sin(q.y * 4.0 + T));
  float phaseB = frequency * (r.x + 0.045 * cos(r.y * 5.0 - T));
  float aaA = max(fwidth(phaseA) * 0.65, 0.01);
  float aaB = max(fwidth(phaseB) * 0.65, 0.01);
  float linesA = smoothstep(-aaA, aaA, sin(phaseA));
  float linesB = smoothstep(-aaB, aaB, sin(phaseB));
  float envelope = 1.0 - smoothstep(0.35, 0.68, length(p - offset));
  float interference = linesA * linesB;
  vec3 ink = mix(u_colors[1], pal(0.65), 0.12 + 0.14 * sin(T));
  vec3 col = mix(u_colors[0], ink, interference * envelope);
  return col;
}
`,
};
