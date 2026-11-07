#!/usr/bin/env node
/**
 * Research-data validator (Phase 1, zero dependencies).
 *
 *   node scripts/validate-research.mjs          # errors fail, warnings reported
 *   node scripts/validate-research.mjs --strict # warnings also fail
 *
 * Checks:
 *  - every sourceRef resolves in the source registry
 *  - no event is supported only by finding-aid sources
 *  - unsourced numbers: digits that are not years, or number words, in
 *    summaries/narration unless declared in numericClaims with a sourceRef
 *  - dates parse, lie in 1200-1838, start <= end, and fall inside the episode range
 *  - occupations have a matching end/withdrawal (no silent permanent annexation)
 *  - places/polities referenced exist; coordinates inside the study bounding box
 *  - snapshot references exist; any GeoJSON present has valid closed rings
 *  - enums (confidence, claimStatus) are valid
 *  - reports pending page locators and unverified coordinates as warnings
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const strict = process.argv.includes("--strict");

const registry = load("data/sources/registry.json");
const gaz = load("data/gazetteer/places.json");
const chrono = load("data/chronology/events.json");
const snapIndex = load("data/geo/snapshots/index.json");

const errors = [];
const warnings = [];
const err = (id, m) => errors.push(`${id}: ${m}`);
const warn = (id, m) => warnings.push(`${id}: ${m}`);

const sources = new Map(registry.sources.map((s) => [s.id, s]));
const places = new Map(gaz.places.map((p) => [p.id, p]));
const polities = new Map(gaz.polities.map((p) => [p.id, p]));
const snapshots = new Map(snapIndex.snapshots.map((s) => [s.id, s]));

const BBOX = { minLon: 85, maxLon: 100, minLat: 18, maxLat: 30 };
const YEAR_MIN = 1200;
const YEAR_MAX = 1838;
const CONF = new Set(["A", "B", "C", "D"]);
const STATUS = new Set(["documented", "disputed", "approximate", "traditional"]);

/* ---------- duplicate ids ---------- */
for (const [label, arr] of [["source", registry.sources], ["place", gaz.places], ["polity", gaz.polities], ["event", chrono.events], ["snapshot", snapIndex.snapshots]]) {
  const seen = new Set();
  for (const x of arr) {
    if (seen.has(x.id)) err(x.id, `duplicate ${label} id`);
    seen.add(x.id);
  }
}

/* ---------- helpers ---------- */
const parseDate = (s) => {
  if (s == null) return null;
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(s);
  if (!m) return NaN;
  return Number(m[1]) + (m[2] ? (Number(m[2]) - 1) / 12 : 0) + (m[3] ? (Number(m[3]) - 1) / 365 : 0);
};

const checkRefs = (ownerId, refs, { requireNonFindingAid = true } = {}) => {
  if (!Array.isArray(refs) || refs.length === 0) {
    err(ownerId, "no sourceRefs (unsourced claim)");
    return;
  }
  let substantive = 0;
  for (const r of refs) {
    const s = sources.get(r.sourceId);
    if (!s) { err(ownerId, `unknown sourceId '${r.sourceId}'`); continue; }
    if (s.tier !== "finding-aid" && !/UNVERIFIED/.test(s.verification?.bibliographic ?? "")) substantive++;
    if (r.pages == null) warn(ownerId, `page locator pending for ${r.sourceId}`);
    else if (!s.verification?.pagesChecked) warn(ownerId, `pages given for ${r.sourceId} but registry says pagesChecked=false`);
  }
  if (requireNonFindingAid && substantive === 0) err(ownerId, "supported only by finding-aid or unverified sources");
};

// Digits that are not plausible years, and cardinal-magnitude words.
const NUMBER_WORDS = /\b(hundred|hundreds|thousand|thousands|lakh|lakhs|crore|million|millions|tens of)\b/i;
const findUnsourcedNumbers = (text) => {
  const hits = [];
  for (const m of text.matchAll(/\b\d[\d,.]*\b/g)) {
    const n = Number(m[0].replace(/,/g, ""));
    const isYear = /^\d{4}$/.test(m[0]) && n >= 1100 && n <= 2030;
    const isDayOfMonth = /^\d{1,2}$/.test(m[0]) && /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(text.slice(Math.max(0, m.index - 12), m.index + 14));
    const isOrdinalCentury = /^\d{1,2}$/.test(m[0]) && /^(st|nd|rd|th)\b/.test(text.slice(m.index + m[0].length));
    if (!isYear && !isDayOfMonth && !isOrdinalCentury) hits.push(m[0]);
  }
  const w = NUMBER_WORDS.exec(text);
  if (w) hits.push(w[0]);
  return hits;
};

