# Generates public/scenes/fall-of-berlin-1945.json: the Battle of Berlin,
# 16 April - 2 May 1945, with Soviet fronts and German army groups.
# Usage: python3 scripts/gen_fall_of_berlin.py public/scenes/fall-of-berlin-1945.json
#
# Sources: Wikipedia (Battle of Berlin; Battle of the Seelow Heights; Army
# Group Vistula; Battle of Halbe; Battle in Berlin); EBSCO; historyofwar.org.
# Front lines are hand-traced approximations. Per-front Soviet strengths
# are commonly cited figures (Glantz) that were not re-verified here.
import json, sys

C = lambda name, lon, lat, **kw: dict(name=name, at=[lon, lat], **kw)
BERLIN, SEELOW, KUSTRIN = [13.40, 52.52], [14.38, 52.53], [14.63, 52.58]
HALBE, TORGAU, KETZIN, POTSDAM = [13.70, 52.11], [13.00, 51.56], [12.85, 52.48], [13.06, 52.40]
COTTBUS, STETTIN, BEELITZ, REICHSTAG = [14.33, 51.76], [14.55, 53.43], [12.93, 52.24], [13.376, 52.519]

CITIES = [
    C("Berlin", *BERLIN, size=32), C("Seelow", *SEELOW), C("Küstrin", *KUSTRIN), C("Frankfurt (Oder)", 14.55, 52.35),
    C("Stettin", *STETTIN), C("Prenzlau", 13.86, 53.32), C("Neubrandenburg", 13.26, 53.56), C("Eberswalde", 13.82, 52.83),
    C("Cottbus", *COTTBUS), C("Spremberg", 14.37, 51.57), C("Görlitz", 14.99, 51.15), C("Dresden", 13.74, 51.05),
    C("Halbe", *HALBE), C("Zossen", 13.45, 52.22), C("Potsdam", *POTSDAM), C("Ketzin", *KETZIN),
    C("Brandenburg", 12.56, 52.41), C("Torgau", *TORGAU), C("Magdeburg", 11.63, 52.13), C("Wittenberg", 12.65, 51.87),
    C("Rostock", 12.10, 54.09), C("Wismar", 11.46, 53.90), C("Leipzig", 12.37, 51.34),
    C("Reichstag", *REICHSTAG, size=20, maxView=1.2),
    C("BALTIC SEA", 13.2, 54.45, region=True, size=26),
]

SEA = [[10.5, 54.0], [11.0, 54.0], [11.5, 54.02], [12.1, 54.18], [12.6, 54.4], [13.3, 54.32], [13.8, 54.12],
       [14.2, 53.95], [14.5, 53.92], [15.5, 54.18], [16.5, 54.5], [17.2, 54.6], [17.2, 55.5], [10.5, 55.5]]
LAGOON = [[13.85, 53.86], [14.3, 53.86], [14.42, 53.7], [14.0, 53.68]]
RIVERS = [
    {"km": 2.6, "path": [[14.6, 53.9], [14.55, 53.43], [14.45, 53.2], [14.15, 52.98], [14.4, 52.75], [14.63, 52.58], [14.55, 52.35], [14.75, 52.07]]},  # Oder
    {"km": 1.8, "path": [[14.75, 52.07], [14.72, 51.95], [14.65, 51.73], [14.85, 51.4], [14.99, 51.15], [14.9, 50.85]]},  # Neisse
    {"km": 2.4, "path": [[13.74, 51.05], [13.29, 51.31], [13.0, 51.56], [12.65, 51.87], [12.24, 51.83], [11.63, 52.13], [11.97, 52.54], [11.75, 53.0], [11.2, 53.25], [10.5, 53.5]]},  # Elbe
    {"km": 1.2, "path": [[14.35, 51.4], [14.33, 51.76], [14.1, 52.0], [13.75, 52.35], [13.4, 52.52], [13.2, 52.53]]},  # Spree
    {"km": 1.2, "path": [[13.2, 53.1], [13.25, 52.75], [13.2, 52.53], [13.1, 52.42], [12.56, 52.41], [12.3, 52.6], [12.0, 52.85], [11.97, 52.9]]},  # Havel
]

