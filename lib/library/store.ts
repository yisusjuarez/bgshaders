"use client";

import { shaderConfigSchema, type ShaderConfig } from "@/lib/shader/schema";
import { z } from "zod";

const LIBRARY_STORAGE = "jedylabs-library";

const librarySchema = z.array(z.unknown()).catch([]);

/**
 * Stable identity for a loop's *look* — everything that affects pixels, minus
 * the cosmetic name. Used to dedupe the curated tray so adding the same design
 * twice (or the same matrix cell) is a no-op.
 */
export function configSignature(c: ShaderConfig): string {
  return JSON.stringify([
    c.family,
    c.seed,
    c.speed,
    c.scale,
    c.complexity,
    c.warp,
    c.grain,
    c.vignette,
    c.duration,
    c.colors.map((x) => x.toLowerCase()),
  ]);
}

/** Append configs, dropping any whose look already exists in the list. Pure. */
export function addConfigs(
  list: ShaderConfig[],
  additions: ShaderConfig[],
): ShaderConfig[] {
  const seen = new Set(list.map(configSignature));
  const next = [...list];
  for (const cfg of additions) {
    const sig = configSignature(cfg);
    if (seen.has(sig)) continue;
    seen.add(sig);
    next.push(cfg);
  }
  return next;
}

/** Remove the item at index i. Pure. */
export function removeAt(list: ShaderConfig[], i: number): ShaderConfig[] {
  return list.filter((_, idx) => idx !== i);
}

/**
 * Parse persisted JSON item by item. A removed family or corrupt entry should
 * not make the rest of a curated tray disappear.
 */
export function parseLibrary(raw: string | null): ShaderConfig[] {
  if (!raw) return [];
  try {
    return librarySchema
      .parse(JSON.parse(raw))
      .flatMap((item) => {
        const parsed = shaderConfigSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      });
  } catch {
    return [];
  }
}

export function getLibrary(): ShaderConfig[] {
  if (typeof window === "undefined") return [];
  return parseLibrary(localStorage.getItem(LIBRARY_STORAGE));
}

export function setLibrary(list: ShaderConfig[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIBRARY_STORAGE, JSON.stringify(list));
}
