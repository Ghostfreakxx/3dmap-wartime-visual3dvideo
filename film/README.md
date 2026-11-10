# The Hills They Held

A 92-second animated 3D-map film about how the Mizo people defended the Lushai
Hills (today's Mizoram) until the British annexed them.

The finished film is [`mizo-hills.mp4`](mizo-hills.mp4): 1920×1080, 24 fps,
H.264 with a synthesised soundtrack.

## What it shows

| Time | Section |
|------|---------|
| 0:00 | Title |
| 0:08 | Mizo chiefs rule their own ridge-top villages |
| 0:19 | They hold the hills against rival powers on every side |
| 0:31 | 1850s–60s: British tea gardens push into the Cachar foothills; the chiefs raid the plains |
| 0:43 | 1871–72: the Lushai Expedition, two columns, which then withdraw |
| 0:55 | 1889–90: the Chin-Lushai Expedition; forts at Lungleh and Aijal |
| 1:07 | 1890–95: the chiefs rise; Khuangchera falls at Changsil; Ropuiliani dies in prison |
| 1:19 | 1898: the Lushai Hills become one district of British India |
| 1:26 | Today the land is Mizoram |

## Accuracy

- Places are positioned from their real coordinates. The terrain relief, the
  outline of the hills, the village lights and the routes of the arrows are
  stylised and are not a survey map. The film says so on screen.
- Dates and names were checked against general reference sources, which do not
  always agree on exact dates. Check them against a scholarly history of the
  Lushai Hills before using the film for teaching or publication.
- The story is told in a few on-screen sentences, so it leaves out a great
  deal, including the names of most chiefs and the differences between them.

## Rebuilding it

Needs Node.js, Python 3 with NumPy, and ffmpeg.

```bash
npm install
npx playwright install chromium
npm run build
```

`audio.py` writes the soundtrack, then `render.mjs` draws every frame in a
headless browser and encodes the video. To preview in a browser, serve this
folder and open `index.html?play`.

To change the story, edit the `CAPTIONS`, `DATES` and `CAM` tables in
`scene.js`. Every frame is a pure function of time, so a re-render is exact.
