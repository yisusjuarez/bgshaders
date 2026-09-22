"use client";

import { useEffect, useRef, useState } from "react";
import { Package, Plus, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DirectedPackBuilder } from "@/components/directed-pack-builder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadBlob, webCodecsSupported, type ExportSettings } from "@/lib/export/encode";
import { exportLibrary, type GroupBy } from "@/lib/export/library";
import { FPS_OPTIONS, QUALITY_OPTIONS, RESOLUTIONS } from "@/lib/export/presets";
import { matchPaletteName } from "@/lib/library/color";
import { buildMatrix, matrixCount, type MatrixAxes } from "@/lib/library/matrix";
import {
  buildRandomBatch,
  DEFAULT_RANDOM_SEED,
  randomBaseSeed,
} from "@/lib/library/random-batch";
import { FAMILY_LABELS } from "@/lib/shader/labels";
import { PALETTES } from "@/lib/shader/palettes";
import { FAMILIES, type Family, type ShaderConfig } from "@/lib/shader/schema";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 2, 3];
const SEEDS_PER_COMBO = ["1", "2", "3", "4"];
const DURATIONS = ["6", "8", "10", "12"];
const RANDOM_COUNTS = ["5", "10", "25", "50", "100"];
const RANDOM_DURATIONS = [
  { value: "mixed", label: "Mixed" },
  ...DURATIONS.map((v) => ({ value: v, label: `${v}s` })),
];
const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "catalog", label: "Searchable catalog (recommended)" },
  { value: "family", label: "By style (family)" },
  { value: "palette", label: "By palette" },
  { value: "colorFamily", label: "By color" },
  { value: "speed", label: "By speed" },
  { value: "grain", label: "By grain" },
  { value: "duration", label: "By duration" },
  { value: "none", label: "Flat (no folders)" },
];
const SOFT_CAP = 60;

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[12px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        active
          ? "border-white/20 bg-white/15 text-white"
          : "border-white/10 bg-transparent text-white/60 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex overflow-hidden rounded-full">
      {colors.map((c, i) => (
        <span key={i} className="size-3" style={{ backgroundColor: c }} />
      ))}
    </span>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: ShaderConfig[];
  currentConfig: ShaderConfig;
  /** Append configs to the tray; returns how many were actually added (deduped). */
  onAdd: (configs: ShaderConfig[]) => number;
  onRemove: (index: number) => void;
  onClear: () => void;
}

interface BatchProgress {
  clip: number;
  clips: number;
  pct: number;
  packaging: boolean;
}

