"use client";

import { useState } from "react";
import { PackagePlus, Shuffle } from "lucide-react";
import { MotionCards, TempoControls } from "@/components/motion-controls";
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
    <div className="max-h-[52vh] space-y-5 overflow-y-auto pr-1 pt-2">
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-3 text-[12px] leading-5 text-white/65">
        <strong className="text-white">Directed Pack</strong> creates multiple related loops for one sellable collection. They share palette, motion and timing, but remain visually varied. It adds them to the Tray and does not change the loop currently playing.
      </div>

      <div className="grid grid-cols-[1fr_110px] gap-3">
        <div className="space-y-1.5">
          <Label>Collection name</Label>
          <Input value={packName} onChange={(event) => setPackName(event.target.value)} maxLength={40} />
        </div>
        <div className="space-y-1.5">
          <Label>Loops</Label>
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

      <div className="space-y-2">
        <div>
          <Label>Shared motion direction</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Defines the family mix, movement, density and pace of the entire collection.</p>
        </div>
        <MotionCards value={dna} onChange={chooseDNA} />
      </div>

      <div className="space-y-2">
        <Label>Shared palette</Label>
        <PaletteEditor colors={colors} onChange={setColors} />
      </div>

      <TempoControls bpm={bpm} beats={beats} onChange={(nextBpm, nextBeats) => { setBpm(nextBpm); setBeats(nextBeats); }} />

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <div>
          <div className="text-[13px] font-medium">Layered editions</div>
          <div className="text-[11px] text-muted-foreground">Blend two related shader families in every loop.</div>
        </div>
        <Switch checked={layered} onCheckedChange={setLayered} />
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <Button variant="ghost" size="sm" onClick={() => setBaseSeed(Math.floor(Math.random() * 1_000_000))}>
          <Shuffle className="size-4" /> Seed {baseSeed}
        </Button>
        <Button onClick={generate}>
          <PackagePlus className="size-4" /> Generate & add {count} to tray
        </Button>
      </div>
    </div>
  );
}
