/**
 * Domain schema for the Ahom Kingdom map documentary.
 *
 * These types are framework-agnostic: they describe the JSON in /data and are
 * consumed by React components later. Data lives in /data, never inside
 * components. `scripts/validate-research.mjs` enforces the same rules at
 * build time (to be ported to TypeScript in Phase 2).
 *
 * Guiding rule: the data model must be able to say "we don't know".
 * Every optional precision field exists so that uncertainty is stored, not hidden.
 */

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export type SourceTier = "primary" | "scholarly" | "official" | "reference" | "finding-aid";

export interface SourceRecord {
  id: string;
  tier: SourceTier;
  authors: string[];
  title: string;
  edition?: string;
  publisher?: string;
  place?: string;
  year: number | null;
  isbn?: string;
  doi?: string;
  urls: string[];
  notes: string;
  verification: {
    bibliographic: string;
    /** true only once the cited pages have been seen in a named edition */
    pagesChecked: boolean;
    /** how pages were checked (e.g. OCR running heads vs page images) */
    pagesCheckedMethod?: string;
    checkedOn: string;
    by: string;
  };
  access: string;
}

export interface SourceRef {
  sourceId: string;
  /** e.g. "pp. 12-14". null until physically verified. Never guessed. */
  pages: string | null;
  /** Human locator when pages are unknown: chapter, reign heading, article no. */
  locator?: string;
  /** What this source supports in the record (date / location / outcome ...). */
  supports?: Array<"date" | "location" | "participants" | "outcome" | "territory" | "numbers" | "context">;
  note?: string;
}

/**
 * Confidence scale (see docs/research/01-research-plan.md):
 *  A  documented: primary text or multiple independent scholarly sources agree
 *  B  standard scholarly account, chronicle-derived; page locator still pending
 *  C  disputed or approximate: sources disagree, or date/place is inferred
 *  D  traditional/legendary: oral or chronicle tradition, not independently attested
 */
export type ConfidenceLevel = "A" | "B" | "C" | "D";

export type ClaimStatus = "documented" | "disputed" | "approximate" | "traditional";

export interface Confidence {
  level: ConfidenceLevel;
  basis: string;
}

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

export type DatePrecision = "day" | "month" | "season" | "year" | "circa-year" | "decade" | "undated";

/** ISO-like partial date: "1671", "1671-03", "1826-02-24". Proleptic Gregorian unless noted. */
export type PartialDate = string;

export interface HistoricalDate {
  start: PartialDate | null;
  end?: PartialDate | null;
  precision: DatePrecision;
  /** Calendar conversion notes (Tai lakni cycle, Saka, Hijri, Julian) and disagreements. */
  calendarNote?: string;
  /** Alternative dates proposed by other sources. */
  alternatives?: Array<{ value: PartialDate; sourceId: string; note?: string }>;
}

/* ------------------------------------------------------------------ */
/* Actors & places                                                     */
/* ------------------------------------------------------------------ */

export type PolityKind =
  | "kingdom"
  | "empire"
  | "sultanate"
  | "chiefdom-or-confederacy"
  | "company-state"
  | "community" /* non-state peoples: avoid drawing them as kingdoms */
  | "rebel-movement";

export interface Polity {
  id: string;
  name: string;
  altNames?: string[];
  kind: PolityKind;
  /** Restrained documentary palette token, not a flag. */
  colorToken: string;
  notes?: string;
}

export type GeoPrecision =
  | "site" /* identified physical site, < ~1 km */
  | "locality" /* town / village area, ~1-10 km */
  | "regional" /* label anchor for a region; not a site */
  | "unidentified"; /* name known from texts; location not established */