export function LibraryDialog({
  open,
  onOpenChange,
  library,
  currentConfig,
  onAdd,
  onRemove,
  onClear,
}: Props) {
  const [tab, setTab] = useState("directed");
  // Matrix axes
  const [families, setFamilies] = useState<Family[]>([]);
  const [speeds, setSpeeds] = useState<number[]>([1, 2]);
  const [palettes, setPalettes] = useState<string[]>([]);
  const [seedsPerCombo, setSeedsPerCombo] = useState("1");
  const [matrixDuration, setMatrixDuration] = useState("8");
  // Random draw
  const [randomCount, setRandomCount] = useState("25");
  const [randomDuration, setRandomDuration] = useState("8");
  const [randomSeed, setRandomSeed] = useState(DEFAULT_RANDOM_SEED);
  // Export settings (720p default keeps library memory sane)
  const [resolution, setResolution] = useState("1280x720");
  const [fps, setFps] = useState("30");
  const [quality, setQuality] = useState<"balanced" | "high" | "master">("high");
  const [groupBy, setGroupBy] = useState<GroupBy>("catalog");
  const [overrideFinish, setOverrideFinish] = useState(false);
  const [batchSharpness, setBatchSharpness] = useState(currentConfig.sharpness);
  const [batchGrain, setBatchGrain] = useState(currentConfig.grain);
  const [batchVignette, setBatchVignette] = useState(currentConfig.vignette);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mp4 = webCodecsSupported();

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = progress !== null;
  const axes: MatrixAxes = {
    families,
    speeds,
    paletteNames: palettes,
    seedsPerCombo: Number(seedsPerCombo),
    duration: Number(matrixDuration),
  };
  const count = matrixCount(axes);
  const canAdd = families.length > 0 && speeds.length > 0 && palettes.length > 0;

  const randomTotal = Number(randomCount);

  const addRandom = () => {
    const configs = buildRandomBatch({
      count: randomTotal,
      baseSeed: randomSeed,
      duration: randomDuration === "mixed" ? undefined : Number(randomDuration),
    });
    const added = onAdd(configs);
    const skipped = configs.length - added;
    toast.success(
      `Added ${added} random loop${added === 1 ? "" : "s"} to the tray` +
        (skipped > 0 ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""),
    );
    // Fresh seed so a second draw is a different set, not a deduped no-op.
    setRandomSeed(randomBaseSeed());
    setTab("tray");
  };

  const addMatrix = () => {
    const configs = buildMatrix(axes);
    const added = onAdd(configs);
    const skipped = configs.length - added;
    toast.success(
      `Added ${added} loop${added === 1 ? "" : "s"} to the tray` +
        (skipped > 0 ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""),
    );
    setTab("tray");
  };

  const addDirectedPack = (configs: ShaderConfig[]) => {
    const added = onAdd(configs);
    const skipped = configs.length - added;
    toast.success(
      `Added ${added} directed-pack loop${added === 1 ? "" : "s"} to the tray` +
        (skipped > 0 ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""),
    );
    setTab("tray");
  };

  const runExport = async () => {
    const [width, height] = resolution.split("x").map(Number);
    const settings: ExportSettings = {
      width,
      height,
      fps: Number(fps) as 30 | 60,
      format: mp4 ? "mp4" : "webm",
      quality,
    };
    const abort = new AbortController();
    abortRef.current = abort;
    setProgress({ clip: 0, clips: library.length, pct: 0, packaging: false });
    try {
      const exportConfigs = overrideFinish
        ? library.map((config) => ({
            ...config,
            sharpness: batchSharpness,
            grain: batchGrain,
            vignette: batchVignette,
          }))
        : library;
      const result = await exportLibrary(
        exportConfigs,
        settings,
        { groupBy },
        (clip, clips, pct) =>
          setProgress({
            clip,
            clips,
            pct,
            packaging: clip >= clips && pct >= 100,
          }),
        abort.signal,
      );
      downloadBlob(result);
      toast.success(`Saved ${result.filename}`);
      onOpenChange(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast("Library export cancelled");
      } else {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Library export failed");
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const close = (next: boolean) => {
    if (!next && busy) {
      abortRef.current?.abort();
      return;
    }
    onOpenChange(next);
  };

  const overallPct = progress
    ? progress.clips > 0
      ? Math.min(100, Math.round(((progress.clip + progress.pct / 100) / progress.clips) * 100))
      : 0
    : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pack Builder & Batch Export</DialogTitle>
          <DialogDescription>
            Create multiple loops with one of three methods, curate the shared Tray, then export exactly what is in it as one ZIP.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger className="min-w-0" value="directed">Directed Pack</TabsTrigger>
            <TabsTrigger className="min-w-0" value="matrix">Matrix Batch</TabsTrigger>
            <TabsTrigger className="min-w-0" value="random">Random Batch</TabsTrigger>
            <TabsTrigger className="min-w-0" value="tray">Tray ({library.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="directed">
            <DirectedPackBuilder
              key={`${currentConfig.seed}-${currentConfig.motionDNA}-${currentConfig.colors.join("-")}`}
              initialConfig={currentConfig}
              onCreate={addDirectedPack}
            />
          </TabsContent>

          {/* MATRIX */}
          <TabsContent value="matrix" className="max-h-[52vh] space-y-4 overflow-y-auto pr-1 pt-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] leading-5 text-white/65">
              <strong className="text-white">Matrix Batch</strong> creates every selected style × speed × palette combination. Use it for systematic catalogs and coverage, not for a tightly art-directed collection.
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Styles</Label>
                <div className="flex gap-1">
                  <Chip active={false} onClick={() => setFamilies([...FAMILIES])}>All</Chip>
                  <Chip active={false} onClick={() => setFamilies([])}>None</Chip>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FAMILIES.map((f) => (
                  <Chip key={f} active={families.includes(f)} onClick={() => setFamilies((s) => toggle(s, f))}>
                    {FAMILY_LABELS[f]}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Speeds (cycles per loop)</Label>
              <div className="flex gap-1.5">
                {SPEEDS.map((s) => (
                  <Chip key={s} active={speeds.includes(s)} onClick={() => setSpeeds((p) => toggle(p, s))}>
                    {s}×
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Palettes</Label>
                <div className="flex gap-1">
                  <Chip active={false} onClick={() => setPalettes(PALETTES.map((p) => p.name))}>All</Chip>
                  <Chip active={false} onClick={() => setPalettes([])}>None</Chip>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PALETTES.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPalettes((s) => toggle(s, p.name))}
                    aria-pressed={palettes.includes(p.name)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                      palettes.includes(p.name)
                        ? "border-white/20 bg-white/15 text-white"
                        : "border-white/10 text-white/60 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Swatches colors={p.colors} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>Seeds per combo</Label>
                <Select items={SEEDS_PER_COMBO.map((v) => ({ value: v, label: v }))} value={seedsPerCombo} onValueChange={(v) => v && setSeedsPerCombo(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEEDS_PER_COMBO.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Duration</Label>
                <Select items={DURATIONS.map((v) => ({ value: v, label: `${v}s` }))} value={matrixDuration} onValueChange={(v) => v && setMatrixDuration(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((v) => (<SelectItem key={v} value={v}>{v}s</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {count} loop{count === 1 ? "" : "s"}
                {count > SOFT_CAP && " · large batch — this can take a while"}
              </span>
              <Button size="sm" onClick={addMatrix} disabled={!canAdd}>
                <Plus className="size-4" />
                Add to tray
              </Button>
            </div>
          </TabsContent>

          {/* RANDOM */}
          <TabsContent value="random" className="max-h-[52vh] space-y-4 overflow-y-auto pr-1 pt-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] leading-5 text-white/65">
              <strong className="text-white">Random Batch</strong> is for discovery: it samples freely from the entire design space instead of following one direction or a fixed grid. A base seed makes the draw reproducible.
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>How many</Label>
                <Select items={RANDOM_COUNTS.map((v) => ({ value: v, label: v }))} value={randomCount} onValueChange={(v) => v && setRandomCount(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RANDOM_COUNTS.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Duration</Label>
                <Select items={RANDOM_DURATIONS} value={randomDuration} onValueChange={(v) => v && setRandomDuration(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RANDOM_DURATIONS.map((d) => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Base seed</Label>
              <div className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] tabular-nums text-white/70">
                  {randomSeed}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setRandomSeed(randomBaseSeed())}>
                  <Shuffle className="size-4" />
                  Reroll
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {randomTotal} loop{randomTotal === 1 ? "" : "s"}
                {randomTotal > SOFT_CAP && " · large batch — this can take a while"}
              </span>
              <Button size="sm" onClick={addRandom}>
                <Plus className="size-4" />
                Add to tray
              </Button>
            </div>
          </TabsContent>

          {/* TRAY */}
          <TabsContent value="tray" className="max-h-[52vh] space-y-2 overflow-y-auto pr-1 pt-2">
            {library.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                The tray is empty. Create a Directed Pack, generate a Matrix or Random
                Batch, or add the current loop with + in the dock.
              </p>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
                    <Trash2 className="size-4" />
                    Clear all
                  </Button>
                </div>
                {library.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <Swatches colors={c.colors} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] text-white">{c.name}</div>
                      <div className="font-mono text-[10px] tracking-wide text-white/50 uppercase">
                        {FAMILY_LABELS[c.family]}
                        {c.secondaryFamily ? ` + ${FAMILY_LABELS[c.secondaryFamily]}` : ""} ·{" "}
                        {c.motionDNA} · {c.speed}× · {c.duration.toFixed(2)}s ·{" "}
                        {matchPaletteName(c.colors) ?? "custom"} · seed {c.seed}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      disabled={busy}
                      aria-label="Remove"
                      className="grid size-7 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Shared export footer */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div>
            <div className="text-[13px] font-medium text-white">Export the Tray</div>
            <p className="text-[11px] text-muted-foreground">These settings apply to every loop currently in the Tray, regardless of how it was created.</p>
          </div>
          <div className="grid grid-cols-[1.1fr_.55fr_1fr_1.35fr] gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label>Resolution</Label>
              <Select items={RESOLUTIONS} value={resolution} onValueChange={(v) => v && setResolution(v)} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>FPS</Label>
              <Select items={FPS_OPTIONS} value={fps} onValueChange={(v) => v && setFps(v)} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FPS_OPTIONS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Quality</Label>
              <Select items={QUALITY_OPTIONS.map((option) => ({ ...option }))} value={quality} onValueChange={(value) => value && setQuality(value as typeof quality)} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Pack organization</Label>
              <Select items={GROUP_OPTIONS} value={groupBy} onValueChange={(v) => v && setGroupBy(v as GroupBy)} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-4 text-muted-foreground">
                {groupBy === "catalog"
                  ? "Adds catalog.html, index.csv, searchable filenames and full metadata. Filter the same loop by several attributes."
                  : "Legacy one-axis folders. The ZIP still includes the searchable catalog and CSV index."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-medium text-white">One finish for the whole pack</div>
                <p className="text-[10px] text-muted-foreground">Optional: normalize every exported loop without changing the Tray originals.</p>
              </div>
              <Switch
                checked={overrideFinish}
                disabled={busy}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setBatchSharpness(currentConfig.sharpness);
                    setBatchGrain(currentConfig.grain);
                    setBatchVignette(currentConfig.vignette);
                  }
                  setOverrideFinish(checked);
                }}
              />
            </div>
            {overrideFinish && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <BatchFinishSlider label="Sharpness" value={batchSharpness} min={-1} max={1} step={0.05} display={batchSharpness < -0.05 ? `Soft ${Math.round(-batchSharpness * 100)}%` : batchSharpness > 0.05 ? `Crisp ${Math.round(batchSharpness * 100)}%` : "Neutral"} onChange={setBatchSharpness} />
                <BatchFinishSlider label="Grain" value={batchGrain} min={0} max={0.2} step={0.005} display={batchGrain.toFixed(3)} onChange={setBatchGrain} />
                <BatchFinishSlider label="Vignette" value={batchVignette} min={0} max={1} step={0.01} display={`${Math.round(batchVignette * 100)}%`} onChange={setBatchVignette} />
              </div>
            )}
          </div>

          {busy && progress && (
            <div className="space-y-1.5">
              <Progress value={overallPct} />
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {progress.packaging
                  ? "Packaging ZIP…"
                  : `Rendering clip ${Math.min(progress.clip + 1, progress.clips)}/${progress.clips} · ${progress.pct}%`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {busy ? (
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              Cancel export
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={runExport} disabled={library.length === 0}>
                <Package className="size-4" />
                Download tray ZIP ({library.length})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchFinishSlider({ label, value, min, max, step, display, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-white/65">
        <span>{label}</span><span className="font-mono text-white/80">{display}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} aria-label={`Batch ${label}`} onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)} />
    </div>
  );
}
