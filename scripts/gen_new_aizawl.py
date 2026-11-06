# Generates public/scenes/new-aizawl.json: "Old Aizawl, New Aizawl", a
# twin-capital scenario. Old Aizawl stays the heritage city on its ridges;
# New Aizawl is a planned capital in the Tlawng valley by the Sairang
# railhead and Lengpui airport.
# Usage: python3 scripts/gen_new_aizawl.py public/scenes/new-aizawl.json
#
# Facts: Aizawl city 293,416 people (Census 2011); Sairang rail since Sept
# 2025; Lengpui airport ~35 km by road. Everything about New Aizawl is a
# SCENARIO, using the Mizoram 2047 model's numbers where they overlap.
import json, math, os, runpy, sys

HERE = os.path.dirname(os.path.abspath(__file__))
argv, sys.argv = sys.argv, ["x", os.devnull]
M = runpy.run_path(os.path.join(HERE, "gen_mizoram_2047.py"))
sys.argv = argv
A, FACTS = M["A"], M["FACTS"]

POP_2011 = 293416
HOMES_AIZAWL = round(A["homes"] * 0.42)      # Aizawl's share of the 2047 scenario's 50,000 homes
HOUSEHOLD = 4.5                              # assumed persons per home
PLANNED_POP = 300000                         # assumed design capacity of New Aizawl by 2047
COMPUTE_MW = round(M["compute_mw"] * 0.5)    # Aizawl compute hub from the 2047 scenario
TRANSIT_KMH = 60

OLD_C, NEW_C = [92.72, 23.73], [92.60, 23.79]
SAIRANG, LENGPUI = [92.655, 23.812], [92.62, 23.84]


