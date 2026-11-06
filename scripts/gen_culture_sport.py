# Generates public/scenes/mizo-first-culture-sport.json: MIZO FIRST on
# entertainment and sport, in the motion-graphics style, ending with a
# montage of the whole MIZO FIRST programme.
# Usage: python3 scripts/gen_culture_sport.py public/scenes/mizo-first-culture-sport.json
#
# Facts: Aizawl FC won the I-League in 2016-17; Mizoram won the Santosh
# Trophy in 2014. Film certification is by the central CBFC. Everything
# else is the MIZO FIRST scenario.
import json, sys

NEON = ["#ff3d7f", "#7b5cff", "#18e0ff"]
FILM = ["#ff9f1c", "#ff3d7f", "#7b5cff"]
SPORT = ["#00e676", "#18e0ff", "#ffd60a"]


def motion(duration, palette, elements, seed=9, grid=True):
    return {"type": "motion", "duration": duration, "palette": palette, "elements": elements, "seed": seed, "grid": grid, "vignette": 0.35}


segments = [
    motion(6, NEON, [
        {"type": "equalizer", "start": 0.2, "y": 0.66},
        {"type": "title", "start": 0.3, "end": 6, "text": "MIZO FIRST", "sub": "CULTURE · SPORT · FUTURE", "size": 150, "y": 0.4},
    ]),
    motion(10, FILM, [
        {"type": "filmstrip", "start": 0.0, "y": 0.1, "y2": 0.93},
        {"type": "title", "start": 0.2, "text": "ZO CINEMA", "sub": "MIZO STORIES, MIZO SCREENS", "size": 120, "y": 0.27, "glow": "#ff9f1c"},
        {"type": "bullets", "start": 1.4, "step": 0.55, "y": 0.4, "items": [
            {"icon": "play", "title": "A state studio and streaming platform", "sub": "Films, series and music made in Mizoram", "color": "#ff9f1c", "size": 34},
            {"icon": "shield", "title": "No state censorship", "sub": "Room for young creators to grow*", "color": "#ff3d7f", "size": 34},
            {"icon": "people", "title": "Take on Bollywood", "sub": "Mizo stories for India and Asia", "color": "#7b5cff", "size": 34},
            {"icon": "music", "title": "Music, gaming and creators", "sub": "Studios, grants and stages in every district", "color": "#18e0ff", "size": 34},
        ]},
        {"type": "note", "start": 3.5, "y": 0.84, "text": "*Film certification is by the central CBFC; the state can drop its own restrictions."},
    ], seed=21, grid=False),
    {"type": "flyover3d", "duration": 9, "jet": {"hidden": True},
     "camera": {"mode": "chase", "distance": 46, "height": 40, "fov": 55, "lookDown": 60},
     "flight": {"speed": 110, "altitude": 470, "weave": 40},
     "terrain": {"seed": 57, "height": 400, "low": "#0f240c", "mid": "#24521f", "high": "#56703c",
                 "flatten": [{"at": 1.0, "side": 1, "dist": 0, "radius": 420, "level": 150}]},
     "sky": {"zenith": "#070b22", "horizon": "#3a3070", "sun": "#c9b8ff", "fog": "#1a1834", "sunElevation": 1},
     "fogNear": 300, "fogFar": 2800, "vignette": 0.5,
     "features": {"stadium": {"at": 1.0, "side": 1, "dist": 0}, "city": {"at": 0.55, "count": 2000, "radius": 300, "side": -1, "dist": 120, "lightSize": 4.5}},
     "title": {"text": "FOOTBALL STATE", "sub": "AIZAWL FC · I-LEAGUE CHAMPIONS 2016-17", "start": 0.3, "end": 8.8, "size": 104, "subSize": 38, "y": 300},
     "cards": [{"start": 3.6, "end": 8.6, "value": 11, "label": "STADIUMS AND ACADEMIES", "sub": "one in every district (scenario)", "color": "#00e676", "y": 0.5}]},
    motion(9, SPORT, [
        {"type": "pitch", "start": 0.0, "y": 0.2, "color": "#00e676"},
        {"type": "title", "start": 0.2, "text": "INVEST IN SPORT", "sub": "SANTOSH TROPHY WINNERS 2014", "size": 104, "y": 0.15, "glow": "#00e676"},
        {"type": "bullets", "start": 1.2, "step": 0.5, "y": 0.36, "items": [
            {"icon": "ball", "title": "Football academies in all 11 districts", "color": "#00e676", "size": 33},
            {"icon": "shield", "title": "A state-backed pro league", "color": "#18e0ff", "size": 33},
            {"icon": "people", "title": "Boxing, athletics, archery, esports", "color": "#ffd60a", "size": 33},
            {"icon": "book", "title": "Sport scholarships and jobs", "color": "#00e676", "size": 33},
        ]},
    ], seed=33),
    motion(10, NEON, [
        {"type": "title", "start": 0.2, "text": "MIZO FIRST", "sub": "ONE PLAN · EVERY MIZO", "size": 110, "y": 0.13},
        {"type": "hexgrid", "start": 0.9, "y": 0.55, "cols": 3, "radius": 112, "items": [
            {"icon": "car", "label": "Taxi pension", "color": "#ffcf3f"},
            {"icon": "road", "label": "641 km expressway", "color": "#ff9a4d"},
            {"icon": "house", "label": "50,000 homes", "color": "#ff7f9e"},
            {"icon": "sun", "label": "1,000 MW solar", "color": "#ffd60a"},
            {"icon": "chip", "label": "Youth compute", "color": "#a58bff"},
            {"icon": "bank", "label": "People's Bank", "color": "#4fc3ff"},
            {"icon": "book", "label": "Free education", "color": "#6ee08a"},
            {"icon": "wrench", "label": "Skills Institute", "color": "#7fd0ff"},
            {"icon": "heart", "label": "Family aid", "color": "#ff7f9e"},
            {"icon": "dome", "label": "New Aizawl", "color": "#d4af37"},
            {"icon": "play", "label": "Zo Cinema", "color": "#ff9f1c"},
            {"icon": "ball", "label": "Football state", "color": "#00e676"},
        ]},
    ], seed=44),
]

starts, t = [], 0
for s in segments:
    starts.append(t)
    t += s["duration"]
say = ["Young Mizoram is *creating*", "*Zo Cinema*: our stories, our screens", "Mizoram is a *football state*",
       "Invest in *sport*, invest in youth", "*Mizo first.* One plan, every Mizo"]
subs = [{"start": round(starts[k] + 0.6, 2), "end": round(starts[k] + segments[k]["duration"] - 0.3, 2), "text": say[k]} for k in range(len(segments))]

scene = {
    "title": "MIZO FIRST: Culture & Sport",
    "note": "Motion-graphics policy video. Facts: Aizawl FC I-League 2016-17; Mizoram Santosh Trophy 2014; CBFC is central. Rest is the MIZO FIRST scenario.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "transition": 0.3, "exposure": 1.1,
    "segments": segments, "subtitles": subs, "subtitleStyle": {"size": 48, "y": 0.9},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(segments)} segments, {t:.1f}s")
