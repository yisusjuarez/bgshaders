"use client";

import { useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FineTuneControls } from "@/components/fine-tune-controls";
import { useLanguage } from "@/components/language-provider";
import { PaletteEditor } from "@/components/palette-editor";
import { TempoControls } from "@/components/motion-controls";
import { LoopStylePicker } from "@/components/loop-style-picker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyMotionDNA, BLEND_LABELS, durationFromTempo, MOTION_PROFILES } from "@/lib/creative/pack";
import { catalogConfig, curatedConfig, isCreativeFamily } from "@/lib/shader/catalog";
import { categoryForFamily, LOOP_CATEGORIES } from "@/lib/shader/categories";
import { FAMILY_LABELS, familyItems } from "@/lib/shader/labels";
import { BLEND_MODES, MOTION_DNAS, type BlendMode, type Family, type MotionDNA, type ShaderConfig } from "@/lib/shader/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ShaderConfig;
  onChange: (patch: Partial<ShaderConfig>) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-white/10 pt-4">
      <h3 className="font-mono text-[10px] tracking-[0.18em] text-white/50 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function CollapsibleSection({ title, value, children }: { title: string; value: string; children: React.ReactNode }) {
  return (
    <Accordion>
      <AccordionItem value={value} className="border-t border-white/10">
        <AccordionTrigger className="items-center py-4 font-mono text-[10px] tracking-[0.18em] text-white/50 uppercase hover:no-underline">
          {title}
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function LoopDesignerDialog({ open, onOpenChange, config, onChange }: Props) {
  const { t } = useLanguage();
  const [browseOpen, setBrowseOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectEscapeEvent = useRef<Event | null>(null);
  const category = categoryForFamily(config.family);
  const localizedFamilies = familyItems.map((item) => ({ ...item, label: t(item.label) }));
  const categoryItems = LOOP_CATEGORIES.map((item) => ({ value: item.value, label: t(item.label) }));
  const typeItems = category.families.map((family) => ({ value: family, label: t(FAMILY_LABELS[family]) }));
  const tempoDuration = durationFromTempo(config.bpm, config.beats);
  const validTempoDuration = tempoDuration >= 2 && tempoDuration <= 30;

  const selectFamily = (family: Family) => onChange({ family });
  const restoreStyle = () => {
    const defaults = isCreativeFamily(config.family)
      ? curatedConfig(config.family)
      : catalogConfig(config.seed, config.family);
    onChange({ ...defaults, name: config.name, duration: config.duration, bpm: config.bpm, beats: config.beats });
  };

  return (
    <Dialog open={open} onOpenChange={(next, details) => {
      // Select popups are portaled; dismiss their menu before the side panel.
      if (!next && details.reason === "escape-key" && (details.event === selectEscapeEvent.current || panelRef.current?.querySelector('[data-slot="select-trigger"][aria-expanded="true"]'))) {
        details.cancel();
        details.allowPropagation();
        return;
      }
      onOpenChange(next);
    }} modal={false} disablePointerDismissal>
      <DialogContent
        ref={panelRef}
        onKeyDownCapture={(event) => {
          // Remember the event before Select's document listener changes its state.
          if (event.key === "Escape" && panelRef.current?.querySelector('[data-slot="select-trigger"][aria-expanded="true"]')) selectEscapeEvent.current = event.nativeEvent;
        }}
        showOverlay={false}
        className="top-[max(5rem,env(safe-area-inset-top))] right-3 bottom-[calc(8rem+env(safe-area-inset-bottom))] left-auto flex w-80 max-w-[calc(100%-1.5rem)] max-h-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden bg-zinc-950/90 p-0 shadow-2xl backdrop-blur-xl sm:top-20 sm:right-5 sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:max-w-xs"
      >
        <DialogHeader className="shrink-0 p-4 pr-10">
          <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="size-5" /> {t("Edit loop")}</DialogTitle>
          <DialogDescription>{t("Customize the current loop. Changes apply immediately.")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="loop-category">{t("Category")}</Label>
                <Select items={categoryItems} value={category.value} onValueChange={(value) => {
                  const next = LOOP_CATEGORIES.find((item) => item.value === value);
                  if (next) selectFamily(next.families[0]);
                }}>
                  <SelectTrigger id="loop-category" aria-label={t("Category")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{categoryItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loop-type">{t("Loop type")}</Label>
                <Select items={typeItems} value={config.family} onValueChange={(value) => value && selectFamily(value as Family)}>
                  <SelectTrigger id="loop-type" aria-label={t("Loop type")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{typeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <details onToggle={(event) => setBrowseOpen(event.currentTarget.open)} className="rounded-lg border border-white/10 p-2.5">
                <summary className="cursor-pointer text-xs text-white/70">{t("Choose visually")} · {category.families.length}</summary>
                {browseOpen && <div className="mt-3"><LoopStylePicker families={category.families} currentFamily={config.family} onSelect={selectFamily} /></div>}
              </details>
              <Button aria-label={t("Restore style defaults")} variant="outline" size="sm" className="w-full" onClick={restoreStyle}>{t("Restore style defaults")}</Button>
            </div>

            <Section title={t("Fine tune")}><FineTuneControls config={config} onChange={onChange} /></Section>

            <Section title={t("Palette")}><PaletteEditor compact colors={config.colors} onChange={(colors) => onChange({ colors })} /></Section>

            <CollapsibleSection title={t("Layers")} value="layers">
              <div className="space-y-1.5">
                <Label htmlFor="secondary-layer">{t("Secondary layer")}</Label>
                <Select
                  items={[{ value: "none", label: t("None") }, ...localizedFamilies]}
                  value={config.secondaryFamily ?? "none"}
                  onValueChange={(value) => value && onChange({ secondaryFamily: value === "none" ? null : value as Family })}
                >
                  <SelectTrigger id="secondary-layer" aria-label={t("Secondary layer")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">{[{ value: "none", label: t("None") }, ...localizedFamilies].map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blend-mode">{t("Blend mode")}</Label>
                <Select
                  items={BLEND_MODES.map((mode) => ({ value: mode, label: t(BLEND_LABELS[mode]) }))}
                  value={config.blendMode} disabled={!config.secondaryFamily}
                  onValueChange={(value) => value && onChange({ blendMode: value as BlendMode })}
                >
                  <SelectTrigger id="blend-mode" aria-label={t("Blend mode")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{BLEND_MODES.map((mode) => <SelectItem key={mode} value={mode}>{t(BLEND_LABELS[mode])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><Label>{t("Layer amount")}</Label><span className="font-mono text-[11px] text-white/70">{Math.round(config.blendAmount * 100)}%</span></div>
                <Slider aria-label={t("Layer amount")} value={config.blendAmount} min={0} max={1} step={0.01} disabled={!config.secondaryFamily} onValueChange={(value) => onChange({ blendAmount: Array.isArray(value) ? value[0] : value })} />
              </div>
            </CollapsibleSection>

            <Section title={t("Motion character")}>
              <Select
                items={MOTION_DNAS.map((dna) => ({ value: dna, label: t(MOTION_PROFILES[dna].label) }))}
                value={config.motionDNA}
                onValueChange={(value) => value && onChange(applyMotionDNA(config, value as MotionDNA))}
              >
                <SelectTrigger aria-label={t("Motion character")} className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{MOTION_DNAS.map((dna) => <SelectItem key={dna} value={dna}>{t(MOTION_PROFILES[dna].label)}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] leading-4 text-white/40">{t("Apply a complete movement profile to the current loop.")}</p>
            </Section>

            <CollapsibleSection title={t("Tempo")} value="tempo">
              <TempoControls bpm={config.bpm} beats={config.beats} onChange={(bpm, beats) => onChange({ bpm, beats })} />
              <Button aria-label={t("Apply tempo duration")} variant="outline" size="sm" className="w-full" disabled={!validTempoDuration} onClick={() => onChange({ duration: tempoDuration })}>{t("Apply tempo duration")}</Button>
              <p className="text-[10px] leading-4 text-white/40">{t("Apply BPM and beats to the duration, or set seconds directly in Fine tune.")}</p>
            </CollapsibleSection>

            <Section title={t("Name")}>
              <Input
                key={config.name} aria-label={t("Loop name")} defaultValue={config.name} maxLength={60}
                onBlur={(event) => {
                  const name = event.currentTarget.value.trim();
                  if (name) onChange({ name });
                  else event.currentTarget.value = config.name;
                }}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              />
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
