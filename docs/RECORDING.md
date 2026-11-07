# Recording guide (reels)

## Setup (once)

```bash
npm install
npm run fetch:terrain   # ~23 MB of relief tiles into public/tiles (git-ignored)
npm run build
npm start               # http://localhost:3000
```

`public/geo/` (rivers and land) is committed. To refresh it, run `npm run fetch:geo`, which needs `nominatim.openstreetmap.org` to be reachable.

## Export an MP4 (recommended)

With the app running (`npm start`):

```bash
npm run render -- 7
```

```bash
npm run render -- 2 --fps 30 --format 9x16 --base http://localhost:3000
```

This writes `renders/ep07.mp4` at 1080×1920, H.264. Every frame is rendered exactly: the camera and animations are a pure function of time, so the file is smooth even on a slow machine (roughly 10 minutes per minute of video). The video is silent, so add narration and music in your editor. The narration text for each beat is in `data/episodes/epNN.json`.

Built so far: Episode 1 (~52 s), Episode 2 (80 s), Episode 7 (~102 s).

## Add the synthetic narration

```bash
python3 scripts/narrate-videos.py
```

This voices every beat with Piper's free "Ryan" voice and writes `renders/narrated/`, including the complete narrated film. Setup is in the script header. Lines that run long are sped up slightly (at most 1.15×); if a line still doesn't fit, shorten its `narration` text.

## Record a reel live (9:16)

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