# ---------- territory (approximate) ----------
WEST = [[10.5, 54.5], [11.0, 54.0], [11.3, 53.6], [11.75, 53.0], [11.97, 52.54], [11.7, 52.15], [12.25, 51.83], [12.6, 51.6], [12.9, 51.45], [12.7, 50.6], [10.5, 50.6]]
EAST_0 = [[14.6, 54.7], [17.2, 54.7], [17.2, 50.6], [14.95, 50.6], [15.0, 51.15], [14.75, 51.7], [14.78, 52.07], [14.6, 52.35],
          [14.6, 52.45], [14.42, 52.5], [14.42, 52.62], [14.6, 52.68], [14.45, 53.0], [14.5, 53.3], [14.6, 53.7]]
EAST_19 = [[14.6, 54.7], [17.2, 54.7], [17.2, 50.6], [14.95, 50.6], [14.9, 51.2], [14.3, 51.45], [14.1, 51.7], [14.25, 51.95],
           [14.6, 52.2], [14.3, 52.38], [14.0, 52.5], [13.95, 52.7], [14.25, 52.85], [14.45, 53.0], [14.5, 53.3], [14.6, 53.7]]
EAST_21 = [[14.4, 54.7], [17.2, 54.7], [17.2, 50.6], [14.95, 50.6], [14.4, 51.2], [13.7, 51.5], [13.4, 51.85], [13.45, 52.2],
           [13.9, 52.3], [14.25, 52.2], [14.4, 52.0], [14.6, 52.25], [13.6, 52.48], [13.5, 52.7], [13.85, 52.95], [14.2, 53.2], [14.3, 53.45], [14.4, 53.75]]
EAST_25 = [[14.0, 54.7], [17.2, 54.7], [17.2, 50.6], [13.4, 50.6], [13.0, 51.5], [12.85, 51.9], [12.7, 52.3], [12.8, 52.65],
           [13.15, 52.95], [13.6, 53.1], [13.95, 53.35], [14.1, 53.75]]
EAST_30 = [[13.0, 54.7], [17.2, 54.7], [17.2, 50.6], [13.4, 50.6], [13.0, 51.5], [12.6, 51.95], [12.4, 52.4], [12.3, 52.75],
           [12.4, 53.1], [12.7, 53.6], [12.9, 54.2]]
EAST_F = [[11.6, 54.7], [17.2, 54.7], [17.2, 50.6], [13.4, 50.6], [13.0, 51.5], [12.4, 51.95], [12.0, 52.4], [11.98, 52.7],
          [11.8, 53.0], [11.5, 53.6], [11.5, 54.2]]
import math


def blob(cx, cy, rx, ry, wob=0.12, n=28, seed=1):
    # irregular rounded pocket outline (front lines are never boxes)
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        r = 1 + wob * math.sin(3 * a + seed) + wob * 0.6 * math.sin(5 * a + 2 * seed)
        pts.append([round(cx + rx * r * math.cos(a), 4), round(cy + ry * r * math.sin(a), 4)])
    return pts


POCKET_BERLIN_25 = blob(13.40, 52.50, 0.26, 0.13, seed=1)
POCKET_BERLIN_30 = blob(13.38, 52.515, 0.075, 0.035, wob=0.18, seed=2)
POCKET_HALBE = blob(13.85, 52.12, 0.3, 0.13, seed=3)
CORRIDOR_12 = blob(12.5, 52.25, 0.42, 0.22, seed=4)


def U(id, f, at, n=None, label=None, dx=0, dy=0, mini=False):
    d = dict(id=id, faction=f, at=[at[0] + dx, at[1] + dy])
    if n: d["troops"] = n
    if label: d["label"] = label
    if mini: d["mini"] = True
    return d


