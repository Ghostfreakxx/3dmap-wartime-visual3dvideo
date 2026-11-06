# Generates public/scenes/mizo-first-2047.json: "MIZO FIRST: Mizoram 2047",
# a cinematic campaign-style promo for the development scenario.
# Usage: python3 scripts/gen_mizo_first_promo.py public/scenes/mizo-first-2047.json
#
# All numbers come from scripts/gen_mizoram_2047.py (sourced facts plus the
# scenario's stated assumptions), so the promo and the explainer agree.
import copy, json, os, runpy, sys

HERE = os.path.dirname(os.path.abspath(__file__))
argv, sys.argv = sys.argv, ["gen_mizoram_2047.py", os.devnull]
M = runpy.run_path(os.path.join(HERE, "gen_mizoram_2047.py"))
sys.argv = argv

FACTS, A = M["FACTS"], M["A"]
km, jobs, rent, compute, gsdp = M["total_km"], M["total_jobs"], M["rent_cr"], M["compute_mw"], M["gsdp_boost"]
EV = copy.deepcopy(M["EV"])

DAWN = {"zenith": "#22385a", "horizon": "#ffc27a", "sun": "#fff2cf", "fog": "#9fb2a2", "sunElevation": 3}
DAY = {"zenith": "#2a5f9e", "horizon": "#cfe3f0", "sun": "#fffbe8", "fog": "#a9c0c8", "sunElevation": 22}
DUSK = {"zenith": "#1b1e3f", "horizon": "#ff8f5a", "sun": "#ffd7a0", "fog": "#6c5a6a", "sunElevation": 1.5}
GREEN = {"low": "#12300f", "mid": "#2f6b2a", "high": "#6e8c4c"}


def fly(duration, sky, seed, cards=(), title=None, features=None, mode="chase", height=34, distance=46, speed=150, look_down=0):
    seg = {"type": "flyover3d", "duration": duration, "jet": {"hidden": True},
           "camera": {"mode": mode, "distance": distance, "height": height, "fov": 55, "lookDown": look_down},
           "flight": {"speed": speed, "altitude": 470, "weave": 60},
           "terrain": {"seed": seed, "height": 400, **GREEN}, "sky": sky, "vignette": 0.5,
           "fogNear": 300, "fogFar": 3000, "cards": list(cards)}
    if title: seg["title"] = title
    if features: seg["features"] = features
    return seg


def card(start, end, value, label, sub=None, prefix="", suffix="", color="#ffd25a", y=0.44, decimals=0):
    c = dict(start=start, end=end, value=round(value, decimals), label=label, prefix=prefix, suffix=suffix, color=color, y=y, decimals=decimals)
    if sub: c["sub"] = sub
    return c


segments = [
    fly(6, DAWN, 33, features={"mist": {"layers": 3, "opacity": 0.45, "height": 150}},
        title={"text": "MIZO FIRST", "sub": "MIZORAM 2047", "start": 0.5, "end": 5.8, "size": 120, "subSize": 56, "y": 330}),
    fly(9, DAWN, 41, look_down=75, features={"road": {"offset": 0}, "mist": {"layers": 2, "opacity": 0.25, "height": 110}},
        cards=[card(0.4, 4.4, km, "OF EXPRESSWAY", "All 11 district HQs and 4 border gates", suffix=" km", color="#ff9a4d"),
               card(4.6, 8.7, jobs, "JOBS A YEAR", f"for Mizo workers, {A['build_years']} years of building", color="#ff9a4d")]),
    fly(9, DUSK, 57, look_down=70, features={"city": {"at": 0.8, "count": 2600, "radius": 320, "side": 1, "dist": 60}, "road": {"offset": -40}},
        cards=[card(0.4, 4.4, A["homes"], "NEW URBAN HOMES", "Land stays with Mizo owners (Art. 371G)", color="#ff7f9e"),
               card(4.6, 8.7, rent, "CRORE A YEAR IN RENT", "from visitors and workers, to Mizo landlords", prefix="Rs ", color="#ff7f9e")]),
    fly(9, DAY, 64, look_down=75, features={"solar": {"at": 0.8, "rows": 30, "cols": 24, "side": -1, "dist": 40}},
        cards=[card(0.4, 4.4, A["solar_mw"], "SOLAR BELT", f"of a {FACTS['solar_potential_gw']} GW potential (MNRE)", suffix=" MW", color="#ffd23f"),
               card(4.6, 8.7, compute, "OF COMPUTE", "AI servers and Bitcoin mining run by Mizo youth", suffix=" MW", color="#a58bff")]),
    fly(8, DAWN, 72, features={"mist": {"layers": 3, "opacity": 0.4, "height": 120}},
        cards=[card(0.4, 3.9, A["farm_ha"], "BEYOND JHUM", "terraces, orchards, agroforestry", suffix=" ha", color="#6ee08a"),
               card(4.1, 7.7, A["battalions"] * A["battalion_size"], "MIZO BATTALIONS*", "*via Territorial Army / India Reserve Battalions", color="#c9d37a")]),
]

