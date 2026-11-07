# The Ahom Kingdom, 1228–1826: an animated map documentary

A source-first, animated historical map of the rise and decline of the Ahom kingdom in the Brahmaputra valley. It is built for vertical Instagram Reels (9:16) and long-form YouTube or podcast video (16:9).

## Status

- **Research:** all 59 events cite OCR-verified pages (Gait 1906, Bhuyan 1947). Coordinates are checked against Wikidata and OpenStreetMap.
- **App:** a Next.js 16 + MapLibre PWA. Episodes **1** (the Tai world), **2** (over the Patkai) and **7** (Saraighat) are built as 50–100 s vertical map reels, exportable to MP4 with `npm run render -- <episode>`. The other episodes are researched but not yet animated.
- **Record:** see [docs/RECORDING.md](docs/RECORDING.md).

| Read first | |
|---|---|
| [Research plan and evidence rules](docs/research/01-research-plan.md) | Source hierarchy, confidence scale, hard rules |
| [Historical dossier](docs/research/02-dossier.md) | Episode-by-episode synthesis: documented / disputed / approximate / traditional |
| [Uncertainties and gaps](docs/research/03-uncertainties-and-gaps.md) | What must be resolved before animating |
| [Verification log: Gait 1906](docs/research/04-verification-log-gait-1906.md) | Page-verified claims and the corrections they forced |
| [Geographic data plan](docs/design/04-geographic-data-plan.md) | Snapshot model, textures, base layers |
| [Storyboard](docs/design/05-storyboard.md) | Prototype Episode 2 beat sheet + draft narration; outlines for all episodes |
| [Architecture and file structure](docs/design/06-architecture-and-file-structure.md) | Next.js 16 / MapLibre plan, presenter mode, controls |

Data: `data/sources/registry.json` · `data/chronology/events.json` · `data/gazetteer/places.json` · `data/geo/snapshots/index.json` · Schema: `src/domain/types.ts`

## Run

```bash
npm install && npm run fetch:terrain && npm run dev
```

Then open `/watch/2`.

## Validate the research data

```bash
node scripts/validate-research.mjs
```

```bash
node scripts/validate-research.mjs --strict
```

The validator rejects unknown sources, events supported only by finding aids, unsourced numbers, out-of-range or inverted dates, unknown places and polities, invented "documented" routes, out-of-bounds coordinates, and invalid snapshot geometry. `--strict` also fails on warnings, which include pending page numbers and unverified coordinates.

## Ground rules

- No invented army sizes, casualties, routes, dates, speeches or borders.
- Occupation is shown separately from annexation. Tributary areas are not coloured as Ahom territory.
- Modern borders appear only as a labelled orientation layer.
- Every event and overlay carries sources, confidence, and an editable log.
