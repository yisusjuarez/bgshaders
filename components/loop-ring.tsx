"use client";

import { useEffect, useRef } from "react";
import { Pause, Play } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const R = 24;
const CIRC = 2 * Math.PI * R;

interface Props {
  colors: string[];
  playing: boolean;
  phaseRef: React.MutableRefObject<number>;
  onToggle: () => void;
}

/**
 * The loop ring: a circular phase indicator with a seam tick at 12 o'clock.
 * The stroke sweeps 0→1 each loop and lands exactly back on the seam — the
 * product's promise, drawn as UI. Stroke colors come from the live palette.
 */
export function LoopRing({ colors, playing, phaseRef, onToggle }: Props) {
  const { t } = useLanguage();
  const arcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const arc = arcRef.current;
      if (arc) {
        arc.style.strokeDashoffset = String(CIRC * (1 - phaseRef.current));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phaseRef]);

  const stops = colors.slice(1); // skip the dark anchor; keep the vivid end

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={t(playing ? "Pause loop" : "Play loop")}
      className="group relative grid size-14 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id="loop-grad" x1="0" y1="0" x2="1" y2="1">
            {stops.map((c, i) => (
              <stop
                key={i}
                offset={`${(i / Math.max(stops.length - 1, 1)) * 100}%`}
                stopColor={c}
              />
            ))}
          </linearGradient>
        </defs>
        <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" />
        <circle
          ref={arcRef}
          cx="28"
          cy="28"
          r={R}
          fill="none"
          stroke="url(#loop-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
        />
        {/* seam tick: where the loop closes on itself */}
        <line x1="52" y1="28" x2="55" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition-colors group-hover:bg-white/20">
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
      </span>
    </button>
  );
}
