"use client";

import { useRef, useState } from "react";
import { Layers3, MonitorPlay } from "lucide-react";
import { MotionCards, TempoControls } from "@/components/motion-controls";
import { PaletteEditor } from "@/components/palette-editor";
import { ShaderCanvas } from "@/components/shader-canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  applyMotionDNA,
  BLEND_LABELS,
  durationFromTempo,
} from "@/lib/creative/pack";
import { familyItems } from "@/lib/shader/labels";
import {
  BLEND_MODES,
  type BlendMode,
  type Family,
  type ShaderConfig,
} from "@/lib/shader/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ShaderConfig;
  onChange: (patch: Partial<ShaderConfig>) => void;
}

function MockupPreview({ config }: { config: ShaderConfig }) {
  const phaseRef = useRef(0);
  const [mockup, setMockup] = useState<"projection" | "led" | "immersive">("projection");
  const mockups = [
    { value: "projection" as const, label: "Projection screen" },
    { value: "led" as const, label: "LED stage" },
    { value: "immersive" as const, label: "Immersive room" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {mockups.map((item) => (
          <Button
            key={item.value}
            variant={mockup === item.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => setMockup(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="relative grid h-[min(48dvh,390px)] min-h-56 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-inner">
        {mockup === "projection" && (
          <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_25%,#27272a_0%,#09090b_58%,#000_100%)]">
            <div className="absolute top-[58px] left-1/2 h-[226px] w-[72%] -translate-x-1/2 overflow-hidden border-4 border-zinc-700 bg-black shadow-[0_0_50px_#ffffff18]">
              <ShaderCanvas config={config} playing phaseRef={phaseRef} className="absolute!" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,#0005_100%)]" />
            </div>
            <div className="absolute bottom-8 left-1/2 h-8 w-16 -translate-x-1/2 rounded-md border border-white/15 bg-zinc-700 shadow-[0_-80px_100px_35px_#ffffff10]">
              <div className="absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full bg-white/70 shadow-[0_0_18px_#fff]" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex justify-around px-12 opacity-80">
              {Array.from({ length: 10 }, (_, index) => (
                <i key={index} className="h-7 w-10 rounded-t-full bg-black ring-1 ring-white/5" />
              ))}
            </div>
            <div className="absolute top-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase">
              16:9 projector · dark venue
            </div>
          </div>
        )}

        {mockup === "led" && (
          <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_15%,#292524,#09090b_55%,#000)]">
            <div className="absolute top-5 left-1/2 h-3 w-[88%] -translate-x-1/2 border-y border-zinc-600 bg-[repeating-linear-gradient(90deg,#52525b_0_3px,transparent_3px_30px)]" />
            <div className="absolute top-10 left-1/2 h-[238px] w-[78%] -translate-x-1/2 overflow-hidden border-[6px] border-zinc-800 bg-black shadow-[0_0_60px_#ffffff14]">
              <ShaderCanvas config={config} playing phaseRef={phaseRef} className="absolute!" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#0000_75%,#0003),repeating-linear-gradient(0deg,#fff0_0_3px,#0003_3px_4px)]" />
            </div>
            <div className="absolute bottom-10 left-1/2 h-16 w-[88%] -translate-x-1/2 bg-gradient-to-b from-zinc-800 to-black [transform:perspective(500px)_rotateX(55deg)]" />
            <div className="absolute bottom-8 left-[5%] h-24 w-12 bg-zinc-950 shadow-2xl ring-1 ring-white/10" />
            <div className="absolute right-[5%] bottom-8 h-24 w-12 bg-zinc-950 shadow-2xl ring-1 ring-white/10" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 opacity-90">
              {Array.from({ length: 24 }, (_, index) => (
                <i key={index} className="size-5 rounded-full bg-black" />
              ))}
            </div>
            <div className="absolute top-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase">
              Wide LED wall · live stage
            </div>
          </div>
        )}

        {mockup === "immersive" && (
          <div className="relative h-full w-full overflow-hidden bg-black">
            <div className="absolute inset-7 overflow-hidden bg-zinc-950 shadow-[inset_0_0_80px_#000] [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]">
              <ShaderCanvas config={config} playing phaseRef={phaseRef} className="absolute!" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#0008_0%,transparent_20%,transparent_80%,#0008_100%)]" />
            </div>
            <div className="pointer-events-none absolute inset-7 [clip-path:polygon(0_0,14%_8%,14%_88%,0_100%)] bg-black/35 ring-1 ring-white/20" />
            <div className="pointer-events-none absolute inset-7 [clip-path:polygon(100%_0,86%_8%,86%_88%,100%_100%)] bg-black/35 ring-1 ring-white/20" />
            <div className="pointer-events-none absolute right-7 bottom-7 left-7 h-[28%] origin-bottom bg-gradient-to-b from-white/5 to-black/70 [clip-path:polygon(14%_0,86%_0,100%_100%,0_100%)]" />
            <div className="absolute top-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase">
              Projection-mapped room · 3 surfaces
            </div>
            <div className="absolute bottom-8 left-1/2 h-14 w-5 -translate-x-1/2 rounded-t-full bg-black shadow-[0_0_20px_#000]">
              <i className="absolute -top-3 left-1/2 size-5 -translate-x-1/2 rounded-full bg-black" />
            </div>
          </div>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground">
        Live scale preview for projection and giant-display use. This is a spatial mockup, not a color-calibration tool.
      </p>
    </div>
  );
}

export function LoopDesignerDialog({
  open,
  onOpenChange,
  config,
  onChange,
}: Props) {
  const syncCurrentTempo = (nextBpm: number, nextBeats: number) => {
    onChange({
      bpm: nextBpm,
      beats: nextBeats,
      duration: durationFromTempo(nextBpm, nextBeats),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers3 className="size-5" /> Loop Designer
          </DialogTitle>
          <DialogDescription>
            Edit the single loop currently playing, then preview it in projection and giant-display environments.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="design">
          <TabsList className="w-full">
            <TabsTrigger value="design"><Layers3 /> Design current loop</TabsTrigger>
            <TabsTrigger value="venue"><MonitorPlay /> Venue preview</TabsTrigger>
          </TabsList>
          <TabsContent value="design" className="space-y-5 pt-2 sm:max-h-[70vh] sm:overflow-y-auto sm:pr-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] leading-5 text-white/65">
              You are editing the current loop visible behind this dialog. Changes apply immediately. Use <strong className="text-white">+</strong> in the dock when you want to add this version to the Pack Tray.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Primary layer</Label>
                <Select items={familyItems} value={config.family} onValueChange={(v) => v && onChange({ family: v as Family })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{familyItems.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Secondary layer</Label>
                <Select
                  items={[{ value: "none", label: "None" }, ...familyItems]}
                  value={config.secondaryFamily ?? "none"}
                  onValueChange={(v) => onChange({ secondaryFamily: v === "none" ? null : v as Family })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {familyItems.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <div className="space-y-1.5">
                <Label>Blend mode</Label>
                <Select
                  items={BLEND_MODES.map((mode) => ({ value: mode, label: BLEND_LABELS[mode] }))}
                  value={config.blendMode}
                  onValueChange={(v) => v && onChange({ blendMode: v as BlendMode })}
                  disabled={!config.secondaryFamily}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{BLEND_MODES.map((mode) => <SelectItem key={mode} value={mode}>{BLEND_LABELS[mode]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><Label>Layer amount</Label><span className="font-mono text-[11px]">{Math.round(config.blendAmount * 100)}%</span></div>
                <Slider
                  value={config.blendAmount}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={!config.secondaryFamily}
                  onValueChange={(v) => onChange({ blendAmount: Array.isArray(v) ? v[0] : v })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label>Motion character</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Apply a complete movement profile to the current loop.</p>
              </div>
              <MotionCards
                value={config.motionDNA}
                onChange={(next) => onChange(applyMotionDNA(config, next))}
              />
            </div>

            <TempoControls bpm={config.bpm} beats={config.beats} onChange={syncCurrentTempo} />

            <div className="space-y-2">
              <Label>Palette</Label>
              <PaletteEditor colors={config.colors} onChange={(next) => onChange({ colors: next })} />
            </div>
          </TabsContent>

          <TabsContent value="venue" className="pt-2">
            <MockupPreview config={config} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
