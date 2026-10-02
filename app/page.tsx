"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GitFork } from "lucide-react";
import { AiDialog } from "@/components/ai-dialog";
import { ControlDock } from "@/components/control-dock";
import { LoopDesignerDialog } from "@/components/creative-studio-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { LibraryDialog } from "@/components/library-dialog";
import { useLanguage } from "@/components/language-provider";
import { ShaderCanvas } from "@/components/shader-canvas";
import { catalogConfig, isCreativeFamily } from "@/lib/shader/catalog";
import { AI_ENABLED } from "@/lib/features";
import {
  addConfigs,
  getLibrary,
  removeAt,
  setLibrary,
} from "@/lib/library/store";
import { randomConfig } from "@/lib/shader/random";
import { FAMILIES, normalizeActiveConfig, type Family, type ShaderConfig } from "@/lib/shader/schema";

// Hydration-safe placeholder. The URL/bootstrap effect replaces it with a
// fresh random design before normal interaction begins.
const INITIAL_SEED = 421;

export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const [storedConfig, setConfig] = useState<ShaderConfig>(() =>
    randomConfig(INITIAL_SEED),
  );
  const config = normalizeActiveConfig(storedConfig);
  const [playing, setPlaying] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<"current" | "pack">("current");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibraryList] = useState<ShaderConfig[]>([]);
  const libraryRef = useRef<ShaderConfig[]>([]);
  const phaseRef = useRef(0);

  const patch = useCallback(
    (p: Partial<ShaderConfig>) => setConfig((c) => normalizeActiveConfig({ ...c, ...p })),
    [],
  );
  const randomize = useCallback(() => {
    phaseRef.current = 0;
    setConfig(catalogConfig());
  }, []);

  // Persist the curated tray and keep a ref so add/remove read the latest list.
  const commitLibrary = useCallback((next: ShaderConfig[]) => {
    libraryRef.current = next;
    setLibraryList(next);
    setLibrary(next);
  }, []);
  const addToLibrary = useCallback(
    (configs: ShaderConfig[]) => {
      const cur = libraryRef.current;
      const next = addConfigs(cur, configs);
      commitLibrary(next);
      return next.length - cur.length;
    },
    [commitLibrary],
  );
  // Hydrate the tray from localStorage post-mount (SSR-safe).
  useEffect(() => {
    const stored = getLibrary();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must run post-hydration; localStorage is unavailable during SSR and reading it in render would desync server and client markup
    if (stored.length) commitLibrary(stored);
  }, [commitLibrary]);

  // Start paused for users who prefer reduced motion (post-hydration so the
  // server and client initial render stay identical).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must run post-hydration; reading matchMedia during the initial render would desync server and client markup
      setPlaying(false);
    }
  }, []);

  // ?seed=N reproduces a design; ?family=name forces a family. With no seed,
  // every app load starts from a fresh design. Applied post-hydration so the
  // server and client initial markup stays identical.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get("seed");
    const familyParam = params.get("family");
    const seed = seedParam !== null ? Number(seedParam) : NaN;
    const family = FAMILIES.some((candidate) => candidate === familyParam)
      ? (familyParam as Family)
      : null;
    if (Number.isFinite(seed) && seed >= 0) {
      const normalizedSeed = Math.floor(seed) % 1_000_000;
      const cfg = family && isCreativeFamily(family)
        ? catalogConfig(normalizedSeed, family)
        : randomConfig(normalizedSeed);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must run post-hydration; deriving config from the URL during the initial render would desync server and client markup
      setConfig(family ? { ...cfg, family } : cfg.family === "accretion" ? catalogConfig(normalizedSeed, "starVortex") : cfg);
    } else {
      setConfig(catalogConfig(undefined, family ?? undefined));
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      ) {
        return;
      }
      if (aiOpen || creativeOpen || exportOpen || libraryOpen) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "r" || e.key === "R") {
        randomize();
      } else if (AI_ENABLED && (e.key === "g" || e.key === "G")) {
        setAiOpen(true);
      } else if (e.key === "c" || e.key === "C") {
        setCreativeOpen(true);
      } else if (e.key === "l" || e.key === "L") {
        setLibraryOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiOpen, creativeOpen, exportOpen, libraryOpen, randomize]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-zinc-950">
      <ShaderCanvas config={config} playing={playing} phaseRef={phaseRef} />

      {/* wordmark + language */}
      <header className="pointer-events-none fixed top-[max(1rem,env(safe-area-inset-top))] right-4 left-4 z-20 flex flex-col gap-2 sm:top-5 sm:right-5 sm:left-5">
        <div className="flex items-center justify-between gap-3 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
          <div className="flex items-baseline gap-2">
          <h1 className="font-mono text-sm font-semibold tracking-[0.28em] lowercase">
            jedylabs
          </h1>
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase sm:inline">
            {t("loop studio")}
          </span>
          </div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <a href="https://github.com/yisusjuarez/bgshaders" target="_blank" rel="noopener noreferrer" aria-label={t("Contribute on GitHub")} title={t("Contribute on GitHub")} className="flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-zinc-950/60 px-2.5 font-mono text-[10px] text-white/80 backdrop-blur-xl transition-colors hover:border-white/35 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <GitFork className="size-3.5" aria-hidden="true" />
            <span>GitHub</span>
          </a>
          <div className="flex rounded-full border border-white/15 bg-zinc-950/60 p-0.5 font-mono text-[10px] backdrop-blur-xl" role="group" aria-label={language === "es" ? "Idioma" : "Language"}>
            {(["es", "en"] as const).map((option) => (
              <button key={option} type="button" onClick={() => setLanguage(option)} aria-pressed={language === option} aria-label={option === "es" ? "Español" : "English"} className={`rounded-full px-2.5 py-1 transition-colors ${language === option ? "bg-white text-zinc-950" : "text-white/65 hover:text-white"}`}>
                {option.toUpperCase()}
              </button>
            ))}
          </div>
          </div>
        </div>
      </header>

      <ControlDock
        config={config}
        playing={playing}
        phaseRef={phaseRef}
        libraryCount={library.length}
        onTogglePlay={() => setPlaying((p) => !p)}
        onRandomize={randomize}
        onAi={() => setAiOpen(true)}
        onCreative={() => setCreativeOpen(true)}
        onExport={() => { setExportTarget("current"); setExportOpen(true); }}
        onOpenLibrary={() => setLibraryOpen(true)}
      />

      {AI_ENABLED && (
        <AiDialog
          open={aiOpen}
          onOpenChange={setAiOpen}
          onGenerated={(c) => setConfig(c)}
        />
      )}
      {creativeOpen && (
        <LoopDesignerDialog
          open
          onOpenChange={setCreativeOpen}
          config={config}
          onChange={patch}
        />
      )}
      {exportOpen && <ExportDialog open onOpenChange={setExportOpen} config={config} library={library} initialTarget={exportTarget} />}
      <LibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        library={library}
        currentConfig={config}
        onAdd={addToLibrary}
        onRemove={(i) => commitLibrary(removeAt(libraryRef.current, i))}
        onClear={() => commitLibrary([])}
        onExportPack={() => { setLibraryOpen(false); setExportTarget("pack"); setExportOpen(true); }}
      />
    </main>
  );
}
