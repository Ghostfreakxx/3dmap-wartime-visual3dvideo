"use client";

import type { Beat, EpisodeBundle } from "@/domain/episode";
import { ClaimTag } from "./ClaimTag";

/** Off-stage panel: script for the narrator plus the evidence behind the current beat. */
export default function NarratorPanel({ bundle, beat, nextBeat, onClose }: { bundle: EpisodeBundle; beat: Beat; nextBeat: Beat | null; onClose: () => void }) {
  const event = beat.eventId ? bundle.events[beat.eventId] : null;
  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-chrome-line bg-chrome-2/60 p-4 text-sm" aria-label="Narrator panel">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.2em] text-ink-dim">Narrator</h2>
        <button className="btn" onClick={onClose} aria-label="Close narrator panel">
          ✕
        </button>
      </div>
      <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink">{beat.narration || <em className="text-ink-dim">(no narration; visual beat)</em>}</p>
      {nextBeat?.narration && (
        <p className="mt-3 border-l-2 border-chrome-line pl-3 font-serif text-[14px] leading-relaxed text-ink-dim">
          <span className="text-[11px] uppercase tracking-wider">Next: </span>
          {nextBeat.narration}
        </p>
      )}

      {event ? (
        <section className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ClaimTag tag={event.claimStatus} className="text-[10px]" />
            <span className="rounded border border-chrome-line px-2 py-0.5 text-[11px] text-ink-dim">Confidence {event.confidence.level}</span>
            <span className="text-[11px] text-ink-dim">{event.id}</span>
          </div>
          <h3 className="font-serif text-lg leading-snug">{event.title}</h3>
          <p className="leading-relaxed text-ink-dim">{event.summary}</p>
          <p className="text-[12px] text-ink-dim/80">{event.confidence.basis}</p>

          {(event.disputes?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[#d9a36a]">Disputes &amp; caveats</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-ink-dim">
                {event.disputes!.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {event.numericClaims.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[#d9a36a]">Figures (attributed only)</h4>
              <ul className="mt-1 space-y-1 text-[13px] text-ink-dim">
                {event.numericClaims.map((n) => (
                  <li key={n.what}>
                    {n.value} — <em>{n.what}</em>. {n.attribution} ({n.sourceRef.pages}).
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#d9a36a]">Sources</h4>
            <ul className="mt-1 space-y-2 text-[13px]">
              {event.sourceRefs.map((r, i) => {
                const s = bundle.sources[r.sourceId];
                return (
                  <li key={`${r.sourceId}-${i}`} className="text-ink-dim">
                    <span className="text-ink">{s ? `${s.authors.join(", ")}, ${s.title}${s.year ? ` (${s.year})` : ""}` : r.sourceId}</span>
                    {r.pages ? <span>, {r.pages}</span> : <span className="text-[#d9a36a]"> (page pending)</span>}
                    {r.locator && <div className="text-[12px] opacity-80">{r.locator}</div>}
                    {r.note && <div className="text-[12px] italic opacity-80">{r.note}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : (
        <p className="mt-6 text-ink-dim">Title / transition beat. No historical claim.</p>
      )}
    </aside>
  );
}
