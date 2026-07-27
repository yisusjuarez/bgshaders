"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { getApiKey, getModel } from "@/lib/settings";
import type { ShaderConfig } from "@/lib/shader/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (config: ShaderConfig) => void;
  onNeedSettings: () => void;
}

const IDEAS = [
  "calm ocean at dawn, very slow",
  "cyberpunk neon rain",
  "warm sunset for a wedding site",
  "deep space nebula, mysterious",
];

export function AiDialog({ open, onOpenChange, onGenerated, onNeedSettings }: Props) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          apiKey: getApiKey() || undefined,
          model: getModel(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error(data.error ?? "API key needed", {
            action: { label: "Open settings", onClick: onNeedSettings },
          });
        } else {
          toast.error(data.error ?? "Generation failed");
        }
        return;
      }
      onGenerated(data.config as ShaderConfig);
      toast.success(`“${data.config.name}” is playing`);
      onOpenChange(false);
    } catch {
      toast.error("Network error while generating");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate with AI</DialogTitle>
          <DialogDescription>
            Describe a mood, a scene, or a use case — the model designs a
            palette and motion for it. Every result loops perfectly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea
            placeholder="e.g. misty forest at night with faint green light"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
            rows={3}
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setPrompt(idea)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={busy || !prompt.trim()}>
            <Sparkles className="size-4" />
            {busy ? "Generating…" : "Generate loop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
