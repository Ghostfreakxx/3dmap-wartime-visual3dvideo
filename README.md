# 3dmap-wartime-visual3dvideo

Data-driven history videos for Reels / Shorts / TikTok (1080×1920). This repo produces two styles, and one video can mix them:

| Segment type | Look | Example |
|---|---|---|
| `flyover3d` | Cinematic 3D flight over golden-hour mountains, with a jet, a location/date title card and narration subtitles | `public/scenes/aizawl-1966.json` |
| `campaign2d` | Animated campaign map with a running date counter, territory per faction, unit flags with troop counts, attack arrows, battles and a legend that sums each side's troops | `public/scenes/egypt-1798.json`, `public/scenes/northeast-burma-1824.json` |

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
  "cities": [ { "name": "Cairo", "at": [31.24, 30.05], "size": 30 } ],
  "keyframes": [
    {
      "date": "1798-07-21",
      "caption": "Battle of the Pyramids",
      "view": [29, 29.4, 32.8, 31.9],
      "territory": { "france": [ [[lon,lat], ...],                 // polygon
                                 { "km": 18, "path": [[lon,lat], ...] } ] },  // corridor along a road/river
      "units":   [ { "id": "main", "faction": "france", "at": [31.1, 30.05], "troops": 25000, "label": "Bonaparte" } ],
      "arrows":  [ { "faction": "france", "path": [[lon,lat], ...] } ],   // drawn while moving INTO this keyframe
      "battles": [ { "at": [31.13, 29.98], "label": "Pyramids" } ]
    }
  ]
}
```

Between keyframes, units with the same `id` glide to their new position while their troop count ticks up or down. A unit missing from the next keyframe fades out, a new one fades in, and territory cross-fades.

## Data accuracy

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
