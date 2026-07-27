"use client";

import { useState } from "react";
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
import { AI_MODELS, getApiKey, getModel, setApiKey, setModel } from "@/lib/settings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const [key, setKey] = useState(getApiKey);
  const [model, setModelState] = useState(getModel);

  // Discard unsaved edits on any close (Escape, X, Cancel) so reopening
  // always shows what's actually stored.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setKey(getApiKey());
      setModelState(getModel());
    }
    onOpenChange(next);
  };

  const save = () => {
    setApiKey(key.trim());
    setModel(model);
    setKey(getApiKey());
    toast.success("Settings saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI settings</DialogTitle>
          <DialogDescription>
            The AI generator calls OpenRouter. Your key is stored in this
            browser only and sent only with generate requests.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="or-key">OpenRouter API key</Label>
            <Input
              id="or-key"
              type="password"
              placeholder="sk-or-…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Get one at openrouter.ai/keys. Leave empty to use the server’s
              OPENROUTER_API_KEY if configured.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              items={AI_MODELS}
              value={model}
              onValueChange={(v) => v && setModelState(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