ARMY = {
    "2bf": lambda at: U("2bf", "soviet", at, 441600, "2nd Belorussian Front · Rokossovsky"),
    "1bf": lambda at: U("1bf", "soviet", at, 908500, "1st Belorussian Front · Zhukov"),
    "1uf": lambda at: U("1uf", "soviet", at, 550900, "1st Ukrainian Front · Konev"),
    "pol": lambda at: U("pol", "polish", at, label="1st Polish Army"),
    "3pz": lambda at: U("3pz", "german", at, label="3rd Panzer Army · Manteuffel"),
    "9a": lambda at, n=110000: U("9a", "german", at, n, "9th Army · Busse"),
    "4pz": lambda at: U("4pz", "german", at, label="4th Panzer Army (AG Centre)"),
    "berlin": lambda at, n=None: U("berlin", "german", at, n, "Berlin defence area"),
    "12a": lambda at: U("12a", "german", at, label="12th Army · Wenck"),
    "us": lambda at, label="US 9th Army": U("us", "us", at, label=label),
}

KF = []


def kf(**kw):
    KF.append(kw)


V_WIDE = [11.0, 50.7, 16.4, 54.4]
V_BERLIN = [12.3, 51.8, 14.5, 53.1]
V_CITY = [12.85, 52.25, 13.95, 52.8]

kf(date="1945-04-15", hold=5, view=V_WIDE, caption="Eve of the offensive: the Oder-Neisse line",
   say="*April 1945.* Three Soviet fronts stand on the Oder and Neisse, 60 km from *Berlin*",
   territory=dict(soviet=[EAST_0], us=[WEST]),
   units=[ARMY["2bf"]([15.0, 53.45]), ARMY["1bf"]([14.85, 52.6]), ARMY["pol"]([14.85, 52.92]), ARMY["1uf"]([15.2, 51.55]),
          ARMY["3pz"]([14.15, 53.35]), ARMY["9a"]([14.15, 52.48]), ARMY["4pz"]([14.35, 51.55]), ARMY["berlin"](BERLIN),
          ARMY["12a"]([12.25, 52.2]), ARMY["us"]([11.55, 52.4])],
   stats=["Soviet: ~2.5 million men · 6,250 tanks", "German Army Group Vistula: ~500,000 (Heinrici)", "Army Group Centre to the south (Schörner)"])
kf(date="1945-04-16", seconds=4.5, hold=5, caption="16 April: assault on the Seelow Heights",
   say="*16 April.* Zhukov attacks the *Seelow Heights*; Konev crosses the *Neisse*",
   territory=dict(soviet=[EAST_0], us=[WEST]),
   units=[ARMY["2bf"]([15.0, 53.45]), ARMY["1bf"]([14.6, 52.58]), ARMY["pol"]([14.75, 52.9]), ARMY["1uf"]([14.85, 51.6]),
          ARMY["3pz"]([14.15, 53.35]), ARMY["9a"]([14.3, 52.52]), ARMY["4pz"]([14.45, 51.6]), ARMY["berlin"](BERLIN),
          ARMY["12a"]([12.25, 52.2]), ARMY["us"]([11.55, 52.4])],
   fights=[dict(a="1bf", b="9a", intensity=3), dict(a="1uf", b="4pz", intensity=3)],
   battles=[dict(at=SEELOW, label="Seelow Heights")])
kf(date="1945-04-19", seconds=4.5, hold=5, caption="19 April: the Seelow Heights fall",
   say="After four days the heights fall, at a cost of over *30,000* Soviet dead",
   territory=dict(soviet=[EAST_19], us=[WEST]),
   arrows=[dict(faction="soviet", path=[[14.6, 52.55], [14.3, 52.55], [14.0, 52.58]]), dict(faction="soviet", path=[[14.8, 51.65], [14.45, 51.7], [14.2, 51.72]])],
   units=[ARMY["2bf"]([15.0, 53.45]), ARMY["1bf"]([14.05, 52.6]), ARMY["pol"]([14.3, 52.85]), ARMY["1uf"]([14.25, 51.62]),
          ARMY["3pz"]([14.15, 53.35]), ARMY["9a"]([13.95, 52.38], 80000), ARMY["4pz"]([14.05, 51.45]), ARMY["berlin"](BERLIN),
          ARMY["12a"]([12.25, 52.2]), ARMY["us"]([11.55, 52.4])],
   fights=[dict(a="1bf", b="9a", intensity=2), dict(a="1uf", b="4pz", intensity=2)],
   stats=["Seelow Heights, 16-19 April", "9th Army held ~110,000 men here", "Soviet killed: over 30,000"])