/* ---------- places & polities ---------- */
for (const p of gaz.places) {
  if (p.coord) {
    const [lon, lat] = p.coord;
    if (!(lon >= BBOX.minLon && lon <= BBOX.maxLon && lat >= BBOX.minLat && lat <= BBOX.maxLat))
      err(p.id, `coordinate ${p.coord} outside study bbox (possible lat/lon swap)`);
  } else if (p.precision !== "unidentified") err(p.id, "coord is null but precision is not 'unidentified'");
  if (p.coord && p.precision === "unidentified") err(p.id, "unidentified place must not carry a coordinate");
  if (!p.coordVerified && p.coord) warn(p.id, "coordinate not yet verified");
  for (const r of p.sourceRefs ?? []) if (!sources.has(r.sourceId)) err(p.id, `unknown sourceId '${r.sourceId}'`);
  if ((p.sourceRefs ?? []).length === 0 && p.kind !== "region-label") warn(p.id, "place has no source (orientation label?)");
}

/* ---------- events ---------- */
const episodes = new Map(chrono.episodes.map((e) => [e.number, e]));
const occupations = [];
const ends = new Set();

for (const e of chrono.events) {
  const id = e.id;
  for (const f of ["id", "episode", "title", "date", "summary", "participants", "locations", "sourceRefs", "confidence", "claimStatus", "eventType", "territorialEffect", "narration", "numericClaims", "animationInstructions"])
    if (!(f in e)) err(id, `missing field '${f}'`);

  if (!CONF.has(e.confidence?.level)) err(id, `invalid confidence '${e.confidence?.level}'`);
  if (!STATUS.has(e.claimStatus)) err(id, `invalid claimStatus '${e.claimStatus}'`);
  if (e.claimStatus === "traditional" && e.confidence?.level !== "D") warn(id, "traditional claim should normally be confidence D");
  if (e.confidence?.level === "A" && e.sourceRefs?.every((r) => sources.get(r.sourceId)?.tier !== "primary"))
    warn(id, "confidence A without a primary source");

  checkRefs(id, e.sourceRefs);

  // dates
  const d = e.date ?? {};
  if (d.precision === "undated") {
    if (e.claimStatus !== "traditional") err(id, "undated event must be marked traditional");
  } else {
    const s = parseDate(d.start);
    const en = d.end ? parseDate(d.end) : s;
    if (s == null || Number.isNaN(s)) err(id, `unparseable start date '${d.start}'`);
    else {
      if (s < YEAR_MIN || en > YEAR_MAX + 1) err(id, `date outside ${YEAR_MIN}-${YEAR_MAX}`);
      if (en < s) err(id, "end date before start date");
      const ep = episodes.get(e.episode);
      if (!ep) err(id, `unknown episode ${e.episode}`);
      else {
        const es = parseDate(ep.range.start), ee = parseDate(ep.range.end) + 1;
        if (s < es || s > ee) warn(id, `start ${d.start} outside episode ${e.episode} range ${ep.range.start}-${ep.range.end}`);
      }
    }
  }

  // references
  for (const p of e.participants ?? []) if (!polities.has(p)) err(id, `unknown polity '${p}'`);
  for (const l of e.locations ?? []) if (!places.has(l)) err(id, `unknown place '${l}'`);
  for (const a of e.animationInstructions ?? []) {
    for (const k of ["placeId", "from", "to"]) if (a[k] && !places.has(a[k])) err(id, `animation references unknown place '${a[k]}'`);
    for (const v of a.via ?? []) if (!places.has(v)) err(id, `route via unknown place '${v}'`);
    for (const v of a.placeIds ?? []) if (!places.has(v)) err(id, `overlay references unknown place '${v}'`);
    if (a.polity && !polities.has(a.polity)) err(id, `animation references unknown polity '${a.polity}'`);
    if (a.snapshotId && !snapshots.has(a.snapshotId)) err(id, `animation references unknown snapshot '${a.snapshotId}'`);
    if (a.kind === "route" && a.style === "documented-route" && e.confidence.level !== "A")
      err(id, "documented-route style requires confidence A; use schematic-corridor");
    if (a.kind === "route") for (const v of a.via ?? []) if (places.get(v)?.precision === "unidentified") err(id, `route passes through unidentified place '${v}'`);
  }
  for (const sid of e.territorialEffect?.snapshotIds ?? []) if (!snapshots.has(sid)) err(id, `unknown snapshot '${sid}'`);

  // numbers
  const texts = [e.summary, e.narration?.short, e.narration?.long].filter(Boolean);
  for (const t of texts) {
    const hits = findUnsourcedNumbers(t);
    if (hits.length && (e.numericClaims ?? []).length === 0) err(id, `unsourced number(s) in text: ${hits.join(", ")}`);
  }
  for (const nc of e.numericClaims ?? []) {
    if (!nc.sourceRef || !sources.has(nc.sourceRef.sourceId)) err(id, `numericClaim '${nc.what}' lacks a valid sourceRef`);
    else if (sources.get(nc.sourceRef.sourceId).tier === "finding-aid") err(id, `numericClaim '${nc.what}' sourced only to a finding aid`);
  }

  // traditional sayings must never be presented as quotations without a note
  for (const ts of e.narration?.traditionalSayings ?? []) if (!ts.note) err(id, "traditional saying lacks a provenance note");

  // occupation pairing
  const t = e.territorialEffect?.type;
  if (t === "occupation-begins") occupations.push(e);
  if (t === "occupation-ends" || t === "withdrawal") ends.add(e.territorialEffect.actor);
  for (const a of e.animationInstructions ?? []) if (a.kind === "occupationOverlay" && a.endsWithEvent) ends.add(`event:${a.endsWithEvent}`);
}

