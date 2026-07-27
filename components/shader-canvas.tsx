"use client";

import { useEffect, useRef, useState } from "react";
import { ShaderRenderer } from "@/lib/shader/renderer";
import type { ShaderConfig } from "@/lib/shader/schema";

interface Props {
  config: ShaderConfig;
  playing: boolean;
  /** Mutable ref the canvas writes the current phase into each frame, so the
   *  loop ring can animate without re-rendering React at 60fps. */
  phaseRef: React.MutableRefObject<number>;
}

export function ShaderCanvas({ config, playing, phaseRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  const playingRef = useRef(playing);
  // Bumped when the GPU restores a lost context, to rebuild the renderer.
  const [contextGen, setContextGen] = useState(0);
  useEffect(() => {
    configRef.current = config;
    playingRef.current = playing;
  }, [config, playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onLost = (e: Event) => e.preventDefault(); // allow auto-restore
    const onRestored = () => setContextGen((g) => g + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    let renderer: ShaderRenderer;
    try {
      renderer = new ShaderRenderer(canvas);
    } catch (e) {
      console.error(e);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      return;
    }

    let raf = 0;
    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const cfg = configRef.current;
      if (playingRef.current) {
        phaseRef.current = (phaseRef.current + dt / cfg.duration) % 1;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w > 0 && h > 0) {
        try {
          renderer.render(cfg, phaseRef.current, w, h);
        } catch (e) {
          console.error(e);
          cancelAnimationFrame(raf);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      // Keep the context alive: this canvas element can re-mount (StrictMode)
      // and a force-lost context would poison the next renderer.
      renderer.dispose({ releaseContext: false });
    };
  }, [phaseRef, contextGen]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
