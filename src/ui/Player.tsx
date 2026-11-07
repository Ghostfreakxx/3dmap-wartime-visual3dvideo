"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as MLMap } from "maplibre-gl";
import type { EpisodeBundle } from "@/domain/episode";
import { DEFAULT_LAYERS, type LayerState } from "@/map/MapStage";
import { usePlayback, SPEEDS } from "@/playback/usePlayback";
import { openChannel, type PresenterCommand, type StageStatus } from "@/playback/presenter";
import StageOverlays, { type OverlayToggles } from "./StageOverlays";
import ControlBar from "./ControlBar";
import NarratorPanel from "./NarratorPanel";

const MapStage = dynamic(() => import("@/map/MapStage"), { ssr: false });

type Format = "16x9" | "9x16";
const BOOKMARK_KEY = (ep: number) => `ahom-bookmarks-ep${ep}`;

function readBookmarks(ep: number): Record<string, { center: [number, number]; zoom: number; pitch: number; bearing: number }> {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY(ep)) ?? "{}");
  } catch {
    return {};
  }
}

export default function Player({ bundle, initialFormat, initialPresentation = false, renderMode = false }: { bundle: EpisodeBundle; initialFormat?: Format; initialPresentation?: boolean; renderMode?: boolean }) {
  const { script } = bundle;
  const pb = usePlayback(script);
  const [format, setFormat] = useState<Format>(initialFormat ?? script.defaultFormat);
  const [presentation, setPresentation] = useState(initialPresentation || renderMode);
  const [manual, setManual] = useState(false);
  const [narrator, setNarrator] = useState(false);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [toggles, setToggles] = useState<OverlayToggles>({ legend: true, sources: true, guides: false });
  const [toast, setToast] = useState<string | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const bookmark = useCallback(
    (slot: number, save: boolean) => {
      const map = mapRef.current;
      if (!map) return;
      const all = readBookmarks(script.episode);
      if (save) {
        const c = map.getCenter();
        all[slot] = { center: [c.lng, c.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
        try {
          localStorage.setItem(BOOKMARK_KEY(script.episode), JSON.stringify(all));
        } catch {
          /* storage unavailable: bookmark kept for this session only */
        }
        flash(`Camera saved to ${slot}`);
      } else if (all[slot]) {
        setManual(true);
        pb.pause();
        map.flyTo({ ...all[slot], duration: 2500, essential: true });
        flash(`Camera ${slot}`);
      } else flash(`No camera in slot ${slot} (Shift+${slot} saves)`);
    },
    [script.episode, flash, pb],
  );

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const digit = e.code.startsWith("Digit") ? Number(e.code.slice(5)) : NaN;
      if (digit >= 1 && digit <= 9) {
        bookmark(digit, e.shiftKey);
        return;
      }
      switch (e.key) {
        case " ": e.preventDefault(); pb.toggle(); break;
        case "ArrowRight": pb.next(); break;
        case "ArrowLeft": pb.prev(); break;
        case "r": case "R": pb.replay(); break;
        case "f": case "F": setFormat((f) => (f === "16x9" ? "9x16" : "16x9")); break;
        case "p": case "P": setPresentation((v) => !v); break;
        case "Escape": setPresentation(false); break;
        case "m": case "M": setManual((v) => !v); break;
        case "n": case "N": setNarrator((v) => !v); break;
        case "s": case "S": setToggles((t) => ({ ...t, sources: !t.sources })); break;
        case "k": case "K": setToggles((t) => ({ ...t, legend: !t.legend })); break;
        case "g": case "G": setToggles((t) => ({ ...t, guides: !t.guides })); break;
        case "+": case "=": pb.setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(pb.speed as (typeof SPEEDS)[number]) + 1)]); break;
        case "-": pb.setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(pb.speed as (typeof SPEEDS)[number]) - 1)]); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pb, bookmark]);

  // presenter channel (iPad / second window)
  const chanRef = useRef<BroadcastChannel | null>(null);
  const handlersRef = useRef<(c: PresenterCommand) => void>(() => {});
  useEffect(() => {
    handlersRef.current = (c: PresenterCommand) => {
    switch (c.type) {
      case "toggle": pb.toggle(); break;
      case "play": pb.play(); break;
      case "pause": pb.pause(); break;
      case "next": pb.next(); break;
      case "prev": pb.prev(); break;
      case "replay": pb.replay(); break;
      case "seekBeat": pb.seekBeat(c.index); break;
      case "speed": pb.setSpeed(c.value); break;
      case "format": setFormat(c.value); break;
      case "presentation": setPresentation(c.value); break;
      case "bookmark": bookmark(c.slot, false); break;
      case "requestState": break;
      }
    };
  });
  useEffect(() => {
    const ch = openChannel();
    chanRef.current = ch;
    if (ch) ch.onmessage = (ev: MessageEvent<PresenterCommand>) => handlersRef.current(ev.data);
    return () => ch?.close();
  }, []);
  const statusKey = `${pb.index}|${pb.playing}|${pb.speed}|${format}|${presentation}|${Math.floor(pb.t / 500)}`;
  useEffect(() => {
    const next = script.beats[pb.index + 1] ?? null;
    const status: StageStatus = {
      type: "status", episode: script.episode, beatIndex: pb.index, beatCount: script.beats.length, beatId: pb.beat.id,
      caption: pb.beat.caption.replace(/[{}]/g, ""), narration: pb.beat.narration, nextNarration: next?.narration ?? null, year: pb.beat.year,
      playing: pb.playing, speed: pb.speed, t: pb.t, total: pb.total, format, presentation,
    };
    chanRef.current?.postMessage(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey]);

  // Frame-accurate export hook (used by scripts/render-video.mjs): time is driven from outside.
  const seekTime = pb.seekTime;
  useEffect(() => {
    if (!renderMode) return;
    const w = window as unknown as { __ahom?: unknown };
    w.__ahom = {
      total: pb.total,
      seek: (t: number) => seekTime(t),
      tilesLoaded: () => !!mapRef.current?.loaded() && !!mapRef.current?.areTilesLoaded(),
      mapReady: () => !!mapRef.current,
    };
  }, [renderMode, pb.total, seekTime]);

  const nextBeat = script.beats[pb.index + 1] ?? null;
  const showNarrator = narrator && !presentation;

  return (
    <div className="flex h-dvh w-full flex-col bg-chrome">
      <div className="flex min-h-0 flex-1">
        <div className="stage-host relative flex min-w-0 flex-1 items-center justify-center p-0">
          <div className="stage shadow-2xl" data-format={format}>
            <MapStage
              bundle={bundle}
              beatIndex={pb.index}
              localT={pb.localT}
              layers={layers}
              vertical={format === "9x16"}
              manual={manual}
              speed={pb.speed}
              onReady={(m) => (mapRef.current = m)}
            />
            <StageOverlays bundle={bundle} beat={pb.beat} localT={pb.localT} toggles={toggles} format={format} />
            {manual && !presentation && (
              <div className="absolute left-2 top-2 z-20 rounded bg-black/70 px-2 py-1 text-xs text-amber-200">Manual control: drag / zoom freely. Press M to resume.</div>
            )}
          </div>
          {toast && <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded bg-black/80 px-3 py-1.5 text-sm">{toast}</div>}
          {presentation && (
            <button className="btn absolute right-2 top-2 z-30 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100" onClick={() => setPresentation(false)}>
              Exit presentation (Esc)
            </button>
          )}
        </div>
        {showNarrator && (
          <div className="hidden w-[360px] shrink-0 lg:block">
            <NarratorPanel bundle={bundle} beat={pb.beat} nextBeat={nextBeat} onClose={() => setNarrator(false)} />
          </div>
        )}
      </div>
      {!presentation && (
        <ControlBar
          bundle={bundle}
          pb={pb}
          layers={layers}
          setLayers={setLayers}
          toggles={toggles}
          setToggles={setToggles}
          format={format}
          setFormat={setFormat}
          manual={manual}
          setManual={setManual}
          narrator={narrator}
          setNarrator={setNarrator}
          enterPresentation={() => setPresentation(true)}
        />
      )}
    </div>
  );
}