kf(date="1945-04-21", seconds=4.5, hold=5, view=V_BERLIN, caption="20-21 April: Berlin within range",
   say="*20 April.* Rokossovsky crosses the lower Oder; Soviet guns *shell Berlin*",
   territory=dict(soviet=[EAST_21], us=[WEST]),
   arrows=[dict(faction="soviet", path=[[14.0, 52.6], [13.75, 52.55], [13.58, 52.52]]), dict(faction="soviet", path=[[14.2, 51.75], [13.7, 51.9], [13.45, 52.2]]),
           dict(faction="soviet", path=[[14.55, 53.3], [14.2, 53.25], [13.95, 53.2]])],
   battles=[dict(at=BERLIN, label="Berlin under fire")],
   units=[ARMY["2bf"]([14.05, 53.25]), ARMY["1bf"]([13.7, 52.58]), ARMY["pol"]([13.95, 52.85]), ARMY["1uf"]([13.5, 52.12]),
          ARMY["3pz"]([13.7, 53.35]), ARMY["9a"]([13.9, 52.22], 80000), ARMY["4pz"]([13.85, 51.5]), ARMY["berlin"](BERLIN),
          ARMY["12a"]([12.3, 52.2]), ARMY["us"]([11.75, 52.3])],
   fights=[dict(a="1bf", b="berlin", intensity=2), dict(a="2bf", b="3pz", intensity=2)])
kf(date="1945-04-24", seconds=4.5, hold=5, caption="24 April: 9th Army trapped at Halbe",
   say="*24 April.* The German 9th Army is cut off in the *Halbe pocket*",
   territory=dict(soviet=[EAST_21], german=[POCKET_HALBE], us=[WEST]),
   units=[ARMY["2bf"]([13.95, 53.3]), ARMY["1bf"]([13.6, 52.62]), ARMY["pol"]([13.75, 52.85]), ARMY["1uf"]([13.25, 52.25]),
          ARMY["3pz"]([13.55, 53.4]), ARMY["9a"]([13.85, 52.12], 80000), ARMY["4pz"]([13.85, 51.45]), ARMY["berlin"](BERLIN),
          ARMY["12a"]([12.35, 52.2]), ARMY["us"]([11.75, 52.3])],
   fights=[dict(a="1uf", b="9a", intensity=2), dict(a="1bf", b="berlin", intensity=2)],
   battles=[dict(at=HALBE, label="Halbe pocket")])
kf(date="1945-04-25", seconds=4.5, hold=6, view=[12.2, 51.35, 14.6, 53.0], caption="25 April: Berlin encircled; Elbe Day at Torgau",
   say="*25 April.* Zhukov and Konev close the ring at *Ketzin*; US and Soviet troops meet at *Torgau*",
   territory=dict(soviet=[EAST_25], german=[POCKET_BERLIN_25, POCKET_HALBE, CORRIDOR_12], us=[WEST]),
   arrows=[dict(faction="soviet", path=[[13.5, 52.7], [13.1, 52.65], [12.88, 52.5]]), dict(faction="soviet", path=[[13.25, 52.25], [13.0, 52.32], [12.88, 52.45]])],
   battles=[dict(at=KETZIN, label="Ring closed"), dict(at=TORGAU, label="Elbe Day")],
   units=[ARMY["2bf"]([13.7, 53.35]), ARMY["1bf"]([13.4, 52.68]), ARMY["pol"]([13.1, 52.75]), ARMY["1uf"]([13.25, 52.3]),
          ARMY["3pz"]([13.35, 53.45]), ARMY["9a"]([13.85, 52.12], 80000), ARMY["berlin"](BERLIN),
          ARMY["12a"]([12.45, 52.2]), ARMY["us"]([12.75, 51.5], "US 69th Infantry Division"), U("58g", "soviet", [13.15, 51.6], label="58th Guards Rifle Div.")],
   stats=["Berlin garrison: ~45,000 troops", "plus ~40,000 Volkssturm", "Weidling in command since 23 April"])
