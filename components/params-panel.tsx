"use client";

import { PaletteEditor } from "@/components/palette-editor";
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
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint?: string;
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
      {hint && <p className="text-[10px] leading-4 text-white/40">{hint}</p>}
    </div>
  );
}

export function ParamsPanel({ config, onChange }: Props) {
  return (
    <aside
      className="fixed right-3 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] left-3 z-20 max-h-[min(50dvh,28rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-zinc-950/85 p-4 text-white shadow-2xl backdrop-blur-xl sm:top-1/2 sm:right-4 sm:bottom-auto sm:left-auto sm:max-h-[85vh] sm:w-72 sm:-translate-y-1/2 sm:bg-zinc-950/55 sm:p-5"
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
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
            Palette
          </span>
          <PaletteEditor
            colors={config.colors}
            onChange={(colors) => onChange({ colors })}
            compact
          />
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
          label="Pattern size"
          value={config.scale}
          min={0.4}
          max={3}
          step={0.05}
          format={(v) => v.toFixed(2)}
          hint="Higher values enlarge and soften the forms. Lower values reveal finer detail."
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
          label="Sharpness"
          value={config.sharpness}
          min={-1}
          max={1}
          step={0.05}
          format={(v) => v < -0.05 ? `Soft ${Math.round(-v * 100)}%` : v > 0.05 ? `Crisp ${Math.round(v * 100)}%` : "Neutral"}
          onChange={(v) => onChange({ sharpness: v })}
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
