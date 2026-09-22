"use client";

import { useState } from "react";
import { Settings2, Sparkles } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_MODELS,
  getApiKey,
  getModel,
  setApiKey,
  setModel,
} from "@/lib/settings";
import type { ShaderConfig } from "@/lib/shader/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (config: ShaderConfig) => void;
}

const IDEAS = [
  "calm ocean at dawn, very slow",
  "cyberpunk neon rain",
  "warm sunset for a wedding site",
  "deep space nebula, mysterious",
];

export function AiDialog({ open, onOpenChange, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("create");
  const [key, setKey] = useState(getApiKey);
  const [model, setModelState] = useState(getModel);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setKey(getApiKey());
      setModelState(getModel());
      setTab("create");
    }
    onOpenChange(next);
  };

  const saveSettings = () => {
    setApiKey(key.trim());
    setModel(model);
    setKey(getApiKey());
    toast.success("AI configuration saved");
    setTab("create");
  };

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          apiKey: key.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error(data.error ?? "Add an API key in AI configuration");
          setTab("settings");
        } else {
          toast.error(data.error ?? "Generation failed");
        }
        return;
      }
      onGenerated(data.config as ShaderConfig);
      toast.success(`“${data.config.name}” is playing`);
      handleOpenChange(false);
    } catch {
      toast.error("Network error while generating");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate with AI</DialogTitle>
          <DialogDescription>
            Describe a mood, a scene, or a use case — the model designs a
            palette and motion for it. Every result loops perfectly.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="create"><Sparkles /> Create</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 /> AI configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 pt-2">
            <Textarea
              placeholder="e.g. immersive blue light for a large projection wall"
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
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={busy || !prompt.trim()}>
                <Sparkles className="size-4" />
                {busy ? "Generating…" : "Generate loop"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="or-key">OpenRouter API key</Label>
              <Input
                id="or-key"
                type="password"
                placeholder="sk-or-…"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Stored only in this browser. Leave empty to use the server key when configured.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select items={AI_MODELS} value={model} onValueChange={(value) => value && setModelState(value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setTab("create")}>Back</Button>
              <Button onClick={saveSettings}>Save configuration</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
