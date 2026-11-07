#!/usr/bin/env node
/**
 * Downloads Terrarium-encoded elevation tiles (AWS Open Data "Terrain Tiles",
 * derived from SRTM and other public sources) for the study area into
 * public/tiles/terrarium/{z}/{x}/{y}.png so the app runs offline while recording.
 *
 *   node scripts/fetch-terrain.mjs [maxZoom=8]
 *
 * Attribution required in the app: "Terrain: Mapzen / AWS Terrain Tiles (SRTM, GMTED, ETOPO1)".
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Detailed study area, plus a wider context ring at low zooms so wide shots have no hard edge.
const BBOX = [84, 17, 101, 31.5];
const CONTEXT_BBOX = [76, 10, 110, 36];
const CONTEXT_MAX_Z = 6;
const MIN_Z = 3;
const MAX_Z = Number(process.argv[2] ?? 8);
const BASE = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium";

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

const jobs = [];
for (let z = MIN_Z; z <= MAX_Z; z++) {
  const b = z <= CONTEXT_MAX_Z ? CONTEXT_BBOX : BBOX;
  for (let x = lon2x(b[0], z); x <= lon2x(b[2], z); x++)
    for (let y = lat2y(b[3], z); y <= lat2y(b[1], z); y++) jobs.push([z, x, y]);
}
console.log(`${jobs.length} tiles, z${MIN_Z}-${MAX_Z}`);

let done = 0, skipped = 0, failed = 0;
async function worker() {
  while (jobs.length) {
    const [z, x, y] = jobs.shift();
    const out = join(root, "public/tiles/terrarium", String(z), String(x), `${y}.png`);
    if (existsSync(out)) { skipped++; continue; }
    try {
      const res = await fetch(`${BASE}/${z}/${x}/${y}.png`);
      if (!res.ok) throw new Error(String(res.status));
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      done++;
    } catch (e) {
      failed++;
      console.warn(`  ! ${z}/${x}/${y}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`downloaded ${done}, skipped ${skipped}, failed ${failed}`);
process.exit(failed ? 1 : 0);
