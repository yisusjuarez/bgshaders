"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AiDialog } from "@/components/ai-dialog";
import { ControlDock } from "@/components/control-dock";
import { ExportDialog } from "@/components/export-dialog";
import { LibraryDialog } from "@/components/library-dialog";
import { ParamsPanel } from "@/components/params-panel";
import { SettingsDialog } from "@/components/settings-dialog";
import { ShaderCanvas } from "@/components/shader-canvas";
import {
  addConfigs,
  getLibrary,
  removeAt,
  setLibrary,
} from "@/lib/library/store";
import { randomConfig } from "@/lib/shader/random";
import { FAMILIES, type Family, type ShaderConfig } from "@/lib/shader/schema";

// Fixed seed so server and client render the same initial config (no
// hydration mismatch); every interaction after that is client-only.
const INITIAL_SEED = 421;

export default function Home() {
  const [config, setConfig] = useState<ShaderConfig>(() =>
    randomConfig(INITIAL_SEED),
  );
  const [playing, setPlaying] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibraryList] = useState<ShaderConfig[]>([]);
  const libraryRef = useRef<ShaderConfig[]>([]);
  const phaseRef = useRef(0);

  const patch = useCallback(
    (p: Partial<ShaderConfig>) => setConfig((c) => ({ ...c, ...p })),
    [],
  );
  const randomize = useCallback(() => setConfig(randomConfig()), []);

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
  const addCurrent = useCallback(() => {
    const added = addToLibrary([config]);
    toast(added ? "Added to library" : "Already in library");
  }, [addToLibrary, config]);

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

  // ?seed=N reproduces a design; ?family=name forces a family. Applied
  // post-hydration to keep the server and client initial render identical.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get("seed");
    const familyParam = params.get("family");
    const seed = seedParam !== null ? Number(seedParam) : NaN;
    const family = FAMILIES.includes(familyParam as Family)
      ? (familyParam as Family)
      : null;
    if (Number.isFinite(seed) && seed >= 0) {
      const cfg = randomConfig(Math.floor(seed) % 1_000_000);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must run post-hydration; deriving config from the URL during the initial render would desync server and client markup
      setConfig(family ? { ...cfg, family } : cfg);
    } else if (family) {
      setConfig((c) => ({ ...c, family }));
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
      if (aiOpen || settingsOpen || exportOpen || libraryOpen) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "r" || e.key === "R") {
        randomize();
      } else if (e.key === "g" || e.key === "G") {
        setAiOpen(true);
      } else if (e.key === "p" || e.key === "P") {
        setPanelOpen((o) => !o);
      } else if (e.key === "l" || e.key === "L") {
        setLibraryOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiOpen, settingsOpen, exportOpen, libraryOpen, randomize]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-zinc-950">
      <ShaderCanvas config={config} playing={playing} phaseRef={phaseRef} />

      {/* wordmark + current design */}
      <header className="pointer-events-none fixed top-5 left-5 z-20 flex flex-col gap-2">
        <div className="flex items-baseline gap-2 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
          <h1 className="font-mono text-sm font-semibold tracking-[0.28em] lowercase">
            jedylabs
          </h1>
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase">
            loop studio
          </span>
        </div>
        <div className="pointer-events-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-zinc-950/45 px-3 py-1.5 backdrop-blur-xl">
          <span className="text-[13px] font-medium text-white">{config.name}</span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-white/55 uppercase">
            {config.family} · {config.duration}s · seed {config.seed}
          </span>
        </div>
      </header>

      {panelOpen && <ParamsPanel config={config} onChange={patch} />}

      <ControlDock
        config={config}
        playing={playing}
        phaseRef={phaseRef}
        panelOpen={panelOpen}
        libraryCount={library.length}
        onTogglePlay={() => setPlaying((p) => !p)}
        onRandomize={randomize}
        onAi={() => setAiOpen(true)}
        onTogglePanel={() => setPanelOpen((o) => !o)}
        onSettings={() => setSettingsOpen(true)}
        onExport={() => setExportOpen(true)}
        onAddToLibrary={addCurrent}
        onOpenLibrary={() => setLibraryOpen(true)}
      />

      <AiDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onGenerated={(c) => setConfig(c)}
        onNeedSettings={() => {
          setAiOpen(false);
          setSettingsOpen(true);
        }}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} config={config} />
      <LibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        library={library}
        onAdd={addToLibrary}
        onRemove={(i) => commitLibrary(removeAt(libraryRef.current, i))}
        onClear={() => commitLibrary([])}
      />
    </main>
  );
}
