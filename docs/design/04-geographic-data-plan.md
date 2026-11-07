# 04 · Geographic data plan

## 1. Principles

1. **Snapshots, not interpolation.** Territory is shown as discrete, dated snapshots (`data/geo/snapshots/index.json`). The timeline slider (1200–1838) jumps to the latest snapshot at or before the selected date and crossfades between snapshots. It never morphs one polygon into another, because that would invent intermediate borders.
2. **Draw at the precision the evidence supports.** The ladder below runs from most to least defensible. Each snapshot uses the *highest rung its sources justify*:
   1. **Point markers**: capitals, forts, battle sites.
   2. **Line features from documented boundaries**: rivers named in treaties (Barnadi 1639, Manas 1682), using river geometry.
   3. **Soft influence zones**: blurred-edge fills built from anchors plus terrain constraints.
   4. **Hard polygons**: only where every edge has a stated derivation.
3. **Every feature carries its evidence**: `polity`, `status`, `confidence`, `edgeDerivation`, `sourceRefs`, `usesModernBoundary`, and `displayCaveat` (see `SnapshotFeatureProps` in `src/domain/types.ts`). The validator rejects geometry that lacks these.
4. **Modern administrative borders are off by default.** If enabled, they appear as a thin dashed grey layer labelled **"Modern boundaries (21st c.), for orientation only"**.

## 2. Territorial status classes and textures

| Status | Meaning | Texture (proposal) |
|---|---|---|
| `direct-rule` | Administered through Ahom officers and paik organisation | Solid muted fill, 35–45 % opacity, crisp edge only where `edgeDerivation` is documented |
| `tributary` | Own ruler, acknowledges overlordship or pays tribute | Diagonal hatch in the overlord's hue over the subject's own fill |
| `frontier-arrangement` | Posa, duars, hostage or trade relations with hill communities | Dotted stipple band along the foothills; no fill |
| `military-occupation` | Temporary, with an end event | Cross-hatch in the occupier's hue; animated "pulse" border; always paired with a withdrawal or end |
| `contested` | Both sides claim or fight over it | Alternating two-hue stripes |
| `influence-zone` | Approximate sphere | Radial-gradient soft fill, no stroke |
| `independent-neighbour` | Another state | Its own muted fill; label in caps |
| `unknown` | No evidence | Not rendered; terrain only |

Palette guidance: desaturated, earth-toned hues on a parchment-and-terrain base, so that political colour never overpowers relief. The Ahom hue should be a muted ochre or saffron family **not** derived from any modern party or state flag. Mughal, Burmese, Koch and Company hues must be distinguishable for colour-blind viewers (test with deuteranopia simulation). No flags; polities are identified by label and colour only.

## 3. Base layers (self-hosted, no third-party tiles at record time)

| Layer | Source (candidate) | Notes |
|---|---|---|
| Hillshade / terrain | Copernicus GLO-90 or SRTM 90 m DEM, rendered to raster tiles (z4–z12) for the study area (lon 85–100, lat 18–30) | Licence check required; bake locally, serve as static PMTiles |
| Optional 3D terrain | Same DEM as terrain-RGB tiles for MapLibre `setTerrain` | Use sparingly (Patkai crossing, Saraighat) |
| Rivers | Natural Earth rivers (small scale) + a hand-checked Brahmaputra/Barak network at larger scale | Labelled "modern river courses". Historical courses differ (gaps register C6) |
| Water bodies | Natural Earth lakes + hand-placed Nong Nyang | |
| Land / sea mask | Natural Earth | |
| Place labels | `data/gazetteer/places.json` | Rendered from our gazetteer, not from basemap POIs |
| Modern borders (optional) | Natural Earth admin-0/1 | **Off by default**, with mandatory label |

Tooling (Phase 2): `gdal` / `rio-rgbify` for terrain-RGB, `tippecanoe` + `pmtiles` for vectors, MapLibre GL JS with the `pmtiles` protocol. No API key is needed and the whole thing works offline, which matters for iPad recording.

