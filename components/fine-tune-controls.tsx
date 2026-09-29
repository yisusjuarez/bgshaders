"use client";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { type ShaderConfig } from "@/lib/shader/schema";

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

export function FineTuneControls({ config, onChange }: Props) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-5 sm:grid-cols-2" role="group" aria-label={t("Loop parameters")}>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
              {t("Seed")}
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
            {t("Reroll seed")}
          </Button>
        </div>

        <Row
          label={t("Cycles per loop")}
          value={config.speed}
          min={1}
          max={3}
          step={1}
          format={(v) => `${v}×`}
          onChange={(v) => onChange({ speed: Math.round(v) })}
        />
        <Row
          label={t("Pattern size")}
          value={config.scale}
          min={0.4}
          max={3}
          step={0.05}
          format={(v) => v.toFixed(2)}
          hint={t("Higher values enlarge and soften the forms. Lower values reveal finer detail.")}
          onChange={(v) => onChange({ scale: v })}
        />
        <Row
          label={t("Complexity")}
          value={config.complexity}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onChange({ complexity: v })}
        />
        <Row
          label={t("Warp")}
          value={config.warp}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onChange({ warp: v })}
        />
        <Row
          label={t("Grain")}
          value={config.grain}
          min={0}
          max={0.2}
          step={0.005}
          format={(v) => v.toFixed(3)}
          onChange={(v) => onChange({ grain: v })}
        />
        <Row
          label={t("Sharpness")}
          value={config.sharpness}
          min={-1}
          max={1}
          step={0.05}
          format={(v) => v < -0.05 ? `${t("Soft")} ${Math.round(-v * 100)}%` : v > 0.05 ? `${t("Crisp")} ${Math.round(v * 100)}%` : t("Neutral")}
          onChange={(v) => onChange({ sharpness: v })}
        />
        <Row
          label={t("Vignette")}
          value={config.vignette}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onChange({ vignette: v })}
        />
    </div>
  );
}
