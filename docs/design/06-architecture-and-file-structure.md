# 06 · Architecture and file structure

## 1. Current repository state (Phase 1)

```
.
├── README.md
├── data/                         # ALL historical content: no React here
│   ├── sources/registry.json     # source registry (18 sources + to-locate list)
│   ├── chronology/events.json    # 13 episodes, 59 typed events
│   ├── gazetteer/places.json     # 42 places + 17 polities, precision-flagged
│   └── geo/snapshots/index.json  # 22 planned snapshots, no geometry yet
├── docs/
│   ├── research/01-research-plan.md
│   ├── research/02-dossier.md
│   ├── research/03-uncertainties-and-gaps.md
│   ├── design/04-geographic-data-plan.md
│   ├── design/05-storyboard.md
│   └── design/06-architecture-and-file-structure.md
├── scripts/validate-research.mjs # zero-dependency validator
└── src/domain/types.ts           # event / place / snapshot schema
```

## 2. Target structure (Phase 2+, Next.js 16 App Router)

```
.
├── app/
│   ├── layout.tsx                 # fonts, theme tokens, PWA manifest link
│   ├── page.tsx                   # episode index
│   ├── watch/[episode]/page.tsx   # interactive viewer (desktop / iPad)
│   ├── stage/[episode]/page.tsx   # clean recording output (16:9 or 9:16 via ?format=)
│   ├── present/page.tsx           # iPad presenter remote
│   ├── editor/page.tsx            # (dev only) manual correction UI for events / overlays
│   └── manifest.ts                # PWA manifest
├── src/
│   ├── domain/                    # types.ts, zod schemas (Phase 2), pure selectors
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   └── timeline.ts            # snapshotAt(date), eventsInRange(), no interpolation
│   ├── data/                      # typed loaders that import /data JSON
│   ├── map/
│   │   ├── MapStage.tsx           # MapLibre instance (client component)
│   │   ├── layers/                # terrain, rivers, polities, textures, places, routes, arrows
│   │   ├── textures/              # SVG/canvas patterns for status classes
│   │   └── camera.ts              # flyTo choreography, bookmarks, vertical framing
│   ├── playback/
│   │   ├── engine.ts              # deterministic beat scheduler (time -> state)
│   │   ├── usePlayback.ts         # play / pause / speed / step / replay
│   │   └── sync.ts                # presenter <-> stage channel
│   ├── ui/
│   │   ├── TimelineSlider.tsx     # 1200-1838, snaps to snapshots/events
│   │   ├── NarratorPanel.tsx
│   │   ├── Subtitles.tsx
│   │   ├── ChapterCard.tsx
│   │   ├── DateBadge.tsx
│   │   ├── Legend.tsx
│   │   ├── SourceChip.tsx
│   │   ├── ClaimTag.tsx           # Documented / Disputed / Approximate / Tradition
│   │   ├── LayerToggles.tsx
│   │   └── SafeAreaOverlay.tsx    # 9:16 Instagram guides (hidden on stage)
│   └── styles/tokens.css          # palette & type tokens, colour-blind-checked
├── data/                          # (as Phase 1, plus geometry)
│   ├── geo/snapshots/*.geojson
│   ├── geo/base/                  # rivers, land, optional modern borders (labelled)
│   └── geo/reference/             # git-ignored georeferenced historical maps
├── public/tiles/                  # self-hosted PMTiles: hillshade, terrain-RGB, vectors
├── scripts/
│   ├── validate-research.mjs      # -> ported to validate.ts (tsx) in Phase 2
│   └── build-tiles.sh             # gdal / tippecanoe / pmtiles pipeline
└── tests/                         # unit (timeline selectors, validator) + Playwright layout tests
```

## 3. Key design decisions

| Decision | Choice | Why |
|---|---|---|
| Map engine | MapLibre GL JS (no API key) + PMTiles | Self-hosted, offline-capable, terrain support, open licence |
| Animation | MapLibre camera API for camera moves. A **deterministic playback engine** maps time to a state (camera, layer opacities, arrow progress), and Framer Motion drives the UI chrome | Deterministic = identical takes for re-recording. Frame-stable on iPad |
| State | Small store (e.g. Zustand) holding `{episode, beatIndex, t, speed, layers, format}` | Easy to serialise for presenter sync |
| Data loading | Static JSON imports, validated at build time | No runtime fetch failures while recording |
| Presenter mode | `/present` on iPad sends commands to `/stage` | See §4 |
| Recording | Screen capture of `/stage` (OBS / QuickTime / iPad screen recording). Optional later: frame-by-frame export via Playwright for perfectly smooth renders | Simple first; deterministic engine enables offline render later |
| PWA | App manifest + service worker caching tiles and data | Offline recording on iPad |
| Manual correction | All content in JSON; `/editor` (dev-only) writes patches; every edit appends to `editorLog` | The brief requires correctable events and overlays |

## 4. Presenter ↔ stage synchronisation (decision needed in Phase 2)

| Option | Works when | Trade-off |
|---|---|---|
| A. `BroadcastChannel` | Presenter and stage in the **same browser** (e.g. two windows on a Mac) | Zero infrastructure; not cross-device |
| B. Tiny local WebSocket relay (`scripts/presenter-relay.mjs`) on the LAN | iPad controls a desktop browser that is recording | Needs a node process during recording |
| C. iPad is both stage and presenter (on-screen remote drawer, hidden from capture by using iPad screen recording of a cropped stage) | Recording on the iPad itself | Simplest for reels; less screen space |

Recommendation: implement **A + C** first (no server), and add **B** if desktop recording with an iPad remote is needed.

## 5. Controls (mapped to the brief)

Play / pause (Space) · Replay episode (R) · Speed 0.5× / 1× / 1.5× / 2× · Next / previous beat (← →) · Camera bookmarks 1–9 (save with Shift+number) · Manual map mode (M: unlocks pan and zoom, playback pauses) · Presentation mode (P: hides all chrome except recording overlays) · Format toggle 16:9 ↔ 9:16 (F) · Layer toggles (L) · Sources (S) · Subtitles (C).

## 6. Testing plan (Phase 8–9)

- Unit tests for `snapshotAt()`, which must never interpolate and must return the latest snapshot ≤ date, and for the validator rules.
- Playwright viewport tests: desktop 1920×1080, iPad Pro 11" landscape and portrait, and stage 1080×1920 with safe-area assertions (no text node intersects the reserved zones).
- `next lint`, `tsc --noEmit`, `next build`, and `validate --strict` in CI.