kf(date="1945-04-28", seconds=4.5, hold=5, view=V_CITY, caption="28 April: Wenck strikes toward Potsdam",
   say="Wenck's *12th Army* attacks toward Potsdam, but cannot break through",
   territory=dict(soviet=[EAST_25], german=[POCKET_BERLIN_25, POCKET_HALBE, CORRIDOR_12], us=[WEST]),
   arrows=[dict(faction="german", path=[[12.6, 52.2], [12.85, 52.25], [12.98, 52.3]])],
   units=[ARMY["1bf"]([13.5, 52.6]), ARMY["1uf"]([13.25, 52.4]), ARMY["berlin"]([13.38, 52.5]),
          ARMY["12a"]([12.98, 52.28]), ARMY["9a"]([13.7, 52.27], 80000)],
   fights=[dict(a="12a", b="1uf", intensity=2), dict(a="1bf", b="berlin", intensity=3)])
kf(date="1945-04-30", seconds=4.5, hold=6, caption="30 April: the Reichstag is stormed",
   say="*30 April.* Soviet troops storm the *Reichstag*; Hitler kills himself in his bunker",
   territory=dict(soviet=[EAST_30], german=[POCKET_BERLIN_30, CORRIDOR_12], us=[WEST]),
   units=[ARMY["1bf"]([13.42, 52.56]), ARMY["1uf"]([13.3, 52.46]), ARMY["berlin"]([13.37, 52.51]),
          ARMY["12a"]([12.9, 52.25])],
   fights=[dict(a="1bf", b="berlin", intensity=3), dict(a="1uf", b="berlin", intensity=2)],
   battles=[dict(at=REICHSTAG, label="Reichstag")])
kf(date="1945-05-02", seconds=5, hold=7, view=V_BERLIN, caption="2 May: Berlin surrenders",
   say="*2 May.* General Weidling surrenders Berlin to Chuikov. The battle is over",
   territory=dict(soviet=[EAST_F], us=[WEST]),
   units=[ARMY["2bf"]([13.0, 53.6]), ARMY["1bf"]([13.4, 52.55]), ARMY["1uf"]([13.0, 52.0]),
          ARMY["us"]([11.7, 52.6], "US 9th Army")],
   stats=["Berlin garrison surrenders, 2 May 1945", "Germany capitulates on 8 May"])

subs, t = [(0.3, KF[0]["hold"], KF[0]["say"])], KF[0]["hold"]
for k in KF[1:]:
    subs.append((t + k["seconds"] * 0.45, t + k["seconds"] + k["hold"] - 0.15, k["say"]))
    t += k["seconds"] + k["hold"]
for k in KF:
    k.pop("say")

scene = {
    "title": "The Fall of Berlin, 1945",
    "note": "Front lines are approximate. Soviet per-front strengths are commonly cited (Glantz) figures; see README.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None,
    "segments": [{
        "type": "campaign2d", "duration": round(t, 2), "hold": 0, "bbox": [10.0, 50.3, 17.5, 55.0], "view": V_WIDE,
        "caption": "THE FALL OF BERLIN", "legendBottom": 380,
        "footnote": "Front lines approximate. Strengths as commonly cited.",
        "style": {"land": ["#a39a7a", "#bdb38e", "#837a5c"], "water": "#2a4a78", "river": "#35609c", "territoryAlpha": 0.55},
        "defaultFaction": "german",
        "factions": [
            {"id": "soviet", "name": "Soviet Red Army", "color": "#d32f2f", "flag": {"type": "solid", "color": "#c62828", "star": "#ffd600"}},
            {"id": "polish", "name": "Polish People's Army", "color": "#e57373", "flag": {"type": "bicolor-h", "colors": ["#ffffff", "#dc143c"]}},
            {"id": "german", "name": "German Wehrmacht", "color": "#5f6368", "flag": {"type": "cross", "bg": "#7a7f86"}},
            {"id": "us", "name": "United States Army", "color": "#3f6fd6", "flag": {"type": "usa"}},
        ],
        "layers": {"water": [SEA, LAGOON], "rivers": RIVERS},
        "cities": CITIES, "keyframes": KF,
    }],
    "subtitles": [{"start": round(a, 2), "end": round(b, 2), "text": tx} for a, b, tx in subs],
    "subtitleStyle": {"size": 46, "y": 0.885},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(KF)} keyframes, {t:.1f}s")
