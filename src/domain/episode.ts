import type { ClaimStatus, HistoricalEvent, Place, Polity, SourceRecord } from "./types";

export type LngLat = [number, number];

export interface BeatCamera {
  center: LngLat;
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** camera move duration at 1x speed */
  flyMs?: number;
}

export interface RouteProgress {
  id: string;
  from: number; // 0..1
  to: number; // 0..1
}

/** Soft-edged polity colour area around an anchor place. Approximate by design: never a border. */
export interface Zone {
  placeId: string;
  radiusKm: number;
  polity: string;
}

/** Banner marker (coloured square on a pole) for a group or army. No flags. */
export interface Unit {
  id: string;
  polity: string;
  label: string;
  /** a place id, or "route:<routeId>" to ride the head of an animated route */
  at: string;
  /** shown only with a countRef to a sourced numericClaim */
  count?: string;
  countNote?: string;
  countRef?: { eventId: string; what: string };
}

export interface BeatShow {
  /** places drawn as white city dots with bold labels */
  cities?: string[];
  /** place drawn as a capital (star/square) */
  capital?: string;
  zones?: Zone[];
  route?: RouteProgress;
  units?: Unit[];
  flood?: string[];
}

export interface Beat {
  id: string;
  eventId: string | null;
  year: string;
  yearTicker?: [number, number];
  durationMs: number;
  camera: BeatCamera;
  vertical?: { center: LngLat; zoom: number };
  /** line under the headline */
  subtitle: string;
  /** big bottom caption; wrap years in {braces} to highlight them */
  caption: string;
  tag: ClaimStatus | null;
  narration: string;
  show: BeatShow;
}

export interface EpisodeScript {
  episode: number;
  title: string;
  headline: string;
  subtitle: string;
  defaultFormat: "9x16" | "16x9";
  legend: Array<{ polity: string; label: string }>;
  range: string;
  status: "prototype" | "draft" | "reviewed";
  derivedNumbers: Array<{ text: string; derivation: string }>;
  /** smooth: false draws straight legs (for zig-zag sequences that a spline would overshoot) */
  routes: Record<string, { via: string[]; label: string; smooth?: boolean; polity?: string }>;
  beats: Beat[];
}

/** Everything a player needs, resolved on the server so the client gets a small payload. */
export interface EpisodeBundle {
  script: EpisodeScript;
  events: Record<string, HistoricalEvent>;
  places: Record<string, Place>;
  polities: Record<string, Polity>;
  sources: Record<string, SourceRecord>;
  /** All dated events across the series, for timeline context ticks. */
  timeline: Array<{ id: string; episode: number; year: number; title: string }>;
  episodeTitles: Array<{ number: number; title: string; range: { start: string; end: string } }>;
}

export const totalDuration = (s: EpisodeScript) => s.beats.reduce((a, b) => a + b.durationMs, 0);

export const beatStart = (s: EpisodeScript, index: number) =>
  s.beats.slice(0, index).reduce((a, b) => a + b.durationMs, 0);

/** Locate the beat for an absolute episode time. */
export function beatAt(s: EpisodeScript, tMs: number): { index: number; local: number } {
  let acc = 0;
  for (let i = 0; i < s.beats.length; i++) {
    const d = s.beats[i].durationMs;
    if (tMs < acc + d) return { index: i, local: tMs - acc };
    acc += d;
  }
  const last = s.beats.length - 1;
  return { index: last, local: s.beats[last].durationMs };
}

/** First year mentioned in a beat label ("1215–1228", "c. 1200") - for the timeline marker. */
export function beatYear(b: Beat): number | null {
  const m = b.year.match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

/**
 * Timeline slider snapping: the beat whose year is the latest at or before `year`.
 * Snapshots are discrete - we never interpolate territory between beats.
 */
export function beatForYear(s: EpisodeScript, year: number): number {
  let best = 0;
  s.beats.forEach((b, i) => {
    const y = beatYear(b);
    if (y !== null && y <= year) best = i;
  });
  return best;
}

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export interface CameraState {
  center: LngLat;
  zoom: number;
}

/**
 * Deterministic camera: a pure function of (beat, progress). Each beat eases from the previous
 * beat's framing to its own over `flyMs`, then holds. Preview and rendered video are identical.
 */
export function cameraAt(s: EpisodeScript, index: number, localMs: number, vertical: boolean, speed = 1): CameraState {
  const frame = (b: Beat): CameraState => {
    if (vertical) return b.vertical ?? { center: b.camera.center, zoom: b.camera.zoom - 0.5 };
    return { center: b.camera.center, zoom: b.camera.zoom };
  };
  const cur = frame(s.beats[index]);
  if (index === 0) return cur;
  const prev = frame(s.beats[index - 1]);
  const fly = (s.beats[index].camera.flyMs ?? 2500) / speed;
  const t = easeInOut(Math.min(1, Math.max(0, localMs / fly)));
  // zoom out-and-in a little on long moves, like a flyTo
  const dist = Math.hypot(cur.center[0] - prev.center[0], cur.center[1] - prev.center[1]);
  const arc = Math.min(1.2, dist * 0.35) * Math.sin(Math.PI * t);
  return {
    center: [prev.center[0] + (cur.center[0] - prev.center[0]) * t, prev.center[1] + (cur.center[1] - prev.center[1]) * t],
    zoom: prev.zoom + (cur.zoom - prev.zoom) * t - arc,
  };
}
