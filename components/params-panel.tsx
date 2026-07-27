"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { familyItems } from "@/lib/shader/labels";
import { PALETTES } from "@/lib/shader/palettes";
import { type Family, type ShaderConfig } from "@/lib/shader/schema";

interface Props {
  config: ShaderConfig;
  onChange: (patch: Partial<ShaderConfig>) => void;
}

function Row({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-white/80">
          {format(value)}
        </span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        aria-label={label}
      />
    </div>
  );
}

export function ParamsPanel({ config, onChange }: Props) {
  const shufflePalette = () => {
    const others = PALETTES.filter(
      (p) => p.colors.join() !== config.colors.join(),
    );
    const next = others[Math.floor(Math.random() * others.length)];
    onChange({ colors: [...next.colors] });
  };

  return (
    <aside
      className="fixed top-1/2 right-4 z-20 max-h-[85vh] w-72 max-w-[calc(100vw-2rem)] -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/55 p-5 text-white shadow-2xl backdrop-blur-xl"
      aria-label="Loop parameters"
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
            Family
          </span>
          <Select
            items={familyItems}
            value={config.family}
            onValueChange={(v) => v && onChange({ family: v as Family })}
          >
            <SelectTrigger className="w-full border-white/15 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {familyItems.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
              Palette
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={shufflePalette}
              aria-label="Shuffle palette"
            >
              <Dices className="size-3.5" />
            </Button>
          </div>
          <div className="flex h-7 overflow-hidden rounded-lg border border-white/10">
            {config.colors.map((c, i) => (
              <div key={i} className="flex-1" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
              Seed
            </span>
            <span className="font-mono text-[11px] tabular-nums text-white/80">
              {config.seed}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() =>
              onChange({ seed: Math.floor(Math.random() * 1_000_000) })
            }
          >
            Reroll seed
          </Button>
        </div>

        <Row
          label="Cycles per loop"
          value={config.speed}
          min={1}
          max={3}
          step={1}
          format={(v) => `${v}×`}
          onChange={(v) => onChange({ speed: Math.round(v) })}
        />
        <Row
          label="Duration"
          value={config.duration}
          min={2}
          max={30}
          step={1}
          format={(v) => `${v}s`}
          onChange={(v) => onChange({ duration: v })}
        />
        <Row
          label="Scale"
          value={config.scale}
          min={0.4}
          max={3}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onChange({ scale: v })}
        />
        <Row
          label="Complexity"
          value={config.complexity}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onChange({ complexity: v })}
        />
        <Row
          label="Warp"
          value={config.warp}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onChange({ warp: v })}
        />
        <Row
          label="Grain"
          value={config.grain}
          min={0}
          max={0.2}
          step={0.005}
          format={(v) => v.toFixed(3)}
          onChange={(v) => onChange({ grain: v })}
        />
        <Row
          label="Vignette"
          value={config.vignette}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onChange({ vignette: v })}
        />
      </div>
    </aside>
  );
}