# ---- map: the gateway, compressed from the Mizoram 2047 explainer ----
today, kaladan, rail, gateway = EV[0], EV[1], EV[2], EV[3]
grid_north, grid_south, final = EV[5], EV[6], EV[-1]
today.update(hold=1.5, stats=None, caption="Mizoram")
kaladan.update(seconds=4, hold=3.5)
gateway.update(seconds=4, hold=3.5, routes=rail.get("routes", []))
grid = copy.deepcopy(final)
grid.update(date="2047-01-01", seconds=4.5, hold=4, view=M["V_MZ"], caption="Every district connected",
            routes=grid_north["routes"] + grid_south["routes"], stats=[f"Expressway grid: {km:,.0f} km", "Kaladan + rail + border gates"])
gate_out = copy.deepcopy(final)
gate_out.update(date="2047-01-01", seconds=4.5, hold=3.5, view=M["V_SEA"], caption="The gateway of Southeast Asia", stats=None)
for k in (today, kaladan, gateway, grid, gate_out):
    if k.get("stats") is None:
        k.pop("stats", None)
map_kfs = [today, kaladan, gateway, grid, gate_out]
map_dur = today["hold"] + sum(k["seconds"] + k["hold"] for k in map_kfs[1:])

base_map = json.load(open(os.path.join(HERE, "..", "public", "scenes", "mizoram-2047.json")))["segments"][1]
map_seg = {**base_map, "duration": map_dur, "keyframes": map_kfs, "caption": "MIZO FIRST", "legend": False,
           "footnote": "Scenario built on public data and stated assumptions. Not a forecast."}
segments.append(map_seg)

segments.append(fly(9, DUSK, 57, look_down=55, features={"city": {"at": 0.85, "count": 3200, "radius": 340, "side": -1, "dist": 60}, "road": {"offset": 50}},
                    title={"text": "ONE MIZORAM", "sub": "EVERY DISTRICT CONNECTED", "start": 0.4, "end": 8.8, "size": 110, "subSize": 46, "y": 300},
                    cards=[card(2.0, 8.6, gsdp / 1e5, "LAKH CRORE GSDP BY 2047", f"at {A['boosted_cagr']*100:.0f}% a year, from Rs {FACTS['gsdp_2425_cr']:,} crore today",
                                prefix="Rs ", decimals=1, y=0.56)]))

# ---- narration ----
starts, t = [], 0
for s in segments:
    starts.append(t)
    t += s["duration"]
total = t
S = lambda i, a, b, text: {"start": round(starts[i] + a, 2), "end": round(starts[i] + b, 2), "text": text}
subs = [
    S(0, 1.0, 5.8, "Imagine *Mizoram* in *2047*"),
    S(1, 0.5, 8.8, "Roads built by *Mizo hands*, linking every district"),
    S(2, 0.5, 8.8, "Homes in Mizo hands, in *Mizo cities*"),
    S(3, 0.5, 8.8, "Power from the *sun*. Jobs for the *youth*"),
    S(4, 0.5, 7.8, "Farms that feed the state, and *young Mizos* in uniform"),
    S(5, 1.0, map_dur - 0.3, "And at the centre of it all: the *gateway* to Southeast Asia"),
    S(6, 0.6, 8.8, "*Mizo first.* Scenario built on public data, not a forecast"),
]

scene = {
    "title": "MIZO FIRST: Mizoram 2047",
    "note": "Campaign-style promo for the Mizoram 2047 scenario. Numbers are computed in scripts/gen_mizoram_2047.py.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "transition": 0.45, "exposure": 1.08,
    "segments": segments, "subtitles": subs, "subtitleStyle": {"size": 52, "y": 0.83},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(segments)} segments, {total:.1f}s")
