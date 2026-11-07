"use client";

import { Fragment } from "react";
import type { Beat, EpisodeBundle } from "@/domain/episode";
import { polityColor } from "@/map/palette";

export interface OverlayToggles {
  legend: boolean;
  sources: boolean;
  guides: boolean;
}

interface Props {
  bundle: EpisodeBundle;
  beat: Beat;
  localT: number;
  toggles: OverlayToggles;
  format: "16x9" | "9x16";
}

/** Date counter. Shows only the precision the source supports: a year, or YYYY/MM/DD for day-dated events. */
function dateLabel(beat: Beat, localT: number) {
  if (beat.yearTicker) {
    const [a, b] = beat.yearTicker;
    return String(Math.round(a + (b - a) * Math.min(1, localT / 0.8)));
  }
  return beat.year.replace(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/, (_, y, m, d) => (d ? `${y}/${m}/${d}` : `${y}/${m}`));
}

/** "{1253}" in captions is highlighted. */
function Caption({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{") ? (
          <span key={i} className="text-[#f2a33a]">{p.slice(1, -1)}</span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const TAG_TEXT: Record<string, string> = { disputed: "disputed", approximate: "approximate", traditional: "tradition" };

export default function StageOverlays({ bundle, beat, localT, toggles, format }: Props) {
  const { script, events, sources, polities } = bundle;
  const event = beat.eventId ? events[beat.eventId] : null;
  const ref = event?.sourceRefs.find((r) => r.pages);
  const src = ref ? sources[ref.sourceId] : null;
  const srcText = ref && src ? `Source: ${src.authors[0].split(" ").slice(-1)[0].replace(/[()]/g, "")} ${src.year ?? ""}, ${ref.pages}` : null;
  const notes = [...new Set((beat.show.units ?? []).filter((u) => u.count && u.countNote).map((u) => u.countNote!))];
  const legend = script.legend.filter((l) => polities[l.polity] || l.polity);

  return (
    <div className={`reel ${format === "9x16" ? "reel-v" : "reel-h"}`}>
      {/* top: date, headline, subtitle */}
      <div className="reel-top">
        <div className="reel-date tabular-nums">{dateLabel(beat, localT)}</div>
        <div className="reel-headline">{script.headline}</div>
        <div className="reel-subtitle">
          {beat.subtitle}
          {beat.tag && TAG_TEXT[beat.tag] && <span className="reel-tag"> ({TAG_TEXT[beat.tag]})</span>}
        </div>
      </div>

      {/* legend */}
      {toggles.legend && (
      <div className="reel-legend">
        {legend.map((l) => (
          <div key={l.polity} className="reel-legend-row">
            <span className="reel-swatch" style={{ background: polityColor(l.polity) }} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="reel-legend-note">Coloured areas approximate · no borders</div>
      </div>
      )}

      {/* bottom caption */}
      <div className="reel-caption">
        <Caption text={beat.caption} />
      </div>
      <div className="reel-foot">
        {toggles.sources && srcText}
        {notes.length > 0 && <span>{srcText ? " · " : ""}* figure as given in {notes.join(" / ")}</span>}
      </div>

      {toggles.guides && <SafeGuides format={format} />}
    </div>
  );
}

function SafeGuides({ format }: { format: "16x9" | "9x16" }) {
  if (format === "16x9") return <div className="pointer-events-none absolute inset-[4.5%_3.5%] border border-dashed border-cyan-300/70" />;
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-[8%] bg-cyan-400/25" />
      <div className="absolute inset-x-0 bottom-0 h-[16%] bg-cyan-400/25" />
      <div className="absolute bottom-[16%] right-0 top-[38%] w-[13%] bg-cyan-400/25" />
      <div className="absolute left-2 top-2 rounded bg-black/60 px-1 text-[10px] text-cyan-100">Instagram UI zones (approx.)</div>
    </div>
  );
}
