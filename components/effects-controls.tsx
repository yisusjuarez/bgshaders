"use client";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_EFFECTS, getShaderEffects, type ShaderConfig, type ShaderEffects } from "@/lib/shader/schema";

const CONTROLS = [
  { key: "blur", label: "Blur", hint: "Soften the entire loop, from a light blur to a diffuse background.", max: 1 },
  { key: "glow", label: "Glow", hint: "Add a soft halo around the brightest areas.", max: 1 },
  { key: "saturation", label: "Saturation", hint: "Adjust color intensity. Zero creates a monochrome loop.", max: 2 },
  { key: "contrast", label: "Contrast", hint: "Adjust the difference between light and dark areas.", max: 2 },
] as const;

export function EffectsControls({ config, onChange }: {
  config: ShaderConfig;
  onChange: (patch: Partial<ShaderConfig>) => void;
}) {
  const { t } = useLanguage();
  const effects = getShaderEffects(config);
  const neutral = CONTROLS.every(({ key }) => effects[key] === DEFAULT_EFFECTS[key]);
  const update = (key: keyof ShaderEffects, value: number) => onChange({ effects: { ...effects, [key]: value } });

  return (
    <div className="space-y-5" role="group" aria-label={t("Loop effects")}>
      {CONTROLS.map(({ key, label, hint, max }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] tracking-[0.18em] text-white/50 uppercase">{t(label)}</span>
            <span className="font-mono text-[11px] text-white/80 tabular-nums">
              {effects[key] === DEFAULT_EFFECTS[key] ? t(key === "blur" || key === "glow" ? "Off" : "Neutral") : `${Math.round(effects[key] * 100)}%`}
            </span>
          </div>
          <Slider aria-label={t(label)} value={effects[key]} min={0} max={max} step={0.01}
            onValueChange={(value) => update(key, Array.isArray(value) ? value[0] : value)} />
          <p className="text-[10px] leading-4 text-white/40">{t(hint)}</p>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" aria-label={t("Reset effects")} disabled={neutral}
        onClick={() => onChange({ effects: { ...DEFAULT_EFFECTS } })}>{t("Reset effects")}</Button>
    </div>
  );
}
