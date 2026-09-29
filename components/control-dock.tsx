"use client";

import {
  Boxes,
  Dices,
  Download,
  Library,
  Plus,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { LoopRing } from "@/components/loop-ring";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ShaderConfig } from "@/lib/shader/schema";
import { cn } from "@/lib/utils";

interface Props {
  config: ShaderConfig;
  playing: boolean;
  phaseRef: React.MutableRefObject<number>;
  panelOpen: boolean;
  libraryCount: number;
  onTogglePlay: () => void;
  onRandomize: () => void;
  onAi: () => void;
  onCreative: () => void;
  onTogglePanel: () => void;
  onExport: () => void;
  onAddToLibrary: () => void;
  onOpenLibrary: () => void;
}

function DockButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "grid size-11 place-items-center rounded-xl text-white/75 transition-colors outline-none sm:size-10",
              "hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60",
              active && "bg-white/15 text-white",
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ControlDock({
  config,
  playing,
  phaseRef,
  panelOpen,
  libraryCount,
  onTogglePlay,
  onRandomize,
  onAi,
  onCreative,
  onTogglePanel,
  onExport,
  onAddToLibrary,
  onOpenLibrary,
}: Props) {
  return (
    <div className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-20 sm:right-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2">
      <TooltipProvider delay={250}>
        <div className="flex flex-col items-center gap-1.5 rounded-3xl border border-white/10 bg-zinc-950/80 p-2 shadow-2xl backdrop-blur-xl sm:flex-row sm:gap-2 sm:rounded-full sm:bg-zinc-950/55 sm:py-2 sm:pr-3 sm:pl-2">
        <div className="flex w-full items-center justify-around gap-1 sm:w-auto sm:justify-start sm:gap-2">
        <Tooltip>
          <TooltipTrigger render={<div />}>
            <LoopRing
              colors={config.colors}
              playing={playing}
              phaseRef={phaseRef}
              onToggle={onTogglePlay}
            />
          </TooltipTrigger>
          <TooltipContent>{playing ? "Pause loop (Space)" : "Play loop (Space)"}</TooltipContent>
        </Tooltip>
        <div className="hidden h-8 w-px bg-white/10 sm:block" />
        <DockButton label="Random loop (R)" onClick={onRandomize}>
          <Dices className="size-4.5" />
        </DockButton>
        <DockButton label="Generate with AI (G)" onClick={onAi}>
          <Sparkles className="size-4.5" />
        </DockButton>
        <DockButton label="Loop Designer & Venue Preview (C)" onClick={onCreative}>
          <Boxes className="size-4.5" />
        </DockButton>
        <DockButton
          label="Parameters (P)"
          onClick={onTogglePanel}
          active={panelOpen}
        >
          <SlidersHorizontal className="size-4.5" />
        </DockButton>
        </div>
        <div className="flex w-full items-center justify-around gap-1 border-t border-white/10 pt-1.5 sm:w-auto sm:justify-start sm:gap-2 sm:border-0 sm:pt-0">
        <div className="hidden h-8 w-px bg-white/10 sm:block" />
        <DockButton label="Add current loop to pack tray" onClick={onAddToLibrary}>
          <Plus className="size-4.5" />
        </DockButton>
        <div className="relative">
          <DockButton label="Pack Builder & Tray (L)" onClick={onOpenLibrary}>
            <Library className="size-4.5" />
          </DockButton>
          {libraryCount > 0 && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-white px-1 text-[9px] font-semibold tabular-nums text-zinc-950">
              {libraryCount}
            </span>
          )}
        </div>
        <div className="hidden h-8 w-px bg-white/10 sm:block" />
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onExport}
                className="flex h-11 min-w-28 items-center justify-center gap-2 rounded-full bg-white px-4 font-mono text-[11px] font-medium tracking-[0.14em] text-zinc-950 uppercase transition-transform outline-none hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/60 active:scale-100 sm:h-10 sm:min-w-0"
              />
            }
          >
            <Download className="size-4" />
            Export
          </TooltipTrigger>
          <TooltipContent>Export current loop as video</TooltipContent>
        </Tooltip>
        </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
