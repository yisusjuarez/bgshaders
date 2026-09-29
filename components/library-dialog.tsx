"use client";

import { useState } from "react";
import { Plus, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DirectedPackBuilder } from "@/components/directed-pack-builder";
import { useLanguage } from "@/components/language-provider";
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
import { matchPaletteName } from "@/lib/library/color";
import { buildMatrix, matrixCount, type MatrixAxes } from "@/lib/library/matrix";
import {
  buildRandomBatch,
  DEFAULT_RANDOM_SEED,
  randomBaseSeed,
} from "@/lib/library/random-batch";
import { FAMILY_LABELS } from "@/lib/shader/labels";
import { MOTION_PROFILES } from "@/lib/creative/pack";
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
  onExportPack: () => void;
}

export function LibraryDialog({
  open,
  onOpenChange,
  library,
  currentConfig,
  onAdd,
  onRemove,
  onClear,
  onExportPack,
}: Props) {
  const { t, language } = useLanguage();
  const [section, setSection] = useState<"create" | "tray">("create");
  const [method, setMethod] = useState<"directed" | "matrix" | "random">("directed");
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
    toast.success(language === "es"
      ? `Se ${added === 1 ? "añadió" : "añadieron"} ${added} ${added === 1 ? "loop aleatorio" : "loops aleatorios"} a la bandeja${skipped ? ` · ${skipped} duplicados omitidos` : ""}`
      : `Added ${added} random loop${added === 1 ? "" : "s"} to the tray${skipped ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}`);
    // Fresh seed so a second draw is a different set, not a deduped no-op.
    setRandomSeed(randomBaseSeed());
    setSection("tray");
  };

  const addMatrix = () => {
    const configs = buildMatrix(axes);
    const added = onAdd(configs);
    const skipped = configs.length - added;
    toast.success(language === "es"
      ? `Se ${added === 1 ? "añadió" : "añadieron"} ${added} ${added === 1 ? "loop" : "loops"} a la bandeja${skipped ? ` · ${skipped} duplicados omitidos` : ""}`
      : `Added ${added} loop${added === 1 ? "" : "s"} to the tray${skipped ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}`);
    setSection("tray");
  };

  const addDirectedPack = (configs: ShaderConfig[]) => {
    const added = onAdd(configs);
    const skipped = configs.length - added;
    toast.success(language === "es"
      ? `Se ${added === 1 ? "añadió" : "añadieron"} ${added} ${added === 1 ? "loop" : "loops"} del pack a la bandeja${skipped ? ` · ${skipped} duplicados omitidos` : ""}`
      : `Added ${added} directed-pack loop${added === 1 ? "" : "s"} to the tray${skipped ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}`);
    setSection("tray");
  };

  const addCurrent = () => {
    const added = onAdd([currentConfig]);
    toast(t(added ? "Added to pack tray" : "Already in pack tray"));
    setSection("tray");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("Pack")}</DialogTitle>
          <DialogDescription>
            {t("Create loops, collect them in the tray, then export them together.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <span className="min-w-0 truncate text-sm text-white/70">{currentConfig.name}</span>
          <Button size="sm" onClick={addCurrent}><Plus className="size-4" /> {t("Add current loop")}</Button>
        </div>

        <div className="flex gap-2 rounded-xl bg-white/5 p-1">
          <button type="button" onClick={() => setSection("create")} aria-pressed={section === "create"} className={`flex-1 rounded-lg px-3 py-2 text-sm ${section === "create" ? "bg-white/15 text-white" : "text-white/55"}`}>
            {t("Create pack")}
          </button>
          <button type="button" onClick={() => setSection("tray")} aria-pressed={section === "tray"} className={`flex-1 rounded-lg px-3 py-2 text-sm ${section === "tray" ? "bg-white/15 text-white" : "text-white/55"}`}>
            {t("Tray")} ({library.length})
          </button>
        </div>

        {section === "create" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("How to create")}</Label>
              <Select
                items={[
                  { value: "directed", label: t("Directed Pack") },
                  { value: "random", label: t("Random Batch") },
                  { value: "matrix", label: t("Matrix Batch") },
                ]}
                value={method}
                onValueChange={(value) => value && setMethod(value as typeof method)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="directed">{t("Directed Pack")}</SelectItem>
                  <SelectItem value="random">{t("Random Batch")}</SelectItem>
                  <SelectItem value="matrix">{t("Matrix Batch")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method === "directed" && (
              <DirectedPackBuilder
                key={`${currentConfig.seed}-${currentConfig.motionDNA}-${currentConfig.colors.join("-")}`}
                initialConfig={currentConfig}
                onCreate={addDirectedPack}
              />
            )}
          {/* MATRIX */}
          {method === "matrix" && <div className="space-y-4 pt-2 sm:max-h-[52vh] sm:overflow-y-auto sm:pr-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] leading-5 text-white/65">
              <strong className="text-white">{t("Matrix Batch")}</strong> {t("creates every selected style × speed × palette combination. Use it for systematic catalogs and coverage, not for a tightly art-directed collection.")}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("Styles")}</Label>
                <div className="flex gap-1">
                  <Chip active={false} onClick={() => setFamilies([...FAMILIES])}>{t("All")}</Chip>
                  <Chip active={false} onClick={() => setFamilies([])}>{t("None")}</Chip>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FAMILIES.map((f) => (
                  <Chip key={f} active={families.includes(f)} onClick={() => setFamilies((s) => toggle(s, f))}>
                    {t(FAMILY_LABELS[f])}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("Speeds (cycles per loop)")}</Label>
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
                <Label>{t("Palettes")}</Label>
                <div className="flex gap-1">
                  <Chip active={false} onClick={() => setPalettes(PALETTES.map((p) => p.name))}>{t("All")}</Chip>
                  <Chip active={false} onClick={() => setPalettes([])}>{t("None")}</Chip>
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
                    {t(p.name)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>{t("Seeds per combo")}</Label>
                <Select items={SEEDS_PER_COMBO.map((v) => ({ value: v, label: v }))} value={seedsPerCombo} onValueChange={(v) => v && setSeedsPerCombo(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEEDS_PER_COMBO.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>{t("Duration")}</Label>
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
                {count} {t(count === 1 ? "Loop" : "Loops")}
                {count > SOFT_CAP && t(" · large batch — this can take a while")}
              </span>
              <Button size="sm" onClick={addMatrix} disabled={!canAdd}>
                <Plus className="size-4" />
                {t("Add to tray")}
              </Button>
            </div>
          </div>}

          {/* RANDOM */}
          {method === "random" && <div className="space-y-4 pt-2 sm:max-h-[52vh] sm:overflow-y-auto sm:pr-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] leading-5 text-white/65">
              <strong className="text-white">{t("Random Batch")}</strong> {t("is for discovery: it samples freely from the entire design space instead of following one direction or a fixed grid. A base seed makes the draw reproducible.")}
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>{t("How many")}</Label>
                <Select items={RANDOM_COUNTS.map((v) => ({ value: v, label: v }))} value={randomCount} onValueChange={(v) => v && setRandomCount(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RANDOM_COUNTS.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>{t("Duration")}</Label>
                <Select items={RANDOM_DURATIONS.map((item) => ({ ...item, label: t(item.label) }))} value={randomDuration} onValueChange={(v) => v && setRandomDuration(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RANDOM_DURATIONS.map((d) => (<SelectItem key={d.value} value={d.value}>{t(d.label)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("Base seed")}</Label>
              <div className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] tabular-nums text-white/70">
                  {randomSeed}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setRandomSeed(randomBaseSeed())}>
                  <Shuffle className="size-4" />
                  {t("Reroll")}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {randomTotal} {t(randomTotal === 1 ? "Loop" : "Loops")}
                {randomTotal > SOFT_CAP && t(" · large batch — this can take a while")}
              </span>
              <Button size="sm" onClick={addRandom}>
                <Plus className="size-4" />
                {t("Add to tray")}
              </Button>
            </div>
          </div>}
          </div>
        )}

          {/* TRAY */}
          {section === "tray" && <div className="space-y-2 pt-2 sm:max-h-[52vh] sm:overflow-y-auto sm:pr-1">
            {library.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("The tray is empty. Add the current loop or create a pack.")}
              </p>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={onClear}>
                    <Trash2 className="size-4" />
                    {t("Clear all")}
                  </Button>
                </div>
                {library.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <Swatches colors={c.colors} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] text-white">{c.name}</div>
                      <div className="font-mono text-[10px] tracking-wide text-white/50 uppercase">
                        {t(FAMILY_LABELS[c.family])}
                        {c.secondaryFamily ? ` + ${t(FAMILY_LABELS[c.secondaryFamily])}` : ""} ·{" "}
                        {t(MOTION_PROFILES[c.motionDNA].label)} · {c.speed}× · {c.duration.toFixed(2)}s ·{" "}
                        {t(matchPaletteName(c.colors) ?? "Custom palette")} · {t("Seed")} {c.seed}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      aria-label={t("Remove")}
                      className="grid size-7 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
            {library.length > 0 && <div className="flex justify-end border-t border-white/10 pt-3">
              <Button onClick={onExportPack}>{t("Export pack")} ({library.length})</Button>
            </div>}
          </div>}
      </DialogContent>
    </Dialog>
  );
}