for (const o of occupations) {
  const overlay = (o.animationInstructions ?? []).find((a) => a.kind === "occupationOverlay");
  const pairedByOverlay = overlay?.endsWithEvent && chrono.events.some((x) => x.id === overlay.endsWithEvent);
  const pairedByArrow = (o.animationInstructions ?? []).some((a) => a.kind === "arrow" && a.style === "retreat");
  const pairedLater = ends.has(o.territorialEffect.actor);
  const supersededNote = /withdraw|followed|short occupation|undecided|regained|restored/i.test(`${o.summary} ${o.territorialEffect.notes ?? ""}`);
  if (!pairedByOverlay && !pairedByArrow && !pairedLater && !supersededNote)
    warn(o.id, "occupation has no recorded end/withdrawal - make sure it is not shown as permanent annexation");
}

/* ---------- snapshots & geometry ---------- */
const linked = new Set(chrono.events.map((e) => e.id));
for (const s of snapIndex.snapshots) {
  for (const le of s.linkedEvents ?? []) if (!linked.has(le)) err(s.id, `snapshot links unknown event '${le}'`);
  if (s.status === "planned") continue;
  if (!s.file) { err(s.id, "non-planned snapshot has no file"); continue; }
  const fp = join(root, "data/geo/snapshots", s.file);
  if (!existsSync(fp)) { err(s.id, `missing geometry file ${s.file}`); continue; }
  const fc = JSON.parse(readFileSync(fp, "utf8"));
  if (fc.type !== "FeatureCollection") err(s.id, "geometry is not a FeatureCollection");
  for (const [i, f] of (fc.features ?? []).entries()) {
    const fid = `${s.id}#${i}`;
    const pr = f.properties ?? {};
    for (const k of ["polity", "status", "confidence", "edgeDerivation", "sourceRefs", "usesModernBoundary"]) if (!(k in pr)) err(fid, `feature missing property '${k}'`);
    if (pr.polity && !polities.has(pr.polity)) err(fid, `unknown polity '${pr.polity}'`);
    if (pr.sourceRefs) checkRefs(fid, pr.sourceRefs);
    if (pr.usesModernBoundary && !pr.displayCaveat) err(fid, "uses a modern boundary without a visible displayCaveat");
    if (["C", "D"].includes(pr.confidence) && !pr.displayCaveat) err(fid, "low-confidence geometry needs a displayCaveat");
    const g = f.geometry;
    const polys = g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of polys) for (const ring of poly) {
      if (ring.length < 4) err(fid, "ring has fewer than 4 positions");
      const [a, b] = [ring[0], ring[ring.length - 1]];
      if (a[0] !== b[0] || a[1] !== b[1]) err(fid, "ring not closed");
      for (const [lon, lat] of ring) if (lon < BBOX.minLon || lon > BBOX.maxLon || lat < BBOX.minLat || lat > BBOX.maxLat) { err(fid, "vertex outside bbox"); break; }
    }
  }
}

/* ---------- report ---------- */
const pendingPages = warnings.filter((w) => w.includes("page locator pending")).length;
const otherWarnings = warnings.filter((w) => !w.includes("page locator pending"));
console.log(`Sources: ${sources.size}  Places: ${places.size}  Polities: ${polities.size}  Events: ${chrono.events.length}  Snapshots: ${snapshots.size}`);
console.log(`\nWarnings (${warnings.length}; ${pendingPages} are pending page locators):`);
for (const w of otherWarnings) console.log("  ! " + w);
console.log(`\nErrors (${errors.length}):`);
for (const e of errors) console.log("  x " + e);
const fail = errors.length > 0 || (strict && warnings.length > 0);
console.log(fail ? "\nFAIL" : "\nOK (no blocking errors)");
process.exit(fail ? 1 : 0);
