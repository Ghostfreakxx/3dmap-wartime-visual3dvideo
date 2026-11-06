# 3dmap-wartime-visual3dvideo

Data-driven history videos for Reels / Shorts / TikTok (1080×1920). This repo produces two styles, and one video can mix them:

| Segment type | Look | Example |
|---|---|---|
| `flyover3d` | Cinematic 3D flight over golden-hour mountains, with a jet, a location/date title card and narration subtitles | `public/scenes/aizawl-1966.json` |
| `campaign2d` | Animated campaign map with a running date counter, territory per faction, unit flags with troop counts, attack arrows, battles and a legend that sums each side's troops | `public/scenes/egypt-1798.json`, `public/scenes/northeast-burma-1824.json`, `public/scenes/mizo-insurgency-1966.json` |

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

Between keyframes, units with the same `id` glide to their new position while their troop count ticks up or down. A unit missing from the next keyframe fades out, a new one fades in, and territory cross-fades.

## Data accuracy

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
