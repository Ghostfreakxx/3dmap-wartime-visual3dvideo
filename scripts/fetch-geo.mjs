#!/usr/bin/env node
/**
 * Builds the base geography used by the map (run once; output is committed):
 *   public/geo/rivers.geojson - MODERN river courses from OpenStreetMap (ODbL)
 *   public/geo/land.geojson   - land mask from Natural Earth 1:50m (public domain, via world-atlas)
 *
 * Rivers are modern geometry and are labelled as such in the app. Historical
 * courses differ (see docs/research/03-uncertainties-and-gaps.md, gap C6).
 * Nominatim usage policy: max 1 request/second, identifying User-Agent.
 * Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1 (Node >= 22.21).
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { feature } from "topojson-client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const UA = { "User-Agent": "ahom-map-documentary/0.2 (historical map build script)" };
const BBOX = [84, 17, 101, 31.5]; // rivers: [minLon, minLat, maxLon, maxLat]
const LAND_BBOX = [76, 10, 110, 36]; // land mask: wider, so wide shots have no hard edge
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [display name, query variants (or "R<id>" for an explicit OSM relation), countrycodes, rank 1 = major]
const RIVERS = [
  ["Brahmaputra", ["R1067987"], "", 1],
  ["Irrawaddy", ["R231955"], "", 1],
  ["Lohit", ["Lohit River"], "in,cn", 2],
  ["Dibang", ["Dibang River"], "in", 3],
  ["Siang", ["Siang River"], "in", 2],
  ["Burhi Dihing", ["Burhi Dihing", "Buri Dihing", "Dihing River", "Burhidihing"], "in", 2],
  ["Disang", ["Disang River", "Dishang"], "in", 3],
  ["Dikhow", ["Dikhow River"], "in", 2],
  ["Dhansiri", ["Dhansiri River"], "in", 2],
  ["Kopili", ["Kopili River", "Kapili River"], "in", 3],
  ["Kolong (Kallang)", ["Kolong River", "Kalang River"], "in", 2],
  ["Subansiri", ["Subansiri River"], "in", 2],
  ["Jia Bharali", ["Jia Bharali", "Kameng River", "Bharali River"], "in", 2],
  ["Barnadi", ["Barnadi River", "Bornadi"], "in", 3],
  ["Manas", ["Manas River"], "in,bt", 2],
  ["Sankosh", ["Sankosh River"], "in,bt", 3],
  ["Teesta", ["Teesta River"], "in,bd", 3],
  ["Barak", ["Barak River"], "in", 2],
  ["Surma", ["Surma River"], "bd,in", 3],
  ["Chindwin", ["Chindwin River"], "mm", 2],
  ["Shweli", ["Shweli River"], "mm,cn", 2],
];

async function nominatim(q, cc) {
  const common = { format: "jsonv2", polygon_geojson: "1", polygon_threshold: "0.004" };
  const url = /^R\d+$/.test(q)
    ? "https://nominatim.openstreetmap.org/lookup?" + new URLSearchParams({ ...common, osm_ids: q })
    : "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ ...common, q, limit: "10", countrycodes: cc });
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} for ${q}`);
  return res.json();
}

const inBox = ([x, y]) => x >= BBOX[0] && x <= BBOX[2] && y >= BBOX[1] && y <= BBOX[3];
function cropLines(geom) {
  const lines = geom.type === "LineString" ? [geom.coordinates] : geom.type === "MultiLineString" ? geom.coordinates : [];
  const out = [];
  for (const line of lines) {
    let cur = [];
    for (const p of line) {
      if (inBox(p)) cur.push([+p[0].toFixed(4), +p[1].toFixed(4)]);
      else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
  }
  return out;
}

async function rivers() {
  const features = [];
  for (const [name, queries, cc, rank] of RIVERS) {
    let best = null;
    for (const q of queries) {
      try {
        const hits = await nominatim(q, cc);
        for (const h of hits) {
          if (!["LineString", "MultiLineString"].includes(h.geojson?.type)) continue;
          if (!/^R/.test(q) && h.category !== "waterway") continue;
          const lines = cropLines(h.geojson);
          const n = lines.reduce((a, l) => a + l.length, 0);
          if (n > 1 && (!best || n > best.n)) best = { h, lines, n };
        }
      } catch (e) {
        console.warn(`  ! ${name} (${q}): ${e.message}`);
      }
      await sleep(1200);
    }
    if (!best) { console.warn(`  ! no usable line geometry for ${name}`); continue; }
    features.push({
      type: "Feature",
      properties: { name, rank, osm: `${best.h.osm_type}/${best.h.osm_id}`, course: "modern", attribution: "© OpenStreetMap contributors (ODbL)" },
      geometry: { type: "MultiLineString", coordinates: best.lines },
    });
    console.log(`  ✓ ${name} (${best.h.osm_type}/${best.h.osm_id}, ${best.n} pts)`);
  }
  return { type: "FeatureCollection", name: "rivers-modern-osm", features };
}

// Sutherland-Hodgman clip of a ring against the land bbox rectangle.
function clipRing(ring) {
  const BBOX = LAND_BBOX;
  const edges = [
    (p) => p[0] >= BBOX[0], (p) => p[0] <= BBOX[2], (p) => p[1] >= BBOX[1], (p) => p[1] <= BBOX[3],
  ];
  const inter = (a, b, k) => {
    const [axis, v] = k === 0 ? [0, BBOX[0]] : k === 1 ? [0, BBOX[2]] : k === 2 ? [1, BBOX[1]] : [1, BBOX[3]];
    const t = (v - a[axis]) / (b[axis] - a[axis]);
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  let out = ring;
  edges.forEach((inside, k) => {
    const input = out; out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(inter(prev, cur, k)); out.push(cur); }
      else if (inside(prev)) out.push(inter(prev, cur, k));
    }
  });
  if (out.length < 3) return null;
  out = out.map((p) => [+p[0].toFixed(4), +p[1].toFixed(4)]);
  out.push(out[0]);
  return out;
}

function land() {
  const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-50m.json"), "utf8"));
  const fc = feature(topo, topo.objects.land);
  const polys = [];
  for (const f of fc.features) {
    const list = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of list) {
      const outer = clipRing(poly[0].slice(0, -1));
      if (outer) polys.push([outer]);
    }
  }
  return { type: "FeatureCollection", name: "land-natural-earth-50m", features: [{ type: "Feature", properties: { attribution: "Natural Earth (public domain)" }, geometry: { type: "MultiPolygon", coordinates: polys } }] };
}

mkdirSync(join(root, "public/geo"), { recursive: true });
console.log("Land (Natural Earth 1:50m)…");
writeFileSync(join(root, "public/geo/land.geojson"), JSON.stringify(land()));
console.log("Rivers (OpenStreetMap, modern courses)…");
writeFileSync(join(root, "public/geo/rivers.geojson"), JSON.stringify(await rivers()));
console.log("Done.");
