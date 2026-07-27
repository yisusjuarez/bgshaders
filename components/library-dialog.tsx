"use client";

import { useEffect, useRef, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { FPS_OPTIONS, RESOLUTIONS } from "@/lib/export/presets";
import { matchPaletteName } from "@/lib/library/color";
import { buildMatrix, matrixCount, type MatrixAxes } from "@/lib/library/matrix";
import { FAMILY_LABELS } from "@/lib/shader/labels";
import { PALETTES } from "@/lib/shader/palettes";
import { FAMILIES, type Family, type ShaderConfig } from "@/lib/shader/schema";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 2, 3];
const SEEDS_PER_COMBO = ["1", "2", "3", "4"];
const DURATIONS = ["6", "8", "10", "12"];
const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "family", label: "By style (family)" },
  { value: "palette", label: "By palette" },
  { value: "colorFamily", label: "By color" },
  { value: "speed", label: "By speed" },
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
  onAdd,
  onRemove,
  onClear,
}: Props) {
  const [tab, setTab] = useState("matrix");
  // Matrix axes
  const [families, setFamilies] = useState<Family[]>([]);
  const [speeds, setSpeeds] = useState<number[]>([1, 2]);
  const [palettes, setPalettes] = useState<string[]>([]);
  const [seedsPerCombo, setSeedsPerCombo] = useState("1");
  const [matrixDuration, setMatrixDuration] = useState("8");
  // Export settings (720p default keeps library memory sane)
  const [resolution, setResolution] = useState("1280x720");
  const [fps, setFps] = useState("30");
  const [groupBy, setGroupBy] = useState<GroupBy>("family");
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

  const runExport = async () => {
    const [width, height] = resolution.split("x").map(Number);
    const settings: ExportSettings = {
      width,
      height,
      fps: Number(fps) as 30 | 60,
      format: mp4 ? "mp4" : "webm",
    };
    const abort = new AbortController();
    abortRef.current = abort;
    setProgress({ clip: 0, clips: library.length, pct: 0, packaging: false });
    try {
      const result = await exportLibrary(
        library,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Library batch export</DialogTitle>
          <DialogDescription>
            Generate loops across styles, speeds and palettes, curate a tray, and
            download the whole set as one ZIP — folders per group, plus metadata.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="matrix">Matrix</TabsTrigger>
            <TabsTrigger value="tray">Tray ({library.length})</TabsTrigger>
          </TabsList>

          {/* MATRIX */}
          <TabsContent value="matrix" className="max-h-[52vh] space-y-4 overflow-y-auto pr-1 pt-2">
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

          {/* TRAY */}
          <TabsContent value="tray" className="max-h-[52vh] space-y-2 overflow-y-auto pr-1 pt-2">
            {library.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                The tray is empty. Generate loops in the Matrix tab, or add the current
                loop from the dock.
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
                        {FAMILY_LABELS[c.family]} · {c.speed}× · {c.duration}s ·{" "}
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
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Resolution</Label>
              <Select items={RESOLUTIONS} value={resolution} onValueChange={(v) => v && setResolution(v)} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24 space-y-1.5">
              <Label>FPS</Label>
              <Select items={FPS_OPTIONS} value={fps} onValueChange={(v) => v && setFps(v)} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FPS_OPTIONS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Group into folders</Label>
              <Select items={GROUP_OPTIONS} value={groupBy} onValueChange={(v) => v && setGroupBy(v as GroupBy)} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((g) => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
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
                Download library ({library.length})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