## 4. Derivation techniques for zones

- **Valley-floor constraint.** Ahom direct rule centred on the alluvial plain. A DEM contour, for example around the 150–200 m elevation band (threshold to be tested), gives a **"foothill proxy"** edge. Features built this way set `edgeDerivation: "foothill contour proxy (approximate)"` and display the caveat *"Edge follows terrain, not a documented border."*
- **Treaty rivers.** Where a treaty names a river (Barnadi, Manas, and possibly Bharali / Kalang), the edge follows modern river geometry with the caveat *"Modern river course."*
- **Anchor buffers.** For early periods: a soft buffer around evidenced settlements, such as Charaideo, Garhgaon and Sadiya, clipped to the valley floor. Never a crisp polygon.
- **Occupations** are drawn as corridors along the invader's route plus halos on occupied places. They are not filled blocks of the whole kingdom.

## 5. Georeferencing historical maps (reference only)

| Map | Use |
|---|---|
| James Rennell, *Bengal Atlas* (1779–81) | Late-18th-c. river courses and settlement placement (to locate and verify) |
| Atlas sheet "Asie No. 84, Assam et Boutan" (user-supplied; probably Vandermaelen, 1827) | Early-19th-c. European geographic knowledge; place-name forms (e.g. "Ghergong", "Rungpoor"). Its colour bands are **not** used as political boundaries |
| Survey of India historical sheets | Place identification |

Georeferenced rasters stay out of the public build unless their licence allows redistribution. They live in `data/geo/reference/` (git-ignored) and are used only for digitising, with each digitised feature citing the sheet.

## 6. Snapshot production checklist

For each snapshot in `index.json`:

1. Confirm linked events are confidence B or better, with page locators.
2. Choose the rung on the precision ladder (§1.2). Record `method` and `fallback`.
3. Digitise in QGIS, in EPSG:4326, at a reasonable simplification (≤ ~1 km tolerance for zones).
4. Fill every feature property. For confidence C or D, write a `displayCaveat`.
5. Save as `data/geo/snapshots/<id>.geojson` and set `status: "draft"` and `file`.
6. Run `node scripts/validate-research.mjs`, which checks closed rings, bbox, properties and caveats.
7. Peer review, then set `status: "reviewed"`.

## 7. Map layers the app will expose (all toggleable)

Terrain · Rivers · Modern boundaries (off) · Polities (snapshot fills) · Status textures · Frontier arrangements · Places: capitals / forts / battle sites / towns · Region labels (Naga Hills, Lushai Hills, etc.) · Routes & arrows · Occupation overlays · Uncertainty halos · Source chips · Narrator panel · Subtitles · Legend.

## 8. Places required by the brief and their status

| Place | In gazetteer | Precision | Comment |
|---|---|---|---|
| Mong Mao | ✔ | regional | Label only |
| Patkai Hills | ✔ | regional | Label + terrain |
| Charaideo | ✔ | locality | Use UNESCO coordinates once fetched |
| Sadiya | ✔ | locality | River changes |
| Garhgaon | ✔ | locality | |
| Rangpur | ✔ | locality | Sivasagar area; disambiguate from Rangpur, Bangladesh |
| Dimapur | ✔ | site | |
| Guwahati | ✔ | locality | |
| Saraighat | ✔ | regional | Draw as a river reach |
| Itakhuli | ✔ | locality | |
| Manas River | ✔ | regional | Confluence point + river line |
| Brahmaputra | via river layer | — | Modern course |
| Cachar | via Khaspur / Kachari polity | regional | Also a Yandabo state |
| Manipur | ✔ (Imphal) | locality | |
| Naga Hills | ✔ | regional | No polity drawn |
| Lushai Hills | ✔ | regional | No polity drawn |
| Bengal | Dhaka, Sylhet labels | — | Polity fill per period (Sultanate / Mughal / Company) |
| Burmese kingdoms | Ava, Amarapura, Yandabo | locality | Capital label changes with date |
