"use client";

import { useState } from "react";
import { PackagePlus, Shuffle } from "lucide-react";
import { MotionCards, TempoControls } from "@/components/motion-controls";
import { useLanguage } from "@/components/language-provider";
import { PaletteEditor } from "@/components/palette-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { buildCreativePack, MOTION_PROFILES } from "@/lib/creative/pack";
import type { MotionDNA, ShaderConfig } from "@/lib/shader/schema";

interface Props {
  initialConfig: ShaderConfig;
  onCreate: (configs: ShaderConfig[]) => void;
}

export function DirectedPackBuilder({ initialConfig, onCreate }: Props) {
  const { t } = useLanguage();
  const [packName, setPackName] = useState("Neon Motion");
  const [count, setCount] = useState("12");
  const [baseSeed, setBaseSeed] = useState(initialConfig.seed);
  const [dna, setDna] = useState<MotionDNA>(initialConfig.motionDNA);
  const [colors, setColors] = useState<string[]>(initialConfig.colors);
  const [bpm, setBpm] = useState(initialConfig.bpm);
  const [beats, setBeats] = useState(initialConfig.beats);
  const [layered, setLayered] = useState(true);

  const chooseDNA = (next: MotionDNA) => {
    const profile = MOTION_PROFILES[next];
    setDna(next);
    setBpm(profile.bpm);
    setBeats(profile.beats);
  };

  const generate = () => {
    onCreate(buildCreativePack({
      name: packName,
      count: Number(count),
      baseSeed,
      motionDNA: dna,
      colors,
      bpm,
      beats,
      layered,
    }));
    setBaseSeed(Math.floor(Math.random() * 1_000_000));
  };

  return (
    <div className="space-y-5 pt-2 sm:max-h-[52vh] sm:overflow-y-auto sm:pr-1">
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-3 text-[12px] leading-5 text-white/65">
        {t("Creates related loops using the current palette and movement.")}
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-[1fr_110px]">
        <div className="space-y-1.5">
          <Label>{t("Collection name")}</Label>
          <Input value={packName} onChange={(event) => setPackName(event.target.value)} maxLength={40} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("Loops")}</Label>
          <Select
            items={[6, 12, 20, 30, 50].map((value) => ({ value: String(value), label: String(value) }))}
            value={count}
            onValueChange={(value) => value && setCount(value)}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[6, 12, 20, 30, 50].map((value) => (
                <SelectItem key={value} value={String(value)}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <details className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <summary className="cursor-pointer text-sm font-medium">{t("Customize pack")}</summary>
        <div className="mt-4 space-y-5">
      <div className="space-y-2">
        <div>
          <Label>{t("Shared motion direction")}</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("Defines the family mix, movement, density and pace of the entire collection.")}</p>
        </div>
        <MotionCards value={dna} onChange={chooseDNA} />
      </div>

      <div className="space-y-2">
        <Label>{t("Shared palette")}</Label>
        <PaletteEditor colors={colors} onChange={setColors} />
      </div>

      <TempoControls bpm={bpm} beats={beats} onChange={(nextBpm, nextBeats) => { setBpm(nextBpm); setBeats(nextBeats); }} />

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <div>
          <div className="text-[13px] font-medium">{t("Layered editions")}</div>
          <div className="text-[11px] text-muted-foreground">{t("Blend two related shader families in every loop.")}</div>
        </div>
        <Switch checked={layered} onCheckedChange={setLayered} />
      </div>
        <Button variant="ghost" size="sm" onClick={() => setBaseSeed(Math.floor(Math.random() * 1_000_000))}>
          <Shuffle className="size-4" /> {t("Seed")} {baseSeed}
        </Button>
        </div>
      </details>

      <div className="flex justify-end border-t border-white/10 pt-4">
        <Button onClick={generate}>
          <PackagePlus className="size-4" /> {t("Generate & add")} {count} {t("to tray")}
        </Button>
      </div>
    </div>
  );
}
