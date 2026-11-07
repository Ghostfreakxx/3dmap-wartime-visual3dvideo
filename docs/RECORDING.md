# Recording guide (reels)

## Setup (once)

```bash
npm install
npm run fetch:terrain   # ~23 MB of relief tiles into public/tiles (git-ignored)
npm run build
npm start               # http://localhost:3000
```

`public/geo/` (rivers and land) is committed. To refresh it, run `npm run fetch:geo`, which needs `nominatim.openstreetmap.org` to be reachable.

## Record a reel (9:16, ~80 s)

1. Open `http://localhost:3000/watch/2?present=1`. Presentation mode hides all controls.
2. Use phone-shaped framing. The stage keeps a 9:16 box at any window size, so record a tall window or the iPad in portrait.
3. Press **Space** to play. The episode runs once and stops on the last frame.
4. Record with a screen recorder (iPad screen recording, QuickTime, or OBS window capture).

Speak the narration live, or record it separately. The narration text for each beat is on the presenter page and in `data/episodes/ep02.json` (`narration`).

## iPad presenter / teleprompter

Open `/watch/2` and `/present` side by side (iPad Split View, or two windows in the same browser). The remote shows the current and next narration, and has play / back / next, speed, format and camera bookmarks.

## Keys

| Key | Action |
|---|---|
| Space | play / pause |
| ← → | previous / next beat |
| R | replay |
| F | 9:16 ↔ 16:9 |
| P / Esc | presentation mode on / off |
| M | manual map control (drag / zoom) |
| G | Instagram safe-area guides |
| S | source line |
| K | legend |
| N | narrator panel (evidence for the current beat) |
| + / − | speed |
| 1–9 / Shift+1–9 | go to / save camera bookmark |

## What is shown, and why

- **Date counter:** only the precision the sources support. That is a year, or `YYYY/MM/DD` for day-dated events.
- **Coloured areas** are soft-edged and approximate. They are never drawn as borders.
- **Banners** are coloured squares, not flags, because flags would be anachronistic.
- **Counts** appear only when they trace to a page-cited figure, and they are marked `*` = "figure as given in the chronicles".
- **Red arrows** are approximate. No 13th-century route is recorded.
