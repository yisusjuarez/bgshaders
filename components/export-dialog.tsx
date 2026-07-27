"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
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
import {
  downloadBlob,
  exportVideo,
  webCodecsSupported,
  type ExportSettings,
} from "@/lib/export/encode";
import { FPS_OPTIONS, RESOLUTIONS } from "@/lib/export/presets";
import type { ShaderConfig } from "@/lib/shader/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ShaderConfig;
}

export function ExportDialog({ open, onOpenChange, config }: Props) {
  const [resolution, setResolution] = useState("1920x1080");
  const [fps, setFps] = useState("30");
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mp4 = webCodecsSupported();

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = progress !== null;
  const [width, height] = resolution.split("x").map(Number);
  const frames = Math.round(config.duration * Number(fps));

  const start = async () => {
    const settings: ExportSettings = {
      width,
      height,
      fps: Number(fps) as 30 | 60,
      format: mp4 ? "mp4" : "webm",
    };
    const abort = new AbortController();
    abortRef.current = abort;
    setProgress(0);
    try {
      const result = await exportVideo(
        config,
        settings,
        (done, total) => setProgress(Math.round((done / total) * 100)),
        abort.signal,
      );
      downloadBlob(result);
      toast.success(`Saved ${result.filename}`);
      onOpenChange(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast("Export cancelled");
      } else {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Export failed");
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
          <DialogTitle>Export loop video</DialogTitle>
          <DialogDescription>
            Rendered frame by frame — exactly {frames} frames over{" "}
            {config.duration}s, so the last frame hands off to the first with no
            seam.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select
              items={RESOLUTIONS}
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
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frame rate</Label>
            <Select
              items={FPS_OPTIONS}
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
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            {mp4
              ? `MP4 · H.264 · ${width}×${height} @ ${fps} fps`
              : `WebM (this browser has no WebCodecs; realtime capture) · ${width}×${height}`}
          </p>
          {busy && (
            <div className="space-y-1.5">
              <Progress value={progress} />
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                Rendering… {progress}%
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
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={start}>
                <Download className="size-4" />
                Export video
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
