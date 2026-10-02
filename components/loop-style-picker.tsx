"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { catalogConfig, curatedConfig, isCreativeFamily } from "@/lib/shader/catalog";
import { FAMILY_LABELS } from "@/lib/shader/labels";
import { ShaderRenderer } from "@/lib/shader/renderer";
import { FAMILIES, type Family } from "@/lib/shader/schema";
import { cn } from "@/lib/utils";

const previews = new Map<Family, string>();

interface Props {
  currentFamily: Family;
  families: readonly Family[];
  onSelect: (family: Family) => void;
}

export function LoopStylePicker({ currentFamily, families, onSelect }: Props) {
  const { t } = useLanguage();
  const [images, setImages] = useState(() => new Map(previews));
  const [failed, setFailed] = useState<Family[]>([]);

  useEffect(() => {
    const remaining = families.filter((family) => !previews.has(family));
    if (!remaining.length) return;
    const canvas = document.createElement("canvas");
    let renderer: ShaderRenderer | undefined;
    let frame = 0;
    let index = 0;
    // Yield between cards, and use one temporary context for the entire gallery.
    const next = () => {
      const family = remaining[index++];
      try {
        renderer ??= new ShaderRenderer(canvas, { preserveDrawingBuffer: true });
        const config = isCreativeFamily(family) ? curatedConfig(family) : catalogConfig(421 + FAMILIES.findIndex((candidate) => candidate === family), family);
        renderer.render(config, 0.125, 240, 150);
        previews.set(family, canvas.toDataURL("image/png"));
        setImages(new Map(previews));
      } catch {
        setFailed((current) => [...current, family]);
      }
      if (index < remaining.length) frame = requestAnimationFrame(next);
      else {
        renderer?.dispose();
        renderer = undefined;
      }
    };
    frame = requestAnimationFrame(next);
    return () => {
      cancelAnimationFrame(frame);
      renderer?.dispose();
    };
  }, [families]);

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("Loop types")}>
      {families.map((family) => (
        <button
          key={family}
          type="button"
          aria-label={t(FAMILY_LABELS[family])}
          aria-pressed={currentFamily === family}
          onClick={() => onSelect(family)}
          className={cn("group overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] text-left outline-none transition-colors hover:border-white/35 focus-visible:ring-2 focus-visible:ring-white", currentFamily === family && "border-cyan-200/60")}
        >
          <div className="grid aspect-[8/5] place-items-center overflow-hidden bg-zinc-950">
            {images.has(family) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images.get(family)} alt="" width={240} height={150} className="size-full object-cover" />
            ) : failed.includes(family) ? <span className="px-2 text-center text-[10px] text-white/50">{t("Preview unavailable")}</span>
              : <LoaderCircle className="size-4 animate-spin text-white/35 motion-reduce:animate-none" />}
          </div>
          <span className="block px-2 py-2 text-[11px] font-medium leading-4 text-white/85">{t(FAMILY_LABELS[family])}</span>
        </button>
      ))}
    </div>
  );
}
