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
import { FPS_OPTIONS, QUALITY_OPTIONS, RESOLUTIONS } from "@/lib/export/presets";
import type { ShaderConfig } from "@/lib/shader/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ShaderConfig;
}

export function ExportDialog({ open, onOpenChange, config }: Props) {
  const { t } = useLanguage();
  const [resolution, setResolution] = useState("1920x1080");
  const [fps, setFps] = useState("30");
  const [quality, setQuality] = useState<"balanced" | "high" | "master">("high");
  const [sharpness, setSharpness] = useState<number | null>(null);
  const [grain, setGrain] = useState<number | null>(null);
  const [vignette, setVignette] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mp4 = webCodecsSupported();

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = progress !== null;
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
      const result = await exportVideo(
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
          <DialogTitle>{t("Export loop video")}</DialogTitle>
          <DialogDescription>
            {t("Rendered frame by frame — exactly")} {frames} {t("frames over")} {config.duration}s. {t("The last frame joins the first seamlessly.")}
          </DialogDescription>
        </DialogHeader>
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
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
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
              ? `MP4 · H.264 · ${width}×${height} @ ${fps} fps · ${quality}`
              : `WebM (${t("this browser has no WebCodecs; realtime capture")}) · ${width}×${height} · ${t(quality)}`}
          </p>
          {busy && (
            <div className="space-y-1.5">
              <Progress value={progress} />
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {t("Rendering…")} {progress}%
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
                {t("Export video")}
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
