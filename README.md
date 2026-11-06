# 3dmap-wartime-visual3dvideo

Data-driven history videos for Reels / Shorts / TikTok (1080×1920). This repo produces two styles, and one video can mix them:

| Segment type | Look | Example |
|---|---|---|
| `flyover3d` | Cinematic 3D flight over golden-hour mountains, with a jet, a location/date title card and narration subtitles | `public/scenes/aizawl-1966.json` |
| `campaign2d` | Animated campaign map with a running date counter, territory per faction, unit flags with troop counts, attack arrows, battles and a legend that sums each side's troops | `public/scenes/egypt-1798.json`, `public/scenes/northeast-burma-1824.json`, `public/scenes/mizo-insurgency-1966.json`, `public/scenes/mizo-insurgency-detailed.json`, `public/scenes/mizoram-2047.json`, `public/scenes/mizo-first-2047.json` (promo), `public/scenes/new-aizawl.json`, `public/scenes/mizo-first-manifesto.json` |

You describe each video in a JSON **scene** file. The same file drives a live preview in the browser and a frame-accurate MP4 render.

## Quick start

```bash
npm install
npm run dev            # open the URL, pick a scene, press Play / Space
```

Rendering to MP4 needs [Playwright](https://playwright.dev) (headless Chromium) and `ffmpeg` on your PATH:

```bash
npm i -D playwright && npx playwright install chromium
npm run render -- scenes/aizawl-1966.json                 # -> out/aizawl-1966.mp4
npm run render -- scenes/egypt-1798.json --scale 0.5      # quick half-size preview
npm run render -- scenes/egypt-1798.json --still 12 --out out/thumb.png   # a single frame
npm run render -- scenes/egypt-1798.json --from 5 --to 10 # part of the timeline
```

Set `CHROMIUM_PATH=/path/to/chrome` to use a browser you already have.

## Scene file

```jsonc
{
  "width": 1080, "height": 1920, "fps": 30,
  "audio": "voiceover.mp3",          // optional, relative to the scene file; muxed into the MP4
  "transition": 0.4,                 // fade-through-black between segments (seconds)
  "segments": [ /* played in order */ ],
  "subtitles": [                     // global timeline, in seconds
    { "start": 0.6, "end": 4.4, "text": "March *1966.* Indian Air Force jets" }  // *word* = orange highlight
  ],
  "subtitleStyle": { "size": 58, "y": 0.7, "highlight": "#f5a340" }
}
```

Every layout size is in pixels for a 1080-wide frame and scales automatically.

### `flyover3d`

```jsonc
{
  "type": "flyover3d", "duration": 9,
  "camera":  { "mode": "headon" /* or "chase" */, "distance": 75, "height": 12, "fov": 50 },
  "flight":  { "speed": 140, "altitude": 430, "weave": 50 },
  "terrain": { "seed": 7, "height": 380, "scale": 900, "low": "#1c2610", "mid": "#4d5a22", "high": "#8b7a46" },
  "sky":     { "zenith": "#2b1d3a", "horizon": "#ffb347", "sun": "#fff1b0", "fog": "#b86a3a", "sunElevation": 2 },
  "jet":     { "color": "#7d7f80", "scale": 1 },
  "title":   { "text": "AIZAWL, MIZO HILLS", "sub": "5 MARCH 1966", "start": 0.2, "end": 8.8 }
}
```

Changing `terrain.seed` gives a different range. For desert or snow, change the terrain colours.

### `campaign2d`

```jsonc
{
  "type": "campaign2d", "duration": 26, "hold": 2,   // hold = seconds frozen on the last keyframe
  "bbox": [west, south, east, north],                // whole drawable area (lon/lat)
  "view": [west, south, east, north],                // starting camera; keyframes may set their own
  "timing": "keyframes",   // "date" (default) = time proportional to days; "keyframes" = equal time per step
  "defaultFaction": "ottoman",                       // colours all land not claimed by another faction
  "caption": "NAPOLEON IN EGYPT", "dateFormat": "YYYY/MM/DD",
  "factions": [
    { "id": "france", "name": "French Republic", "color": "#4d6fe0",
      "flag": { "type": "tricolor-v", "colors": ["#002395", "#fff", "#ed2939"] } }
    // flag types: tricolor-v, tricolor-h, crescent {bg, fg}, solid {color}, image {src}
  ],
  "layers": {
    "water":  [ [[lon,lat], ...] ],                   // seas & lakes, drawn above territory
    "rivers": [ { "km": 1.5, "path": [[lon,lat], ...] } ]
  },
  "cities": [ { "name": "Cairo", "at": [31.24, 30.05], "size": 30 },
              { "name": "EAST PAKISTAN", "at": [91.75, 23.25], "region": true, "until": "1971-12-16" } ],
  "footnote": "Small print shown at the bottom of the frame",
  "keyframes": [
    {
      "date": "1798-07-21",
      "caption": "Battle of the Pyramids",
      "view": [29, 29.4, 32.8, 31.9],
      "territory": { "france": [ [[lon,lat], ...],                 // polygon
                                 { "km": 18, "path": [[lon,lat], ...] } ] },  // corridor along a road/river
      "units":   [ { "id": "main", "faction": "france", "at": [31.1, 30.05], "troops": 25000, "label": "Bonaparte" } ],
      "arrows":  [ { "faction": "france", "path": [[lon,lat], ...] } ],   // drawn while moving INTO this keyframe
      "battles": [ { "at": [31.13, 29.98], "label": "Pyramids" } ],
      "fights":  [ { "a": "unitId", "b": "unitId", "intensity": 2 } ],        // exchange of fire (tracers, flashes, hits)
      "airstrikes": [ { "from": [lon,lat], "at": [lon,lat], "label": "Air strike", "passes": 2 } ]
    }
  ]
}
```

`fights` are animated while the map moves toward that keyframe: both sides fire unless `oneWay` is set, and `a`/`b` follow the units as they move (or take fixed `[lon,lat]` points). `airstrikes` show jets making passes over the target with bomb bursts. Like `fights`, they play while the map moves toward the keyframe that lists them, and they stop just before that keyframe's date.

**Infrastructure and dashboards.**
- `routes` on a keyframe (`{kind: sea|river|road|rail|expressway, path, label, status: "stalled"|"planned"}`) draw themselves while the map moves toward that keyframe, then stay on the map.
- Factions can use icon badges: `{"type":"icon","glyph":"sun|house|leaf|chip|shield|anchor|road|rail|coin"}`.
- Factions can set a `unit` (e.g. `"MW"`), so the legend works as a live dashboard of totals.
- Units with `mini: true` shrink to a small icon.
- The legend lists only the factions currently on the map.
- `{"jet":{"hidden":true}}` makes a flyover with no aircraft.

**Cinematic 3D features** (`flyover3d`):
- `features.mist`: drifting valley mist.
- `features.city`: a ridge-top city of pastel houses with tin roofs and evening lights.
- `features.road`: an expressway on viaducts, with pillars and lamps.
- `features.solar`: rows of panels on the hillside.
- `features.planned` with `terrain.flatten`: a planned capital (tower grid that rises toward the centre, boulevards, parks, domed capitol) on a levelled plateau.
- `features.road.traffic`: moving headlights and tail lights.
- `policy` on a segment: a manifesto card (`{num, icon, color, title, context, bullets, note}`) whose bullets appear one at a time.
- `camera.lookDown`: tilts the drone camera toward the ground.
- `cards` on any segment: big count-up numbers, campaign-ad style (`{start, end, value, prefix, suffix, label, sub, color}`).
- Flyovers use ACES filmic tone mapping; set `exposure` on the scene.

**Pacing.** Set `stepSeconds` on the segment, or `seconds` and `hold` on keyframes. `seconds` is the travel time into a keyframe and `hold` is how long the map rests on it. With paced timing, keyframes may also set `dateLabel` (e.g. `"1974"`) when the exact day isn't known, and `stats` (a list of short lines shown in a fact panel). City entries may set `maxView` (degrees across the frame) so neighbourhood labels only appear when zoomed in.

Between keyframes, units with the same `id` glide to their new position while their troop count ticks up or down. A unit missing from the next keyframe fades out, a new one fades in, and territory cross-fades.

## Data accuracy

### MIZO FIRST manifesto (`mizo-first-manifesto.json`)

This is 11 policy cards over cinematic shots, about 2 minutes, generated by `scripts/gen_mizo_first_manifesto.py`. The policies are:
1. Taxi drivers first: pension, family hospital and education cover, a fee-free MizoTaxi, and drivers paid to promote it.
2. Security for every worker.
3. A PWD that builds for Mizos.
4. The Mizoram Skills Institute.
5. Teachers from Mizoram.
6. Recover first, tax later.
7. Stronger families (marriage law, single-parent aid).
8. Support for big families (interest-free loans and write-offs).
9. The Mizoram People's Bank.
10. Service for the youth.
11. Free, compulsory education from 6 to 18.

**Context:**
- The State Transport Authority's notice of 29 May 2026 makes MizoTaxi mandatory in Aizawl from 1 July, and the associations oppose it ([India Today NE](https://www.indiatodayne.in/mizoram/story/mizoram-transport-associations-oppose-mandatory-registration-on-mizotaxi-app-1401233-2026-06-02)).
- About 1,570 vehicles had registered by Sept 2026 ([Northeast News](https://nenews.in/mizoram/mizoram-mulls-extending-mizotaxi-registration-window-by-three-months/64039/)).
- 5,256 two-wheeler taxi permits were issued statewide in 2024 ([Zoram Today](https://zoramtoday.in/Tualchhung%20News/two-wheeler-taxi-permit-aizawl-khawpui-tan-3646-pe-chhuak-tawh/view)).

**Assumptions:** 8,000 drivers, with the state paying ₹1,000 a month each, gives about ₹9.6 crore a year.

**On-screen legal notes:**
- Residence rules for jobs need Parliament (Art. 16(3)).
- Banks need an RBI licence.
- States cannot conscript.
- Income tax and GST are national.
- The RTE Act currently covers ages 6–14.

### Old Aizawl, New Aizawl (`new-aizawl.json`)

This is a 90-second twin-capital scenario:
1. A dusk drone shot over Old Aizawl's ridge city.
2. A local map: Old Aizawl, then the Sairang railhead (2025) and Lengpui airport in the Tlawng valley, then New Aizawl's zones (Capitol, business district, housing, tech park, logistics hub, green belt), then the rapid-transit link and ring road.
3. A drone shot over the planned capital.
4. A finale linking the two cities.

**Facts:** Aizawl city had 293,416 people in the 2011 Census.

**Scenario assumptions:**
- 21,000 phase-1 homes, which is Aizawl's 42% share of the 2047 plan's 50,000.
- 4.5 people per home.
- A design capacity of 3 lakh people.
- A 22 MW compute park.
- The rapid-transit link is the straight-line distance × 1.4, at 60 km/h, which gives about 19.5 km and 19 minutes.

Zone shapes and positions are illustrative, not a site plan. Regenerate with `python3 scripts/gen_new_aizawl.py public/scenes/new-aizawl.json`.

### MIZO FIRST promo (`mizo-first-2047.json`)

This is an 83-second, campaign-style cut of the Mizoram 2047 scenario. It has six drone shots (mist, expressway, city at dusk, solar belt, farms and battalions, final city) with count-up number cards, plus a short Kaladan and gateway map. All its numbers are imported from `scripts/gen_mizoram_2047.py`, so it always agrees with the explainer. Regenerate it with `python3 scripts/gen_mizo_first_promo.py public/scenes/mizo-first-2047.json` (run after the 2047 scene).

### Mizoram 2047 (`mizoram-2047.json`): a scenario, not a forecast

This is a 3-minute video: a 3D intro, then a map in two parts. Edit and regenerate it with `scripts/gen_mizoram_2047.py`; every projection is computed from the `ASSUMPTIONS` block in that file.

**Part 1, sourced facts:**
- Kaladan Multi-Modal corridor: Sittwe port is operational, the target is 2027 ([PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2142948)), and the ~109 km Paletwa–Zorinpui road is stalled by the Arakan conflict ([ORCA](https://orcasia.org/article/1159/indias-kaladan-conundrum), [Wikipedia](https://en.wikipedia.org/wiki/Kaladan_Multi-Modal_Transit_Transport_Project); the 109 km figure is from a secondary source).
- The corridor saves ~700 km on the Kolkata–Mizoram journey.
- Bairabi–Sairang rail: 51.38 km, opened 13 Sep 2025 ([Onmanorama](https://www.onmanorama.com/travel/travel-news/2025/09/11/india-railways-connects-mizoram-northeast.html)).
- India–ASEAN trade: $123 bn in FY2024-25 ([MEA](https://www.mea.gov.in/Portal/ForeignRelation/India-ASEAN-july-2025.pdf)).
- GSDP: ₹34,003 crore in 2024-25 (revised) and per-capita GSDP of ₹2,87,097 ([PRS](https://prsindia.org/files/budget/budget_state/mizoram/2025/Mizoram_Budget_Analysis_2025-26.pdf)); 9.36% compound growth from 2011-12 to 2024-25 ([Northeast Now](https://nenow.in/north-east-news/mizoram/mizoram-records-9-36-annual-gsdp-growth-over-13-years.html)).
- Solar: 9.09 GW potential and 1.53 MW installed in 2021 (MNRE annual report 2021-22).
- Jhum: 40,100 ha in 2005-06, down to 18,107 ha in 2022-23 ([LifeGate](https://www.lifegate.com/controversial-slash-and-burn-farming-method-destroys-green-cover-in-mizoram), state data).
- Land ownership is restricted to tribals under Article 371G ([Drishti](https://www.drishtiias.com/daily-updates/daily-news-analysis/article-371/print_manually)).
- The Lai, Mara and Chakma ADCs date from 1972 under the Sixth Schedule ([Wikipedia](https://en.wikipedia.org/wiki/Chakma_Autonomous_District_Council), [EastMojo](https://eastmojo.com/news/2022/05/01/explained-the-mara-autonomous-council-and-the-upcoming-elections/)).

**Part 2, scenario:** a hypothetical new right-wing government programme. The default assumptions:
- **Expressway:** the grid is the shortest network linking all 11 district HQs and 4 gates, with road length = straight line × 1.5. It costs ₹30 crore/km, 20% of that is wages at ₹3.6 lakh a year, and it takes 8 years to build. That gives about 21 jobs per km, 641 km and about 13,400 jobs a year.
- **Housing:** 50,000 homes, 30% rented at ₹12,000/month, gives about ₹216 crore a year.
- **Farms:** 18,000 ha converted from jhum.
- **Mizo battalions:** 5 × 1,000. Defence is a Union subject, so in practice this would be done through the Territorial Army or India Reserve Battalions; the video says so.
- **Solar and compute:** 1,000 MW of solar at 1,300 kWh/kWp gives 1.3 TWh a year. 30% of that used for compute gives about 45 MW.
- **Trade:** 1% of India–ASEAN trade gives about $1.2 bn a year.
- **GSDP in 2047:** about ₹2.4 lakh crore on trend (9.36%), or about ₹4.1 lakh crore at 12%.
- **ADCs:** merging the councils would need Parliament to amend the Sixth Schedule; the video says so.

**Geometry:** ADC boundaries, district HQ positions and routes are approximate.


### Mizo insurgency, detailed (`mizo-insurgency-detailed.json`)

This is a 5-minute, 35-event version covering 1961–1987, generated by `scripts/gen_mizo_detailed.py`. In addition to the sources below it uses the [SATP backgrounder](https://www.satp.org/backgrounder/india-insurgencynortheast-mizoram) and [timeline](https://www.satp.org/satporgtp/countries/india/states/mizoram/timeline/1966_86.htm) (1966 toll: 59 security forces and 95 MNA killed, 558 arrested; 75 security forces killed 4 Jan–15 Feb 1967; 1,524 surrenders under the 1968 amnesty). It also uses [The Print (opinion)](https://theprint.in/opinion/1966-iaf-bombing-during-mizo-uprising-was-to-assist-assam-rifles-stop-this-nonsense-talk/1730069/) for the Chanmari ambush on 3 March 1966 (5 jawans killed). For the attacked posts (1 AR at Aizawl, Lunglei and Champhai; 5 BSF at Chawngte, Demagiri, Hnahlan, Marpara, Tipaimukh, Tuipang, Tuipuibari, Vaphai and Vaseitlang) and the relief dates (Aizawl 7 March, Lunglei 14 March, Champhai 15 March, plus 2/11 GR and 3 Bihar on 8 March), it uses the [Military History wiki](https://military-history.fandom.com/wiki/March_1966_Mizo_National_Front_uprising). The 1967 Hmuntlang strike and Operation Blanket come from the [Bombing of Aizawl](https://en.wikipedia.org/wiki/Bombing_of_Aizawl) article, the 5 Nov 1968 raid (3 riflemen killed) from [Prokerala/IANS](https://www.prokerala.com/news/articles/a1693880.html), the convoy ambushes near Saiha, Tuipang and Demagiri from [IJFMR](https://www.ijfmr.com/papers/2025/2/41494.pdf), and the 1974–1985 talks from Wikipedia ([Mizoram Peace Accord](https://en.wikipedia.org/wiki/Mizoram_Peace_Accord), [Laldenga](https://en.wikipedia.org/wiki/Laldenga)) and SATP.

Caveats beyond those listed below:
- Tuipuibari and Vaseitlang are left off the map because I couldn't place them.
- Small posts and the Aizawl neighbourhoods (Chanmari, Dawrpui, Chhinga Veng) are at **approximate positions**.
- The 5 Nov 1968 camp has no recorded location, so its marker is illustrative and says so on screen.
- The convoy ambushes have no recorded dates; they are shown in early 1967 as typical of the period.
- Hmuntlang is not marked, because I couldn't confirm where it is.
- Civilian deaths in the 1966 bombing are contested (13–20; none officially reported).
- The 1976 accord's date differs between sources (Feb or Jul).

### Mizo insurgency (`mizo-insurgency-1966.json`)

Researched from: [MNF uprising](https://en.wikipedia.org/wiki/Mizo_National_Front_uprising), [Bombing of Aizawl](https://en.wikipedia.org/wiki/Bombing_of_Aizawl), [Operation Accomplishment](https://en.wikipedia.org/wiki/Operation_Accomplishment), [Mizoram Peace Accord](https://en.wikipedia.org/wiki/Mizoram_Peace_Accord), [The Print](https://theprint.in/india/when-indira-gandhi-faced-raging-mizo-insurgency-iafs-1966-aizawl-air-strike-birth-of-a-state/1710024/), [Scroll](https://scroll.in/article/804555/50-years-ago-today-indira-gandhi-got-the-indian-air-force-to-bomb-its-own-people), [UCA DADM: India/Mizos](https://uca.edu/politicalscience/dadm-project/asiapacific-region/indiamizos-1960-present), [SVP National Police Academy](https://www.svpnpa.gov.in/svpnpacms/Preview?page_id=8), van Schendel, [*A War Within a War*](https://www.cambridge.org/core/journals/modern-asian-studies/article/abs/war-within-a-war-mizo-rebels-and-the-bangladesh-liberation-struggle/6DA9383CA96555DDE2397C77D720C938) (Modern Asian Studies), and the [Lok Sabha debate of 29-07-1986](https://eparlib.nic.in/bitstream/123456789/819179/1/08_VI_29-07-1986_p179_p179_PII.pdf).

- Sourced: the attacks of 28 Feb / 1 Mar 1966 on Aizawl, Lunglei and Champhai; the declaration of independence on 1 March; IAF strikes on Aizawl on 5–6 March (sources differ, 4–8 March); 8 Sikh's advance from Silchar on 3 March; the army reaching Aizawl on 7 March; 61 Mountain Brigade (4 battalions) in the hills by 15 March; all towns retaken by 25 March; regrouping in 1967 (106 villages, 18 centres, 52,210 people) and 1969 (184 villages, 40 centres, 97,339 people); the CHT camps overrun in Dec 1971 and the flight to Burma; Union Territory on 21 Jan 1972; the Aizawl police HQ attack on 13 Jan 1975 (one source says the 14th); the accord on 30 Jun 1986; 572 cadres overground (another figure is 525 by 28 Jul 1986); statehood on 20 Feb 1987.
- **Indian troop figures are nominal unit strengths** (about 800 per battalion, about 120 per Assam Rifles post), not documented counts. **MNA strength is not shown** because no reliable figure was found.
- The **exchanges of fire are illustrative**: they show that fighting was going on in that period and place. They are not a record of specific engagements, except where a caption names one.
- The MNA marker (blue with a white star) is a neutral stand-in, not the MNF's real flag. Use `{"type":"image"}` for the real one.
- Edit the data in `scripts/gen_mizo_insurgency.py`, then regenerate the JSON.


`northeast-burma-1824.json` covers British expansion into Assam, Manipur and the Lushai Hills (Mizoram), and the three Anglo-Burmese wars (1824–26, 1852, 1885), ending with the Lushai Hills district in 1898. Its borders are hand-traced approximations. These troop figures are **placeholders that need checking**: the Burmese garrisons in Assam and Manipur (1824), Maha Bandula's forces, both Lushai Expedition columns (1871), the Chin-Lushai columns (1889–90), the Manipur 1891 columns, and the Aizawl garrison. The Lushai and Chin chiefs have no number on purpose. The Burmese flag is a simplified stand-in for the Konbaung peacock banner; use `{"type":"image"}` for a proper one.

The two sample scenes are **demonstrations**. The Egypt coastlines, territory and troop figures are rough approximations, and the narration has not been fact-checked. Replace them with figures from your own sources before you publish.

## Project layout

```
index.html            preview page (stage + controls)
src/main.js           loads a scene, builds segments, timeline, seek(t)
src/flyover.js        three.js terrain, sky, jet, cameras
src/campaign.js       map projection, territory, units, arrows, battles, legend, date
src/flags.js          procedural / image flags
src/overlay.js        title cards and subtitles
scripts/render.mjs    headless frame-by-frame renderer -> ffmpeg
public/scenes/        scene files (+ index.json for the preview's scene picker)
```
