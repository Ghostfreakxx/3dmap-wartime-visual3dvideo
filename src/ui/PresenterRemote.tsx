"use client";

import { useEffect, useRef, useState } from "react";
import { openChannel, type PresenterCommand, type StageStatus } from "@/playback/presenter";
import { SPEEDS } from "@/playback/usePlayback";

/**
 * iPad / second-window remote with teleprompter. Talks to an open /watch/... tab in the
 * same browser via BroadcastChannel (e.g. iPad Split View: stage on one side, remote on the other).
 */
export default function PresenterRemote() {
  const chan = useRef<BroadcastChannel | null>(null);
  const [status, setStatus] = useState<StageStatus | null>(null);
  const supported = typeof BroadcastChannel !== "undefined";

  useEffect(() => {
    const ch = openChannel();
    if (!ch) return;
    chan.current = ch;
    ch.onmessage = (ev: MessageEvent<StageStatus | PresenterCommand>) => {
      if (ev.data.type === "status") setStatus(ev.data);
    };
    ch.postMessage({ type: "requestState" } satisfies PresenterCommand);
    return () => ch.close();
  }, []);

  const send = (c: PresenterCommand) => chan.current?.postMessage(c);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Presenter</h1>
        <span className={`rounded px-2 py-1 text-xs ${status ? "bg-emerald-900/60 text-emerald-200" : "bg-chrome-2 text-ink-dim"}`}>
          {status ? `Connected · Ep. ${status.episode} · beat ${status.beatIndex + 1}/${status.beatCount}` : "Waiting for a /watch tab…"}
        </span>
      </header>
      {!supported && <p className="text-amber-300">This browser does not support BroadcastChannel.</p>}

      <section className="rounded-xl border border-chrome-line bg-chrome-2/50 p-4" aria-live="polite">
        <div className="text-xs uppercase tracking-[0.2em] text-ink-dim">{status ? `${status.year} · ${status.caption}` : "Teleprompter"}</div>
        <p className="mt-2 font-serif text-2xl leading-snug sm:text-3xl">{status?.narration || <span className="text-ink-dim">(visual beat: no narration)</span>}</p>
        {status?.nextNarration && <p className="mt-4 border-l-2 border-chrome-line pl-3 font-serif text-lg text-ink-dim">Next: {status.nextNarration}</p>}
      </section>

      <div className="grid grid-cols-3 gap-3">
        <button className="btn !min-h-[72px] text-lg" onClick={() => send({ type: "prev" })}>⏮ Back</button>
        <button className="btn !min-h-[72px] text-xl" onClick={() => send({ type: "toggle" })}>{status?.playing ? "❚❚ Pause" : "▶ Play"}</button>
        <button className="btn !min-h-[72px] text-lg" onClick={() => send({ type: "next" })}>Next ⏭</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => send({ type: "replay" })}>↺ Replay</button>
        {SPEEDS.map((s) => (
          <button key={s} className="btn" aria-pressed={status?.speed === s} onClick={() => send({ type: "speed", value: s })}>{s}×</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn" aria-pressed={status?.format === "16x9"} onClick={() => send({ type: "format", value: "16x9" })}>16:9</button>
        <button className="btn" aria-pressed={status?.format === "9x16"} onClick={() => send({ type: "format", value: "9x16" })}>9:16</button>
        <button className="btn" aria-pressed={status?.presentation} onClick={() => send({ type: "presentation", value: !status?.presentation })}>Presentation mode</button>
      </div>
      {status && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: status.beatCount }, (_, i) => (
            <button key={i} className="btn" aria-pressed={i === status.beatIndex} onClick={() => send({ type: "seekBeat", index: i })}>{i + 1}</button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-dim">Camera bookmarks</span>
        {Array.from({ length: 9 }, (_, i) => (
          <button key={i} className="btn" onClick={() => send({ type: "bookmark", slot: i + 1 })}>{i + 1}</button>
        ))}
      </div>
      <p className="text-xs text-ink-dim">
        Open the episode in another tab or in Split View on the same device. Save camera bookmarks on the stage with Shift + 1–9.
        Controlling a different device needs a relay (not included yet).
      </p>
    </main>
  );
}