export interface Place {
  id: string;
  name: string;
  altNames?: string[];
  /** [lon, lat] WGS84. null when unidentified. */
  coord: [number, number] | null;
  precision: GeoPrecision;
  kind: "capital" | "fort" | "town" | "battle-site" | "river-point" | "pass" | "lake" | "region-label" | "monument" | "settlement";
  sourceRefs: SourceRef[];
  /** Coordinates must be re-checked against a gazetteer / satellite before Phase 2 rendering. */
  coordVerified: boolean;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* Territory                                                           */
/* ------------------------------------------------------------------ */

/**
 * Political status classes. Each has its own texture in the renderer.
 * Never render "influence-zone" or "unknown" as a crisp border.
 */
export type TerritorialStatus =
  | "direct-rule"
  | "tributary" /* acknowledges overlordship, sends tribute, keeps own ruler */
  | "frontier-arrangement" /* e.g. posa payments to hill communities, duars */
  | "military-occupation" /* temporary; must have a matching withdrawal or annexation */
  | "contested"
  | "influence-zone" /* approximate; soft-edged rendering */
  | "independent-neighbour"
  | "unknown";

export type TerritorialEffectType =
  | "none"
  | "annexation"
  | "occupation-begins"
  | "occupation-ends"
  | "withdrawal"
  | "tributary-relationship"
  | "boundary-agreement"
  | "capital-moved"
  | "territory-lost"
  | "territory-recovered"
  | "sovereignty-renounced"
  | "foundation";

export interface TerritorialEffect {
  type: TerritorialEffectType;
  /** polity gaining/holding */
  actor?: string;
  /** polity losing/subject */
  subject?: string;
  /** Snapshot id(s) in /data/geo/snapshots that show the result. */
  snapshotIds?: string[];
  notes?: string;
}

export interface SnapshotFeatureProps {
  polity: string;
  status: TerritorialStatus;
  confidence: ConfidenceLevel;
  /** How the edge was derived: "Bharali river (treaty)", "foothill contour proxy", "schematic". */
  edgeDerivation: string;
  sourceRefs: SourceRef[];
  /** Mandatory on-screen caveat when geometry is approximate. */
  displayCaveat?: string;
  /** True if any segment follows a modern boundary; triggers a visible label. */
  usesModernBoundary: boolean;
}

export interface TerritorialSnapshot {
  id: string;
  /** The date the snapshot represents. Snapshots are discrete: no interpolation. */
  asOf: HistoricalDate;
  title: string;
  /** GeoJSON FeatureCollection path relative to /data/geo/snapshots */
  file: string;
  linkedEvents: string[];
  status: "planned" | "draft" | "reviewed";
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export type EventType =
  | "migration"
  | "foundation"
  | "accession"
  | "death"
  | "conquest"
  | "battle"
  | "naval-battle"
  | "campaign"
  | "invasion"
  | "occupation"
  | "withdrawal"
  | "treaty"
  | "rebellion"
  | "foreign-intervention"
  | "construction"
  | "administrative"
  | "socio-economic"
  | "diplomacy"
  | "tradition";

export interface CameraView {
  center: [number, number]; // [lon, lat]
  zoom: number;
  bearing?: number;
  pitch?: number;
  /** separate framing for 9:16 vertical recording */
  vertical?: { center: [number, number]; zoom: number };
}

export type AnimationInstruction =
  | { kind: "flyTo"; durationMs: number; view: "event" | CameraView }
  | { kind: "pulseMarker"; placeId: string }
  | { kind: "route"; style: "schematic-corridor" | "documented-route"; via: string[]; label?: string }
  | { kind: "arrow"; polity: string; from: string; to: string; style: "advance" | "retreat" | "raid" | "naval" }
  | { kind: "showSnapshot"; snapshotId: string }
  | { kind: "occupationOverlay"; polity: string; placeIds: string[]; endsWithEvent?: string }
  | { kind: "caption"; text: string; tag?: ClaimStatus }
  | { kind: "battleSequence"; phases: Array<{ label: string; tag: ClaimStatus }> };

export interface NumericClaim {
  value: string; // keep as text, e.g. "about 4 instalments"
  what: string;
  sourceRef: SourceRef;
  confidence: ConfidenceLevel;
  /**
   * attributed = may appear on screen only with its attribution ("the chronicles claim ...").
   * hidden     = kept for research, never displayed.
   * plain      = may be shown without attribution (requires confidence A/B).
   */
  displayPolicy: "attributed" | "hidden" | "plain";
  /** e.g. "Buranji figure reported by Gait" */
  attribution?: string;
}

export interface Narration {
  status: "pending" | "draft" | "reviewed";
  short?: string; // 60-120 s reel segment
  long?: string; // podcast
  /** Traditional sayings must be tagged; never shown as verified quotation. */
  traditionalSayings?: Array<{ text: string; attribution: string; note: string }>;
}

export interface HistoricalEvent {
  id: string;
  episode: number; // 1-12, 13 = epilogue
  title: string;
  date: HistoricalDate;
  summary: string;
  participants: string[]; // polity ids (people go in `persons`)
  persons?: string[];
  locations: string[]; // place ids
  sourceRefs: SourceRef[];
  confidence: Confidence;
  claimStatus: ClaimStatus;
  eventType: EventType;
  territorialEffect: TerritorialEffect;
  /** Unsourced numbers are forbidden; any number in summary/narration must appear here. */
  numericClaims: NumericClaim[];
  disputes?: string[];
  narration: Narration;
  cameraView: CameraView | null;
  animationInstructions: AnimationInstruction[];
  /** Free-text editorial notes; manual corrections are logged here. */
  editorLog?: Array<{ date: string; note: string }>;
}

export interface Episode {
  number: number;
  title: string;
  range: { start: PartialDate; end: PartialDate };
  eventIds: string[];
  snapshotIds: string[];
}
