"use client";

import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { durationFromTempo, MOTION_PROFILES } from "@/lib/creative/pack";
import { MOTION_DNAS, type MotionDNA } from "@/lib/shader/schema";
import { cn } from "@/lib/utils";

export function MotionCards({
  value,
  onChange,
}: {
  value: MotionDNA;
  onChange: (value: MotionDNA) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MOTION_DNAS.map((dna) => {
        const profile = MOTION_PROFILES[dna];
        return (
          <button
            key={dna}
            type="button"
            onClick={() => onChange(dna)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              value === dna
                ? "border-white/25 bg-white/12 text-white"
                : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.07]",
            )}
          >
            <span className="block text-[13px] font-medium">{t(profile.label)}</span>
            <span className="mt-1 block text-[10px] leading-4 text-white/45">
              {t(profile.description)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TempoControls({
  bpm,
  beats,
  onChange,
}: {
  bpm: number;
  beats: number;
  onChange: (bpm: number, beats: number) => void;
}) {
  const { t } = useLanguage();
  const beatOptions = Array.from({ length: 64 }, (_, index) => index + 1);
  const validBeats = (nextBpm: number) =>
    beatOptions.filter((value) => {
      const duration = durationFromTempo(nextBpm, value);
      return duration >= 2 && duration <= 30;
    });
  const changeBpm = (nextBpm: number) => {
    const clamped = Math.min(240, Math.max(30, Math.round(nextBpm)));
    const valid = validBeats(clamped);
    const nextBeats = valid.includes(beats)
      ? beats
      : valid.reduce((best, value) =>
          Math.abs(value - beats) < Math.abs(best - beats) ? value : best,
        );
    onChange(clamped, nextBeats);
  };

  return (
    <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <div className="space-y-1.5">
        <Label>BPM</Label>
        <Input
          type="number"
          aria-label="BPM"
          min={30}
          max={240}
          value={bpm}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber;
            if (Number.isFinite(next)) changeBpm(next);
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("Beats per loop")}</Label>
        <Select
          items={validBeats(bpm).map((value) => ({
            value: String(value),
            label: String(value),
          }))}
          value={String(beats)}
          onValueChange={(value) => value && onChange(bpm, Number(value))}
        >
          <SelectTrigger aria-label={t("Beats per loop")} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {validBeats(bpm).map((value) => (
              <SelectItem key={value} value={String(value)}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 font-mono text-[11px] text-white/55 sm:col-span-1 sm:pb-2">
        {durationFromTempo(bpm, beats).toFixed(2)}s
      </div>
    </div>
  );
}
