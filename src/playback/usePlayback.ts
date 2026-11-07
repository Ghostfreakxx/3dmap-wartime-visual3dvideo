"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { beatAt, beatStart, totalDuration, type EpisodeScript } from "@/domain/episode";

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export interface PlaybackState {
  t: number; // absolute episode time, ms
  playing: boolean;
  speed: number;
}

/**
 * Deterministic playback: the whole scene is a pure function of episode time `t`,
 * so re-takes are identical. The RAF loop only advances `t`.
 */
export function usePlayback(script: EpisodeScript) {
  const total = useMemo(() => totalDuration(script), [script]);
  const [state, setState] = useState<PlaybackState>({ t: 0, playing: false, speed: 1 });
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!state.playing) {
      last.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : now - last.current;
      last.current = now;
      setState((s) => {
        const t = Math.min(total, s.t + dt * s.speed);
        return { ...s, t, playing: t < total && s.playing };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.playing, total]);

  const { index, local } = beatAt(script, state.t);
  const beat = script.beats[index];
  const localT = Math.min(1, local / beat.durationMs);

  const play = useCallback(() => setState((s) => ({ ...s, playing: true, t: s.t >= total ? 0 : s.t })), [total]);
  const pause = useCallback(() => setState((s) => ({ ...s, playing: false })), []);
  const toggle = useCallback(() => setState((s) => ({ ...s, playing: !s.playing, t: !s.playing && s.t >= total ? 0 : s.t })), [total]);
  const seekBeat = useCallback(
    (i: number) => setState((s) => ({ ...s, t: beatStart(script, Math.max(0, Math.min(script.beats.length - 1, i))) })),
    [script],
  );
  const next = useCallback(() => seekBeat(index + 1), [seekBeat, index]);
  const prev = useCallback(() => seekBeat(local > 1500 ? index : index - 1), [seekBeat, index, local]);
  const replay = useCallback(() => setState((s) => ({ ...s, t: 0, playing: true })), []);
  const setSpeed = useCallback((speed: number) => setState((s) => ({ ...s, speed })), []);
  const seekTime = useCallback((t: number) => setState((s) => ({ ...s, t: Math.max(0, Math.min(total, t)) })), [total]);

  return { ...state, total, index, local, localT, beat, play, pause, toggle, seekBeat, next, prev, replay, setSpeed, seekTime };
}

export type Playback = ReturnType<typeof usePlayback>;
