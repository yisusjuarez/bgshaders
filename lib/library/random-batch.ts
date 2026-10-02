import { catalogConfig } from "@/lib/shader/catalog";
import type { ShaderConfig } from "@/lib/shader/schema";

/** Upper bound on one generated batch — keeps a stray count from melting the GPU. */
export const MAX_RANDOM_COUNT = 200;

/** Stable first seed so the initial render matches on server and client. */
export const DEFAULT_RANDOM_SEED = 424_242;

export interface RandomBatchOptions {
  /** how many loops to draw; clamped to [0, MAX_RANDOM_COUNT] */
  count: number;
  /** first seed; consecutive seeds make the whole batch reproducible */
  baseSeed?: number;
  /** loop length applied to every item; omit to keep each draw's own duration */
  duration?: number;
}

/** A fresh batch seed. Event-handler only — never during render (hydration). */
export function randomBaseSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

/**
 * Draw `count` loops from the expanded catalog, one consecutive seed each, so
 * the same base seed always regenerates the same batch. Unlike buildMatrix
 * nothing is overridden except the optional duration, which is what makes these
 * an unconstrained sample of the whole design space rather than a grid.
 */
export function buildRandomBatch(opts: RandomBatchOptions): ShaderConfig[] {
  const baseSeed = opts.baseSeed ?? randomBaseSeed();
  const count = Math.min(MAX_RANDOM_COUNT, Math.max(0, Math.floor(opts.count)));
  const out: ShaderConfig[] = [];
  for (let i = 0; i < count; i++) {
    const config = catalogConfig((baseSeed + i) % 1_000_000);
    out.push(opts.duration === undefined ? config : { ...config, duration: opts.duration });
  }
  return out;
}
