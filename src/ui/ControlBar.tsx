"use client";

import { useState } from "react";
import { beatForYear, beatStart, beatYear, type EpisodeBundle } from "@/domain/episode";
import type { LayerState } from "@/map/MapStage";
import { SPEEDS, type Playback } from "@/playback/usePlayback";
import type { OverlayToggles } from "./StageOverlays";

const T_MIN = 1200;
const T_MAX = 1838;
const pct = (y: number) => ((y - T_MIN) / (T_MAX - T_MIN)) * 100;
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

interface Props {
  bundle: EpisodeBundle;
  pb: Playback;
  layers: LayerState;
  setLayers: (l: LayerState) => void;
  toggles: OverlayToggles;
  setToggles: (t: OverlayToggles) => void;
  format: "16x9" | "9x16";
  setFormat: (f: "16x9" | "9x16") => void;
  manual: boolean;
  setManual: (m: boolean) => void;
  narrator: boolean;
  setNarrator: (n: boolean) => void;
  enterPresentation: () => void;
}

export default function ControlBar(p: Props) {
  const { bundle, pb } = p;
  const { script } = bundle;
  const [layersOpen, setLayersOpen] = useState(false);
  const year = beatYear(pb.beat) ?? 1215;
  const epStart = Number(script.range.slice(0, 4));
  const epEnd = Number(script.range.slice(-4));

  return (
    <div className="border-t border-chrome-line bg-chrome px-3 pb-3 pt-2" role="toolbar" aria-label="Playback controls">
      {/* timeline 1200-1838: snaps to beats, never interpolates territory */}
      <div className="relative mb-2 h-9 select-none">
        <div className="absolute inset-x-0 top-4 h-1 rounded bg-chrome-line" />
        <div className="absolute top-3 h-3 rounded bg-accent/30" style={{ left: `${pct(epStart)}%`, width: `${pct(epEnd) - pct(epStart)}%` }} title={`Episode ${script.episode}: ${script.range}`} />
        {bundle.timeline.map((e) => (
          <div
            key={e.id}
            className={`absolute top-[13px] h-[10px] w-[2px] ${e.episode === script.episode ? "bg-accent" : "bg-ink-dim/40"}`}
            style={{ left: `${pct(e.year)}%` }}
            title={`${e.year} · Ep. ${e.episode} · ${e.title}`}
          />
        ))}
        <div className="absolute top-1 -ml-[7px] h-[22px] w-[14px] rounded-sm border-2 border-[#ffe2b8] bg-accent shadow" style={{ left: `${pct(year)}%` }} />
        <input
          type="range"
          min={T_MIN}
          max={T_MAX}
          step={1}
          value={year}
          aria-label="Timeline year (snaps to the nearest earlier beat)"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const y = Number(e.target.value);
            pb.seekBeat(beatForYear(script, Math.max(epStart, Math.min(epEnd, y))));
          }}
        />
        <div className="pointer-events-none absolute -bottom-1 left-0 text-[10px] text-ink-dim">1200</div>
        <div className="pointer-events-none absolute -bottom-1 right-0 text-[10px] text-ink-dim">1838</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" onClick={pb.prev} aria-label="Previous beat" title="Previous beat (←)">⏮</button>
        <button className="btn min-w-[64px]" onClick={pb.toggle} aria-label={pb.playing ? "Pause" : "Play"} title="Play / pause (Space)">
          {pb.playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button className="btn" onClick={pb.next} aria-label="Next beat" title="Next beat (→)">⏭</button>
        <button className="btn" onClick={pb.replay} title="Replay (R)">↺</button>
        <label className="flex items-center gap-1 text-xs text-ink-dim">
          Speed
          <select className="btn" value={pb.speed} onChange={(e) => pb.setSpeed(Number(e.target.value))} aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </label>
        <span className="kbd tabular-nums">{fmt(pb.t)} / {fmt(pb.total)}</span>

        <div className="mx-1 hidden h-6 w-px bg-chrome-line md:block" />
        <div className="flex max-w-full gap-1 overflow-x-auto">
          {script.beats.map((b, i) => (
            <button
              key={b.id}
              className="btn !min-w-[30px] !px-2"
              aria-pressed={i === pb.index}
              onClick={() => pb.seekTime(beatStart(script, i))}
              title={`${i + 1}. ${b.subtitle}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap gap-1">
          <button className="btn" aria-pressed={p.format === "9x16"} onClick={() => p.setFormat(p.format === "16x9" ? "9x16" : "16x9")} title="Format 16:9 / 9:16 (F)">
            {p.format === "16x9" ? "16:9" : "9:16"}
          </button>
          <button className="btn" aria-pressed={p.toggles.sources} onClick={() => p.setToggles({ ...p.toggles, sources: !p.toggles.sources })} title="Source citations (S)">Sources</button>
          <button className="btn" aria-pressed={p.toggles.legend} onClick={() => p.setToggles({ ...p.toggles, legend: !p.toggles.legend })} title="Legend (K)">Legend</button>
          <button className="btn" aria-pressed={p.toggles.guides} onClick={() => p.setToggles({ ...p.toggles, guides: !p.toggles.guides })} title="Safe-area guides (G)">Safe</button>
          <button className="btn" aria-pressed={p.narrator} onClick={() => p.setNarrator(!p.narrator)} title="Narrator panel (N)">Narrator</button>
          <button className="btn" aria-pressed={p.manual} onClick={() => p.setManual(!p.manual)} title="Manual map control (M)">Manual</button>
          <div className="relative">
            <button className="btn" aria-expanded={layersOpen} onClick={() => setLayersOpen(!layersOpen)} title="Layers (L)">Layers</button>
            {layersOpen && (
              <div className="absolute bottom-11 right-0 z-30 w-56 rounded-lg border border-chrome-line bg-chrome-2 p-2 shadow-xl">
                {(Object.keys(p.layers) as Array<keyof LayerState>).map((k) => (
                  <label key={k} className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-chrome">
                    <span>{LAYER_LABELS[k]}</span>
                    <input type="checkbox" checked={p.layers[k]} onChange={() => p.setLayers({ ...p.layers, [k]: !p.layers[k] })} />
                  </label>
                ))}
                <p className="px-2 pt-1 text-[11px] text-ink-dim">Modern borders are not included in this build.</p>
              </div>
            )}
          </div>
          <button className="btn" onClick={p.enterPresentation} title="Presentation mode (P); Esc to exit">Present</button>
        </div>
      </div>
    </div>
  );
}

const LAYER_LABELS: Record<keyof LayerState, string> = {
  terrain: "Relief shading",
  rivers: "Rivers (modern courses)",
  places: "Places",
  zones: "Coloured areas (approximate)",
  routes: "Arrows",
  units: "Banners",
};
