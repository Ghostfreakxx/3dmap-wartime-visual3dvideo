# Generates public/scenes/fall-of-berlin-1945-3d.json: the Fall of Berlin as
# a 3D war-table diorama (miniature infantry and tanks on a relief map).
# It reuses the exact keyframes and narration of gen_fall_of_berlin.py and
# adds a camera move per keyframe.
# Usage: python3 scripts/gen_fall_of_berlin_3d.py public/scenes/fall-of-berlin-1945-3d.json
import json, os, runpy, sys

HERE = os.path.dirname(os.path.abspath(__file__))
argv, sys.argv = sys.argv, ["x", os.devnull]
B = runpy.run_path(os.path.join(HERE, "gen_fall_of_berlin.py"))
sys.argv = argv

KF, subs = B["KF"], B["subs"]
CAMS = [
    dict(at=[13.9, 52.35], dist=330, pitch=52, yaw=10),     # 15 Apr: whole front
    dict(at=[14.42, 52.55], dist=60, pitch=24, yaw=250),    # 16 Apr: Seelow assault, low from the east
    dict(at=[14.2, 52.56], dist=90, pitch=32, yaw=220),     # 19 Apr: heights fall
    dict(at=[13.75, 52.55], dist=140, pitch=38, yaw=200),   # 21 Apr: Berlin under fire
    dict(at=[13.8, 52.16], dist=95, pitch=34, yaw=160),     # 24 Apr: Halbe pocket
    dict(at=[13.15, 52.15], dist=260, pitch=50, yaw=180),   # 25 Apr: ring closed + Torgau
    dict(at=[13.05, 52.33], dist=85, pitch=28, yaw=120),    # 28 Apr: Wenck
    dict(at=[13.39, 52.52], dist=34, pitch=22, yaw=200),    # 30 Apr: Reichstag, street level
    dict(at=[13.4, 52.5], dist=150, pitch=48, yaw=230),     # 2 May: surrender
]
for k, cam in zip(KF, CAMS):
    k["camera"] = cam
    k.pop("view", None)
# give the big formations more men and armour on the table
SIZE = {"1bf": (56, 8), "1uf": (48, 7), "2bf": (44, 6), "9a": (40, 3), "berlin": (36, 2), "3pz": (30, 4), "4pz": (28, 4), "12a": (30, 2)}
for k in KF:
    for un in k.get("units", []):
        if un["id"] in SIZE:
            un["infantry"], un["tanks"] = SIZE[un["id"]]

total = KF[0]["hold"] + sum(k["seconds"] + k["hold"] for k in KF[1:])
src = json.load(open(os.path.join(HERE, "..", "public", "scenes", "fall-of-berlin-1945.json")))["segments"][0]
scene = {
    "title": "The Fall of Berlin, 1945 (3D)",
    "note": "3D war-table version of fall-of-berlin-1945.json; same history and caveats.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "exposure": 1.0,
    "segments": [{
        "type": "battle3d", "duration": round(total, 2), "bbox": [10.0, 50.3, 17.5, 55.0], "scale": 100,
        "caption": "THE FALL OF BERLIN", "footnote": "Front lines approximate. Strengths as commonly cited.",
        "defaultFaction": "german", "factions": src["factions"], "layers": src["layers"], "cities": src["cities"],
        "landmark": {"at": B["REICHSTAG"], "name": "Reichstag"},
        "sky": {"top": "#2f3542", "bottom": "#b8916c", "fog": "#8d8277", "sun": "#ffd2a0"},
        "fogNear": 200, "fogFar": 900, "orbit": 1.0, "vignette": 0.55,
        "keyframes": KF,
    }],
    "subtitles": [{"start": round(a, 2), "end": round(b, 2), "text": tx} for a, b, tx in subs],
    "subtitleStyle": {"size": 46, "y": 0.885},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(KF)} keyframes, {total:.1f}s")
