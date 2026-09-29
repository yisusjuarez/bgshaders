"use client";

import { Minus, Plus, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { matchPaletteName } from "@/lib/library/color";
import { PALETTES } from "@/lib/shader/palettes";
import { useLanguage } from "@/components/language-provider";

interface Props {
  colors: string[];
  onChange: (colors: string[]) => void;
  compact?: boolean;
}

export function PaletteEditor({ colors, onChange, compact = false }: Props) {
  const { t } = useLanguage();
  const selected = matchPaletteName(colors) ?? "custom";
  const items = [
    { value: "custom", label: t("Custom palette") },
    ...PALETTES.map((palette) => ({ value: palette.name, label: t(palette.name) })),
  ];

  const updateColor = (index: number, color: string) => {
    const next = [...colors];
    next[index] = color;
    onChange(next);
  };

  const shuffle = () => {
    const candidates = PALETTES.filter((p) => p.colors.join() !== colors.join());
    const palette = candidates[Math.floor(Math.random() * candidates.length)];
    onChange([...palette.colors]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          items={items}
          value={selected}
          onValueChange={(value) => {
            const palette = PALETTES.find((p) => p.name === value);
            if (palette) onChange([...palette.colors]);
          }}
        >
          <SelectTrigger className="min-w-0 flex-1 border-white/15 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">{t("Custom palette")}</SelectItem>
            {PALETTES.map((palette) => (
              <SelectItem key={palette.name} value={palette.name}>
                {t(palette.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-white/70 hover:bg-white/10 hover:text-white"
          onClick={shuffle}
          aria-label={t("Shuffle palette")}
        >
          <Shuffle className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        {colors.map((color, index) => (
          <label
            key={`${index}-${color}`}
            className="relative min-w-0 flex-1 cursor-pointer overflow-hidden rounded-md border border-white/15"
            title={`${t("Color")} ${index + 1}: ${color}`}
          >
            <span
              className={compact ? "block h-7" : "block h-10"}
              style={{ backgroundColor: color }}
            />
            <input
              type="color"
              value={color}
              onChange={(event) => updateColor(index, event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={`${t("Palette color")} ${index + 1}`}
            />
          </label>
        ))}
        {colors.length < 6 && (
          <Button
            variant="outline"
            size="icon-sm"
            className="border-white/15 bg-transparent text-white/70"
            onClick={() => onChange([...colors, colors.at(-1) ?? "#ffffff"])}
            aria-label={t("Add color")}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
        {colors.length > 2 && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/60"
            onClick={() => onChange(colors.slice(0, -1))}
            aria-label={t("Remove last color")}
          >
            <Minus className="size-3.5" />
          </Button>
        )}
      </div>
      {!compact && (
        <p className="font-mono text-[10px] text-white/45">
          {t("Click any swatch to choose a custom color · 2–6 colors")}
        </p>
      )}
    </div>
  );
}
