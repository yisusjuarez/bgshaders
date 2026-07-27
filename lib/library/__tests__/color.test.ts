import { describe, expect, it } from "vitest";
import { colorFamily, matchPaletteName } from "../color";
import { PALETTES } from "@/lib/shader/palettes";

describe("matchPaletteName", () => {
  it("recovers the name of a curated palette by its exact colors", () => {
    for (const p of PALETTES) {
      expect(matchPaletteName(p.colors)).toBe(p.name);
    }
  });

  it("is case-insensitive", () => {
    const upper = PALETTES[0].colors.map((c) => c.toUpperCase());
    expect(matchPaletteName(upper)).toBe(PALETTES[0].name);
  });

  it("returns null for colors that match no palette", () => {
    expect(matchPaletteName(["#123456", "#654321"])).toBeNull();
  });
});

describe("colorFamily", () => {
  const cases: [string, string][] = [
    ["#ff0000", "red"],
    ["#ff8000", "orange"],
    ["#ffdd00", "yellow"],
    ["#00ff00", "green"],
    ["#00ffff", "teal"],
    ["#0044ff", "blue"],
    ["#8000ff", "purple"],
    ["#ff00cc", "magenta"],
  ];

  it.each(cases)("buckets %s as %s", (hex, family) => {
    // Anchor with a dark + light neutral so the hue must come from the vivid one.
    expect(colorFamily(["#0a0a0a", hex, "#f0f0f0"])).toBe(family);
  });

  it("returns neutral when nothing is saturated", () => {
    expect(colorFamily(["#111111", "#808080", "#eeeeee"])).toBe("neutral");
  });

  it("is deterministic", () => {
    const c = PALETTES[3].colors;
    expect(colorFamily(c)).toBe(colorFamily(c));
  });

  it("returns a known label for every curated palette", () => {
    const valid = new Set([
      "red", "orange", "yellow", "green", "teal", "blue", "purple", "magenta", "neutral",
    ]);
    for (const p of PALETTES) expect(valid.has(colorFamily(p.colors))).toBe(true);
  });
});
