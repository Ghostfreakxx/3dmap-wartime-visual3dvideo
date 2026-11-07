import type { LngLat, EpisodeScript } from "@/domain/episode";
import type { Place } from "@/domain/types";

/**
 * Smooth a schematic corridor through waypoints (centripetal-ish Catmull-Rom).
 * The result is explicitly NOT a documented path - it is drawn as a wide soft band.
 */
export function corridor(points: LngLat[], samplesPerSegment = 16): LngLat[] {
  if (points.length < 2) return points;
  const p = [points[0], ...points, points[points.length - 1]];
  const out: LngLat[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

const kmBetween = (a: LngLat, b: LngLat) => {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toR, dLon = (b[0] - a[0]) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Point at fraction `t` (0..1) of a polyline's length - for the route head marker. */
export function pointAlong(line: LngLat[], t: number): LngLat {
  if (line.length === 0) return [0, 0];
  const seg = line.slice(1).map((p, i) => kmBetween(line[i], p));
  const total = seg.reduce((a, b) => a + b, 0);
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const f = seg[i] === 0 ? 0 : target / seg[i];
      return [line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f];
    }
    target -= seg[i];
  }
  return line[line.length - 1];
}

/** Waypoints for a route, skipping places that have no established location. */
export function routeLine(script: EpisodeScript, routeId: string, places: Record<string, Place>): LngLat[] {
  const route = script.routes[routeId];
  const pts = (route?.via ?? []).map((id) => places[id]?.coord).filter((c): c is [number, number] => !!c);
  return route?.smooth === false ? pts : corridor(pts);
}

/**
 * Cumulative route progress at a point in the episode: each route keeps the furthest
 * progress reached in earlier beats, and animates from->to inside its active beat.
 */
export function routeProgressAt(script: EpisodeScript, beatIndex: number, localT: number): Record<string, number> {
  const out: Record<string, number> = {};
  script.beats.forEach((b, i) => {
    const r = b.show.route;
    if (!r || i > beatIndex) return;
    const v = i < beatIndex ? r.to : r.from + (r.to - r.from) * localT;
    out[r.id] = Math.max(out[r.id] ?? 0, v);
  });
  return out;
}

/**
 * Pixel radius at zoom 0 for a fixed ground distance (Web Mercator, 512px tiles).
 * The style scales it with ["interpolate", ["exponential", 2], ["zoom"], 0, r0, 22, r0 * 2^22].
 */
export function kmToPxAtZoom0(km: number, lat: number) {
  return (km * 1000) / (78271.52 * Math.cos((lat * Math.PI) / 180));
}

/** Ground radius used to show positional uncertainty, by gazetteer precision. */
export const uncertaintyKm: Record<Place["precision"], number> = { site: 0.6, locality: 4, regional: 16, unidentified: 0 };
