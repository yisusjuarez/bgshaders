import { describe, expect, it } from "vitest";
import { buildMatrix, matrixCount, type MatrixAxes } from "../matrix";
import { PALETTES } from "@/lib/shader/palettes";
import { shaderConfigSchema } from "@/lib/shader/schema";

const axes: MatrixAxes = {
  families: ["mesh", "kaleido"],
  speeds: [1, 2],
  paletteNames: [PALETTES[0].name, PALETTES[1].name],
  seedsPerCombo: 2,
  duration: 10,
};

describe("matrixCount", () => {
  it("is the product of every axis", () => {
    expect(matrixCount(axes)).toBe(2 * 2 * 2 * 2);
  });
});

describe("buildMatrix", () => {
  it("produces exactly matrixCount items", () => {
    expect(buildMatrix(axes)).toHaveLength(matrixCount(axes));
  });

  it("assigns a unique seed to every item", () => {
    const seeds = buildMatrix(axes).map((c) => c.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it("only emits the selected families, speeds and palette colors", () => {
    const paletteColorSets = new Set(
      [PALETTES[0], PALETTES[1]].map((p) => p.colors.join()),
    );
    for (const c of buildMatrix(axes)) {
      expect(axes.families).toContain(c.family);
      expect(axes.speeds).toContain(c.speed);
      expect(c.duration).toBe(10);
      expect(paletteColorSets.has(c.colors.join())).toBe(true);
    }
  });

  it("emits only schema-valid configs", () => {
    for (const c of buildMatrix(axes)) {
      expect(shaderConfigSchema.safeParse(c).success).toBe(true);
    }
  });

  it("is deterministic for the same axes", () => {
    expect(buildMatrix(axes)).toEqual(buildMatrix(axes));
  });

  it("scales with seedsPerCombo", () => {
    const one = buildMatrix({ ...axes, seedsPerCombo: 1 });
    expect(one).toHaveLength(matrixCount({ ...axes, seedsPerCombo: 1 }));
    expect(one.length * 2).toBe(buildMatrix(axes).length);
  });

  it("ignores unknown palette names", () => {
    const out = buildMatrix({ ...axes, paletteNames: ["Nope"], families: ["mesh"], speeds: [1], seedsPerCombo: 1 });
    expect(out).toHaveLength(0);
  });
});