def hav(a, b):
    R = 6371
    la1, lo1, la2, lo2 = map(math.radians, (a[1], a[0], b[1], b[0]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


link_km = hav(OLD_C, NEW_C) * 1.4
link_min = link_km / TRANSIT_KMH * 60

# ---------- zones (scenario; approximate) ----------
OLD = [[92.700, 23.805], [92.735, 23.805], [92.758, 23.760], [92.748, 23.700], [92.722, 23.660], [92.700, 23.700], [92.706, 23.760]]
GOV = [[92.585, 23.802], [92.615, 23.802], [92.615, 23.776], [92.585, 23.776]]
CBD = [[92.615, 23.802], [92.640, 23.802], [92.640, 23.776], [92.615, 23.776]]
RES_N = [[92.565, 23.836], [92.640, 23.836], [92.640, 23.802], [92.565, 23.802]]
RES_S = [[92.565, 23.776], [92.642, 23.776], [92.642, 23.740], [92.565, 23.740]]
TECH = [[92.535, 23.802], [92.585, 23.802], [92.585, 23.762], [92.535, 23.762]]
LOGI = [[92.642, 23.830], [92.672, 23.830], [92.672, 23.802], [92.642, 23.802]]
TLAWNG = [[92.66, 23.55], [92.64, 23.66], [92.625, 23.74], [92.622, 23.80], [92.63, 23.86], [92.64, 23.95]]
GREEN = {"km": 0.7, "path": TLAWNG}

C = lambda name, at, **kw: dict(name=name, at=at, **kw)
Z = lambda name, at: C(name, at, region=True, size=17, since="2028-01-01")
CITIES = [
    C("Aizawl", OLD_C, size=26), C("Sairang", SAIRANG, size=20), C("Lengpui", [LENGPUI[0] - 0.012, LENGPUI[1] + 0.012], size=20),
    C("Durtlang", [92.735, 23.79], size=17), C("Bawngkawn", [92.74, 23.76], size=17), C("Chanmari", [92.724, 23.748], size=17),
    C("Kolasib", [92.68, 24.22]), C("Bairabi", [92.55, 24.18]),
    C("OLD AIZAWL", [92.79, 23.70], region=True, size=22, since="2028-01-01"),
    C("NEW AIZAWL", [92.585, 23.87], region=True, size=24, since="2028-01-01"),
    Z("CAPITOL", [92.600, 23.789]), Z("CBD", [92.628, 23.789]), Z("HOMES", [92.60, 23.822]), Z("HOMES", [92.60, 23.755]),
    Z("TECH PARK", [92.555, 23.782]), Z("LOGISTICS", [92.657, 23.822]),
]

V_AZ = [92.45, 23.62, 92.86, 23.97]


def U(id, f, at, n=None, label=None, dx=0, dy=0, mini=False):
    d = dict(id=id, faction=f, at=[at[0] + dx, at[1] + dy])
    if n: d["troops"] = int(round(n))
    if label: d["label"] = label
    if mini: d["mini"] = True
    return d


ZONES = dict(old=[OLD], gov=[GOV], cbd=[CBD], res=[RES_N, RES_S], tech=[TECH], logi=[LOGI], green=[GREEN])
HERIT = U("old", "heritage", [92.725, 23.722], POP_2011, "Old Aizawl · Census 2011", dx=0.03)
RAIL = U("rail", "rail", SAIRANG, label="Sairang railhead", dx=0.02, dy=0.01)
AIR = U("air", "air", LENGPUI, label="Lengpui airport", dx=-0.03, dy=0.012)
CAP = U("cap", "capitol", [92.600, 23.789], label="Assembly & Secretariat", dy=0.003)
HOMES = U("homes", "homes", [92.60, 23.822], HOMES_AIZAWL, "New homes · phase 1", dx=-0.02)
TECHU = U("tech", "compute", [92.555, 23.782], COMPUTE_MW, "Compute park", dx=-0.01)

KF = []


def kf(**kw):
    KF.append(kw)


kf(date="2026-01-01", hold=4.5, view=V_AZ, caption="Old Aizawl today",
   say="*Old Aizawl*: about 3 lakh people on steep ridges, with one road in and out",
   territory=dict(old=[OLD]), units=[HERIT],
   stats=[f"Aizawl city, Census 2011: {POP_2011:,}", "Built along ridges 1,000 m up", "Room to grow: almost none"])
kf(date="2026-01-01", seconds=4.5, hold=4.5, caption="The valley has the rail and the airport",
   say="Below it, the *Tlawng valley* already has the railhead at *Sairang* and *Lengpui* airport",
   territory=dict(old=[OLD]),
   routes=[dict(kind="rail", path=[[92.58, 23.98], [92.6, 23.9], [92.63, 23.85], SAIRANG], label="Bairabi-Sairang rail", labelAt=[92.55, 23.93])],
   units=[{**HERIT, "mini": True}, RAIL, AIR],
   stats=["Sairang: rail to Aizawl since Sept 2025", "Lengpui: Mizoram's airport"])
kf(date="2030-01-01", seconds=5.5, hold=5.5, caption="SCENARIO: New Aizawl",
   say="*Scenario*: a planned capital, *New Aizawl*, rises in the valley between them",
   territory=ZONES, units=[{**HERIT, "mini": True}, {**RAIL, "mini": True}, {**AIR, "mini": True}],
   stats=["Capitol district · business district", "housing · tech park · logistics hub", "green belt along the Tlawng river"])
kf(date="2033-01-01", seconds=4.5, hold=6, caption="Government, homes and jobs move down",
   say=f"The *Assembly and Secretariat*, {HOMES_AIZAWL:,} new homes and a {COMPUTE_MW} MW *compute park*",
   territory=ZONES, units=[{**HERIT, "mini": True}, {**RAIL, "mini": True}, {**AIR, "mini": True}, CAP, HOMES, TECHU],
   stats=[f"Phase 1: {HOMES_AIZAWL:,} homes (~{HOMES_AIZAWL*HOUSEHOLD/1000:.0f},000 people)", f"Planned for {PLANNED_POP/1e5:.0f} lakh people by 2047",
          "(from the Mizoram 2047 scenario)"])
kf(date="2036-01-01", seconds=5, hold=6, caption="Two cities, one network",
   say=f"A *rapid transit line* joins Old and New Aizawl: about {link_km:.0f} km, {link_min:.0f} minutes",
   territory=ZONES,
   routes=[dict(kind="rail", color="#59d0ff", path=[[92.72, 23.735], [92.70, 23.76], [92.67, 23.785], [92.64, 23.79], [92.60, 23.789]], label="Rapid transit", labelAt=[92.70, 23.80]),
           dict(kind="expressway", path=[[92.735, 23.70], [92.70, 23.72], [92.66, 23.75], [92.645, 23.768]]),
           dict(kind="expressway", path=[[92.53, 23.74], [92.53, 23.845], [92.65, 23.845], [92.68, 23.80], [92.65, 23.74], [92.53, 23.74]], label="Ring road", labelAt=[92.50, 23.73])],
   units=[{**u, "mini": True} for u in (HERIT, RAIL, AIR, CAP, HOMES, TECHU)],
   stats=[f"Old - New link: ~{link_km:.0f} km", f"~{link_min:.0f} min at {TRANSIT_KMH} km/h (assumed)"])
kf(date="2047-01-01", seconds=5, hold=6.5, caption="Old Aizawl and New Aizawl",
   say="*Old Aizawl* keeps the heritage. *New Aizawl* carries the future",
   territory=ZONES, units=[{**u, "mini": True} for u in (HERIT, RAIL, AIR, CAP, HOMES, TECHU)],
   stats=["Old Aizawl: churches, markets, culture", "New Aizawl: government, business, tech"])

subs_map, t = [], KF[0]["hold"]
subs_map.append((0.3, KF[0]["hold"], KF[0]["say"]))
for k in KF[1:]:
    subs_map.append((t + k["seconds"] * 0.45, t + k["seconds"] + k["hold"] - 0.15, k["say"]))
    t += k["seconds"] + k["hold"]
map_dur = round(t, 2)
for k in KF:
    k.pop("say")

# ---------- 3D shots ----------
GREEN_T = {"low": "#12300f", "mid": "#2f6b2a", "high": "#6e8c4c"}
DAWN = {"zenith": "#22385a", "horizon": "#ffc27a", "sun": "#fff2cf", "fog": "#9fb2a2", "sunElevation": 3}
GOLD = {"zenith": "#29507e", "horizon": "#ffd59a", "sun": "#fff4d8", "fog": "#b0b9a6", "sunElevation": 8}
DUSK = {"zenith": "#1b1e3f", "horizon": "#ff8f5a", "sun": "#ffd7a0", "fog": "#6c5a6a", "sunElevation": 1.5}


def fly(duration, sky, seed, features, cards=(), title=None, look_down=65, height=34, speed=140, flatten=None):
    seg = {"type": "flyover3d", "duration": duration, "jet": {"hidden": True},
           "camera": {"mode": "chase", "distance": 46, "height": height, "fov": 55, "lookDown": look_down},
           "flight": {"speed": speed, "altitude": 470, "weave": 50},
           "terrain": {"seed": seed, "height": 400, **GREEN_T, **({"flatten": flatten} if flatten else {})},
           "sky": sky, "vignette": 0.5, "fogNear": 300, "fogFar": 3000, "features": features, "cards": list(cards)}
    if title: seg["title"] = title
    return seg


def card(start, end, value, label, sub=None, prefix="", suffix="", color="#ffd25a", y=0.44, decimals=0):
    c = dict(start=start, end=end, value=value, label=label, prefix=prefix, suffix=suffix, color=color, y=y, decimals=decimals)
    if sub: c["sub"] = sub
    return c


PLANNED = {"at": 0.85, "side": 1, "dist": 0, "blocks": 9, "block": 70}
FLAT = [{"at": 0.85, "side": 1, "dist": 0, "radius": 470, "level": 150}]
segments = [
    fly(10, DUSK, 57, {"city": {"at": 0.75, "count": 4200, "radius": 420, "side": 1, "dist": 40}, "mist": {"layers": 2, "opacity": 0.3, "height": 110}},
        title={"text": "OLD AIZAWL", "sub": "THE HERITAGE CAPITAL", "start": 0.4, "end": 9.8, "size": 110, "subSize": 48, "y": 300},
        cards=[card(3.5, 9.6, POP_2011, "PEOPLE IN AIZAWL CITY", "Census 2011 · built along the ridges", color="#ff9a4d", y=0.5)]),
    {"__map__": True},
    fly(12, GOLD, 81, {"planned": PLANNED, "road": {"offset": 0}, "mist": {"layers": 1, "opacity": 0.22, "height": 90}},
        flatten=FLAT, look_down=60, height=40,
        title={"text": "NEW AIZAWL", "sub": "THE PLANNED CAPITAL", "start": 0.4, "end": 11.8, "size": 110, "subSize": 48, "y": 300},
        cards=[card(2.5, 6.8, HOMES_AIZAWL, "NEW HOMES · PHASE 1", "from the Mizoram 2047 scenario", color="#7fd0ff", y=0.5),
               card(7.0, 11.6, PLANNED_POP, "PEOPLE BY 2047", "planned capacity (scenario)", color="#7fd0ff", y=0.5)]),
    fly(10, DAWN, 81, {"planned": {**PLANNED, "at": 0.9}, "city": {"at": 0.2, "count": 2600, "radius": 360, "side": -1, "dist": 80},
                       "road": {"offset": 30}, "mist": {"layers": 2, "opacity": 0.3, "height": 100}},
        flatten=[{**FLAT[0], "at": 0.9}], look_down=50, height=40,
        title={"text": "TWO CITIES", "sub": "ONE CAPITAL · MIZORAM 2047", "start": 0.6, "end": 9.8, "size": 110, "subSize": 46, "y": 300}),
]

icon = lambda g, bg, fg="#ffffff": {"type": "icon", "glyph": g, "bg": bg, "fg": fg}
map_seg = {
    "type": "campaign2d", "duration": map_dur, "hold": 0, "bbox": [92.2, 23.4, 93.1, 24.2], "view": V_AZ,
    "dateFormat": "YYYY", "caption": "OLD AIZAWL · NEW AIZAWL", "legendBottom": 390,
    "footnote": "Aizawl facts: Census 2011, NFR. New Aizawl: scenario from stated assumptions, not a plan of record.",
    "style": {"land": ["#6f7d4c", "#94a066", "#4f5c36"], "water": "#1d4a86", "river": "#3d6fb8", "territoryAlpha": 0.55},
    "factions": [
        {"id": "old", "name": "Old Aizawl", "color": "#e07b39", "flag": {"type": "solid", "color": "#e07b39"}},
        {"id": "gov", "name": "Capitol district", "color": "#d4af37", "flag": {"type": "solid", "color": "#d4af37"}},
        {"id": "cbd", "name": "Business district", "color": "#3fa9ff", "flag": {"type": "solid", "color": "#3fa9ff"}},
        {"id": "res", "name": "Housing", "color": "#e05a7a", "flag": {"type": "solid", "color": "#e05a7a"}},
        {"id": "tech", "name": "Tech park", "color": "#8f74ff", "flag": {"type": "solid", "color": "#8f74ff"}},
        {"id": "logi", "name": "Logistics hub", "color": "#9aa5b1", "flag": {"type": "solid", "color": "#9aa5b1"}},
        {"id": "green", "name": "Green belt", "color": "#3fbf5f", "flag": {"type": "solid", "color": "#3fbf5f"}},
        {"id": "heritage", "name": "Old Aizawl (heritage)", "unit": "people", "color": "#e07b39", "flag": icon("house", "#c2602a")},
        {"id": "rail", "name": "Railhead", "color": "#dddddd", "flag": icon("rail", "#555b63")},
        {"id": "air", "name": "Airport", "color": "#7fd0ff", "flag": icon("plane", "#2b6cb0")},
        {"id": "capitol", "name": "Capitol", "color": "#d4af37", "flag": icon("dome", "#a8862a")},
        {"id": "homes", "name": "New homes", "unit": "homes", "color": "#e05a7a", "flag": icon("house", "#c23b5c")},
        {"id": "compute", "name": "Compute park", "unit": "MW", "color": "#8f74ff", "flag": icon("chip", "#5b3fd6")},
    ],
    "layers": {"water": [], "rivers": [{"km": 0.25, "path": TLAWNG}]},
    "cities": CITIES, "keyframes": KF,
}
segments[1] = map_seg

starts, t = [], 0
for s in segments:
    starts.append(t)
    t += s["duration"]
subs = [
    {"start": 0.8, "end": 9.8, "text": "Aizawl grew up along the *ridges*. Every house, road and market climbs the hill"},
    *[{"start": round(starts[1] + a, 2), "end": round(starts[1] + b, 2), "text": tx} for a, b, tx in subs_map],
    {"start": round(starts[2] + 0.6, 2), "end": round(starts[2] + 11.8, 2), "text": "*New Aizawl*: wide boulevards, glass towers and a new *Capitol*"},
    {"start": round(starts[3] + 0.6, 2), "end": round(starts[3] + 9.8, 2), "text": "*Old Aizawl* and *New Aizawl*: one capital for Mizoram"},
]

scene = {
    "title": "Old Aizawl, New Aizawl (scenario)",
    "note": "Twin-capital scenario. Facts: Census 2011, Sairang rail (2025), Lengpui airport. New Aizawl numbers come from gen_mizoram_2047.py plus the assumptions in this file.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "transition": 0.45, "exposure": 1.08,
    "segments": segments, "subtitles": subs, "subtitleStyle": {"size": 50, "y": 0.84},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(segments)} segments, {t:.1f}s | link {link_km:.1f} km / {link_min:.0f} min, homes {HOMES_AIZAWL:,}, compute {COMPUTE_MW} MW")
