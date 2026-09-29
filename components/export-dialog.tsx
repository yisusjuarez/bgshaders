"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  downloadBlob,
  exportVideo,
  webCodecsSupported,
  type ExportSettings,
} from "@/lib/export/encode";
import { exportLibrary, type GroupBy } from "@/lib/export/library";
import { FPS_OPTIONS, QUALITY_OPTIONS, RESOLUTIONS } from "@/lib/export/presets";
import type { ShaderConfig } from "@/lib/shader/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ShaderConfig;
  library: ShaderConfig[];
  initialTarget: "current" | "pack";
}

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

export function ExportDialog({ open, onOpenChange, config, library, initialTarget }: Props) {
  const { t } = useLanguage();
  const [target, setTarget] = useState<"current" | "pack">(initialTarget);
  const [resolution, setResolution] = useState(initialTarget === "pack" ? "1280x720" : "1920x1080");
  const [fps, setFps] = useState("30");
  const [quality, setQuality] = useState<"balanced" | "high" | "master">("high");
  const [sharpness, setSharpness] = useState<number | null>(null);
  const [grain, setGrain] = useState<number | null>(null);
  const [vignette, setVignette] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("catalog");
  const [overridePackFinish, setOverridePackFinish] = useState(false);
  const [packSharpness, setPackSharpness] = useState(config.sharpness);
  const [packGrain, setPackGrain] = useState(config.grain);
  const [packVignette, setPackVignette] = useState(config.vignette);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mp4 = webCodecsSupported();

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = progress !== null;
  const pack = target === "pack" && library.length > 0;
  const [width, height] = resolution.split("x").map(Number);
  const frames = Math.round(config.duration * Number(fps));
  const exportConfig: ShaderConfig = {
    ...config,
    sharpness: sharpness ?? config.sharpness,
    grain: grain ?? config.grain,
    vignette: vignette ?? config.vignette,
  };
  const customFinish = sharpness !== null || grain !== null || vignette !== null;

  const start = async () => {
    const packConfigs = overridePackFinish
      ? library.map((item) => ({
          ...item,
          sharpness: packSharpness,
          grain: packGrain,
          vignette: packVignette,
        }))
      : library;
    const settings: ExportSettings = {
      width,
      height,
      fps: Number(fps) as 30 | 60,
      format: mp4 ? "mp4" : "webm",
      quality,
    };
    const abort = new AbortController();
    abortRef.current = abort;
    setProgress(0);
    try {
      const result = pack
        ? await exportLibrary(
            packConfigs,
            settings,
            { groupBy },
            (clip, clips, pct) => setProgress(Math.round(((clip + pct / 100) / clips) * 100)),
            abort.signal,
          )
        : await exportVideo(
            exportConfig,
            settings,
            (done, total) => setProgress(Math.round((done / total) * 100)),
            abort.signal,
          );
      downloadBlob(result);
      toast.success(`${t("Saved")} ${result.filename}`);
      onOpenChange(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast(t("Export cancelled"));
      } else {
        console.error(e);
        toast.error(e instanceof Error ? t(e.message) : t("Export failed"));
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const close = (next: boolean) => {
    if (!next && busy) {
      abortRef.current?.abort();
      return; // dialog closes after the abort settles
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Export")}</DialogTitle>
          <DialogDescription>
            {pack
              ? `${library.length} ${t(library.length === 1 ? "Loop" : "Loops")} · ${t("One ZIP with videos and a searchable catalog.")}`
              : `${t("Rendered frame by frame — exactly")} ${frames} ${t("frames over")} ${config.duration}s. ${t("The last frame joins the first seamlessly.")}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
          <button type="button" onClick={() => setTarget("current")} aria-pressed={!pack} disabled={busy} className={`rounded-lg px-3 py-2 text-sm ${!pack ? "bg-white/15 text-white" : "text-white/55"}`}>
            {t("Current video")}
          </button>
          <button type="button" onClick={() => { setTarget("pack"); if (resolution === "1920x1080") setResolution("1280x720"); }} aria-pressed={pack} disabled={busy || library.length === 0} className={`rounded-lg px-3 py-2 text-sm ${pack ? "bg-white/15 text-white" : "text-white/55"} disabled:opacity-40`}>
            {t("Pack ZIP")} ({library.length})
          </button>
        </div>
        {library.length === 0 && <p className="text-xs text-muted-foreground">{t("Add loops in Pack to enable ZIP export.")}</p>}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("Resolution")}</Label>
            <Select
              items={RESOLUTIONS.map((item) => ({ ...item, label: t(item.label) }))}
              value={resolution}
              onValueChange={(v) => v && setResolution(v)}
              disabled={busy}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {t(r.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!pack && <details className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <summary className="cursor-pointer text-sm font-medium">{t("Fine tune exported video")}</summary>
            <div className="mt-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label>{t("Output finishing")}</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t("Overrides only this exported file; the current loop stays unchanged.")}</p>
              </div>
              {customFinish && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => { setSharpness(null); setGrain(null); setVignette(null); }}
                >
                  {t("Use design values")}
                </Button>
              )}
            </div>
            <ExportSlider
              label={t("Sharpness")}
              value={exportConfig.sharpness}
              min={-1}
              max={1}
              step={0.05}
              display={exportConfig.sharpness < -0.05 ? `${t("Soft")} ${Math.round(-exportConfig.sharpness * 100)}%` : exportConfig.sharpness > 0.05 ? `${t("Crisp")} ${Math.round(exportConfig.sharpness * 100)}%` : t("Neutral")}
              disabled={busy}
              onChange={setSharpness}
            />
            <ExportSlider label={t("Grain")} value={exportConfig.grain} min={0} max={0.2} step={0.005} display={exportConfig.grain.toFixed(3)} disabled={busy} onChange={setGrain} />
            <ExportSlider label={t("Vignette")} value={exportConfig.vignette} min={0} max={1} step={0.01} display={`${Math.round(exportConfig.vignette * 100)}%`} disabled={busy} onChange={setVignette} />
            </div>
          </details>}
          {pack && <details className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <summary className="cursor-pointer text-sm font-medium">{t("Pack options")}</summary>
            <div className="mt-3 space-y-4">
              <div className="space-y-2">
                <Label>{t("Pack organization")}</Label>
                <Select items={GROUP_OPTIONS.map((item) => ({ ...item, label: t(item.label) }))} value={groupBy} onValueChange={(value) => value && setGroupBy(value as GroupBy)} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{t(item.label)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>{t("One finish for the whole pack")}</Label>
                  <p className="text-xs text-muted-foreground">{t("Optional: normalize every exported loop without changing the Tray originals.")}</p>
                </div>
                <Switch checked={overridePackFinish} onCheckedChange={setOverridePackFinish} disabled={busy} />
              </div>
              {overridePackFinish && <div className="space-y-3">
                <ExportSlider label={t("Sharpness")} value={packSharpness} min={-1} max={1} step={0.05} display={packSharpness < -0.05 ? `${t("Soft")} ${Math.round(-packSharpness * 100)}%` : packSharpness > 0.05 ? `${t("Crisp")} ${Math.round(packSharpness * 100)}%` : t("Neutral")} disabled={busy} onChange={setPackSharpness} />
                <ExportSlider label={t("Grain")} value={packGrain} min={0} max={0.2} step={0.005} display={packGrain.toFixed(3)} disabled={busy} onChange={setPackGrain} />
                <ExportSlider label={t("Vignette")} value={packVignette} min={0} max={1} step={0.01} display={`${Math.round(packVignette * 100)}%`} disabled={busy} onChange={setPackVignette} />
              </div>}
            </div>
          </details>}
          <div className="space-y-2">
            <Label>{t("Frame rate")}</Label>
            <Select
              items={FPS_OPTIONS.map((item) => ({ ...item, label: t(item.label) }))}
              value={fps}
              onValueChange={(v) => v && setFps(v)}
              disabled={busy}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FPS_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {t(f.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("Encoding quality")}</Label>
            <Select
              items={QUALITY_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
              value={quality}
              onValueChange={(value) => value && setQuality(value as typeof quality)}
              disabled={busy}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                  {QUALITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{t(option.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            {mp4
              ? `MP4 · H.264 · ${width}×${height} @ ${fps} fps · ${t(quality)}`
              : `WebM (${t("this browser has no WebCodecs; realtime capture")}) · ${width}×${height} · ${t(quality)}`}
          </p>
          {busy && (
            <div className="space-y-1.5">
              <Progress value={progress} />
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {t(pack ? "Exporting pack…" : "Rendering…")} {progress}%
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          {busy ? (
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              {t("Cancel export")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("Close")}
              </Button>
              <Button onClick={start}>
                <Download className="size-4" />
                {t(pack ? "Download pack ZIP" : "Export video")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExportSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/65">{label}</span>
        <span className="font-mono text-white/80">{display}</span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </div>
  );
}
