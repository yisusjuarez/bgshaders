import { describe, expect, it } from "vitest";
import { fragmentSource, layeredFragmentSource } from "../glsl";
import { mulberry32, randomConfig } from "../random";
import { FAMILIES, LEGACY_FAMILIES, hexToRgb, shaderConfigSchema } from "../schema";

describe("shaderConfigSchema", () => {
  it("exposes the expanded catalog without the retired ridge family", () => {
    expect(FAMILIES).toHaveLength(82);
    expect(new Set(FAMILIES).size).toBe(FAMILIES.length);
    expect(FAMILIES).not.toContain("ridge");
    expect(FAMILIES).not.toContain("graphicPoster");
    expect(FAMILIES).not.toContain("accretion");
    for (const retired of ["chromeKnot", "petalBloom", "jellyfish", "coralFan", "origamiFan", "horizonFold"]) {
      expect(FAMILIES).not.toContain(retired);
    }
    expect(FAMILIES).toEqual(
      expect.arrayContaining([
        "marble",
        "caustics",
        "ink",
        "checker",
        "tunnel",
        "maze",
        "orbitals",
        "plasma",
        "glitch",
        "equalizer",
        "radar",
        "hologram",
        "fractals",
        "noise",
        "waves",
        "singularity",
        "warpedNoise",
      ]),
    );
  });

  it("accepts a valid config", () => {
    const result = shaderConfigSchema.safeParse(randomConfig(1));
    expect(result.success).toBe(true);
  });

  it("rejects fractional speed — a non-integer harmonic would break the loop seam", () => {
    const cfg = { ...randomConfig(1), speed: 1.5 };
    expect(shaderConfigSchema.safeParse(cfg).success).toBe(false);
  });

  it("rejects malformed colors", () => {
    const cfg = { ...randomConfig(1), colors: ["#12345", "red"] };
    expect(shaderConfigSchema.safeParse(cfg).success).toBe(false);
  });
});

describe("randomConfig", () => {
  it("is deterministic for a given seed", () => {
    expect(randomConfig(12345)).toEqual(randomConfig(12345));
  });

  it("always produces schema-valid configs", () => {
    for (let s = 0; s < 500; s++) {
      const result = shaderConfigSchema.safeParse(randomConfig(s));
      expect(result.success, `seed ${s}`).toBe(true);
    }
  });

  it("covers every family", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 2000; s++) seen.add(randomConfig(s).family);
    expect(seen).toEqual(new Set(LEGACY_FAMILIES));
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays in [0, 1)", () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("loop-safety of shader sources", () => {
  // Time may only enter shaders through T (integer multiples of TAU*phase).
  // A `u_time`-style wall-clock uniform or non-harmonic phase use would break
  // the frame0 == frameN guarantee.
  it("no family references wall-clock time", () => {
    for (const family of FAMILIES) {
      const src = fragmentSource(family);
      expect(src).not.toMatch(/u_time/);
      expect(src).toContain("TAU * u_phase * u_speed");
    }
  });

  it("every family compiles the shared uniforms and main", () => {
    for (const family of FAMILIES) {
      const src = fragmentSource(family);
      expect(src).toContain("vec3 scene(");
      expect(src).toContain("void main()");
      expect(src).toContain("uniform float u_phase");
    }
  });

  it("namespaces two scenes into one loop-safe layered shader", () => {
    const src = layeredFragmentSource("mesh", "glitch", "screen");
    expect(src).toContain("vec3 sceneA(");
    expect(src).toContain("vec3 sceneB(");
    expect(src).toContain("float glitchFieldB(");
    expect(src).toContain("uniform float u_blend_amount");
    expect(src).toContain("TAU * u_phase * u_speed");
    expect(src.match(/void main\(\)/g)).toHaveLength(1);
  });
});

describe("hexToRgb", () => {
  it("converts hex to normalized rgb", () => {
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    const [r, g, b] = hexToRgb("#8040c0");
    expect(r).toBeCloseTo(128 / 255);
    expect(g).toBeCloseTo(64 / 255);
    expect(b).toBeCloseTo(192 / 255);
  });
});
