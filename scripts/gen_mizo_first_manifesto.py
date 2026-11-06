# Generates public/scenes/mizo-first-manifesto.json: the MIZO FIRST policy
# manifesto as a cinematic sequence of policy cards.
# Usage: python3 scripts/gen_mizo_first_manifesto.py public/scenes/mizo-first-manifesto.json
#
# Context facts (README "MIZO FIRST manifesto"): the STA notice of 29 May
# 2026 makes the MizoTaxi app mandatory in Aizawl from 1 July. Taxi, two-
# wheeler and auto associations oppose its fees and plan a court challenge.
# ~1,570 vehicles had registered by Sept 2026, against 5,256 two-wheeler taxi
# permits statewide (2024). The RTE Act makes schooling free and compulsory
# for ages 6-14. Cost lines are scenario estimates from the ASSUMPTIONS below.
import json, os, runpy, sys

HERE = os.path.dirname(os.path.abspath(__file__))
argv, sys.argv = sys.argv, ["x", os.devnull]
M = runpy.run_path(os.path.join(HERE, "gen_mizoram_2047.py"))
sys.argv = argv

# ---------------- ASSUMPTIONS ----------------
DRIVERS = 8000                 # taxi, two-wheeler taxi and auto drivers statewide (assumed)
PENSION_STATE_MONTH = 1000     # state contribution per driver per month (Rs)
pension_cr = DRIVERS * PENSION_STATE_MONTH * 12 / 1e7

GREEN = {"low": "#12300f", "mid": "#2f6b2a", "high": "#6e8c4c"}
SKY = {
    "dawn": {"zenith": "#22385a", "horizon": "#ffc27a", "sun": "#fff2cf", "fog": "#9fb2a2", "sunElevation": 3},
    "day": {"zenith": "#2a5f9e", "horizon": "#cfe3f0", "sun": "#fffbe8", "fog": "#a9c0c8", "sunElevation": 22},
    "gold": {"zenith": "#29507e", "horizon": "#ffd59a", "sun": "#fff4d8", "fog": "#b0b9a6", "sunElevation": 8},
    "dusk": {"zenith": "#1b1e3f", "horizon": "#ff8f5a", "sun": "#ffd7a0", "fog": "#6c5a6a", "sunElevation": 1.5},
    "night": {"zenith": "#101a3c", "horizon": "#b0607a", "sun": "#ffc89a", "fog": "#3a3550", "sunElevation": 0.5},  # blue hour
}
CITY = {"city": {"at": 1.05, "count": 3600, "radius": 380, "side": 1, "dist": 50, "lightSize": 4.5}}  # stays ahead of the camera
PLAN = {"planned": {"at": 1.0, "side": 1, "dist": 0, "blocks": 9, "block": 70}}
FLAT = [{"at": 1.0, "side": 1, "dist": 0, "radius": 470, "level": 150}]


def shot(duration, sky, seed, features, policy=None, title=None, flatten=None, look_down=55, cards=()):
    seg = {"type": "flyover3d", "duration": duration, "jet": {"hidden": True},
           "camera": {"mode": "chase", "distance": 46, "height": 36, "fov": 55, "lookDown": look_down},
           "flight": {"speed": 120, "altitude": 470, "weave": 50},
           "terrain": {"seed": seed, "height": 400, **GREEN, **({"flatten": flatten} if flatten else {})},
           "sky": SKY[sky], "vignette": 0.5, "fogNear": 300, "fogFar": 3000, "features": features, "cards": list(cards)}
    if policy: seg["policy"] = {"start": 0.2, "end": duration - 0.2, **policy}
    if title: seg["title"] = title
    return seg


P, SAY = [], []
MPC_LOCAL = 0.6                 # share of each extra rupee re-spent inside Mizoram (illustrative)
multiplier = 1 / (1 - MPC_LOCAL)


def policy(icon, color, title, bullets, sky, seed, features, say, context=None, note=None, flatten=None, duration=10):
    pol = dict(num=f"{len(P) + 1:02d}", icon=icon, color=color, title=title, bullets=bullets)
    if context: pol["context"] = context
    if note: pol["note"] = note
    P.append(shot(duration, sky, seed, features, policy=pol, flatten=flatten))
    SAY.append(say)


policy("car", "#ffcf3f", "Taxi drivers first",
       ["A pension for every taxi, bike-taxi and auto driver",
        "Hospital cover and education support for their families",
        "MizoTaxi with no registration fee and lower fares",
        "Drivers paid to promote the app they run on"],
       "night", 57, {**CITY, "road": {"offset": 30, "traffic": 70}},
       "Those who drive Mizoram deserve a *pension*",
       context="Today: the MizoTaxi app is mandatory, and drivers carry the costs",
       note=f"Est. Rs {pension_cr:.0f} crore a year for {DRIVERS:,} drivers at Rs {PENSION_STATE_MONTH:,}/month (assumed). ~1,570 vehicles had registered by Sept 2026.",
       duration=11.5)
policy("people", "#5fd38a", "Security for every worker",
       ["The same pension and health cover for every sector",
        "Shopkeepers, farmers, builders, domestic workers",
        "No Mizo worker without a safety net"],
       "day", 63, CITY, "*Every* worker gets the same security")
policy("percent", "#ff8a65", "Benefits, not inflation",
       ["Pension, hospital and education cover for every worker",
        "So pay rises stay modest in every sector",
        "More security for families, less pressure on prices"],
       "gold", 64, CITY, "Security *instead* of runaway pay rises",
       note="Keeps the wage bill in check while total compensation (pay + benefits) still rises.")
policy("road", "#ff9a4d", "A PWD that builds for Mizos",
       ["A bigger Public Works Department, building the 641 km grid",
        "Local workers and contractors first",
        "Insurance and site safety for every worker"],
       "gold", 41, {"road": {"offset": 0, "traffic": 30}}, "Mizo hands build Mizoram's *roads*")
policy("wrench", "#7fd0ff", "Mizoram Skills Institute",
       ["One large institution for skilled trades",
        "Construction, electrical, solar, IT, nursing",
        "Trained here, hired here"],
       "day", 81, PLAN, "Skills trained *here*, jobs kept *here*", flatten=FLAT)
policy("book", "#c59bff", "Mizo teachers and lecturers",
       ["Skilled Mizo workers hired as instructors and lecturers at the Skills Institute",
        "Free school, college and postgraduate study creates thousands of teaching posts",
        "Local teachers and lecturers first"],
       "dawn", 33, {**CITY, "mist": {"layers": 2, "opacity": 0.35, "height": 120}},
       "Mizo experts *teach* the next generation",
       note="Residence rules for public jobs need a law by Parliament (Art. 16(3)); ST reservation and local-language requirements are the usual route.",
       duration=11)
policy("percent", "#ffd25a", "Recover first, tax later",
       ["State taxes and fees paused until household incomes recover",
        "Small businesses get the same breathing room"],
       "dawn", 72, {"mist": {"layers": 3, "opacity": 0.4, "height": 120}}, "Recovery *first*, then taxes",
       note="Income tax and GST are national; the state can waive its own taxes, fees and charges.")
policy("heart", "#ff7f9e", "Stronger families",
       ["A stricter marriage law that protects spouses and children",
        "State aid and security for every single parent",
        "No citizen left behind"],
       "dusk", 57, CITY, "No single parent stands *alone*")
policy("house", "#ff9a4d", "Support for big families",
       ["Interest-free loans for families with 4 or more children",
        "Loans written off for families of 5 or more",
        "Homes in the new urban plan (see New Aizawl)"],
       "gold", 64, CITY, "Bigger families, *lighter* loans")
policy("bank", "#4fc3ff", "The Mizoram People's Bank",
       ["A big state bank owned by Mizoram's people and government",
        "Profits stay in Mizoram",
        "Loans for Mizo homes, farms and businesses"],
       "dusk", 81, PLAN, "A bank that *belongs* to Mizoram", flatten=FLAT,
       note="Every bank in India needs an RBI licence; the bank can be state- and people-owned, but not outside RBI rules.")
policy("shield", "#c9d37a", "Service for the youth",
       ["A year of service for young Mizos",
        "Training, discipline and a stipend",
        "Disaster response and border duty"],
       "dawn", 72, {"mist": {"layers": 2, "opacity": 0.35, "height": 120}}, "Young Mizos *serve* their state",
       note="States cannot conscript; delivered through NCC, the Territorial Army and a voluntary state service corps.")
policy("book", "#6ee08a", "Free education, school to postgraduate",
       ["Free and compulsory schooling from 6 to 18",
        "Free college and postgraduate study for every Mizo student"],
       "day", 81, PLAN, "Education, *free* from school to postgraduate", flatten=FLAT,
       note="Today the RTE Act makes school free and compulsory from 6 to 14.")
policy("rupee", "#ffd25a", "How we pay for it: spend to grow",
       ["Keynes-style public spending, like America's New Deal in the Great Depression",
        "Public works put idle hands to work",
        "Wages spent in Mizo shops become other Mizos' income",
        f"Every Rs 1 spent can circulate to ~Rs {multiplier:.1f} (the multiplier)"],
       "gold", 41, {"road": {"offset": 0, "traffic": 40}, **CITY}, "Money that *circulates* builds Mizoram",
       note=f"Illustrative: assumes {MPC_LOCAL*100:.0f}% of each rupee is re-spent inside Mizoram. Works best with idle workers. States can't print money; funded by central transfers and borrowing within FRBM limits.",
       duration=12)

intro = shot(6, "dawn", 33, {"mist": {"layers": 3, "opacity": 0.45, "height": 150}},
             title={"text": "MIZO FIRST", "sub": "THE MANIFESTO", "start": 0.4, "end": 5.8, "size": 120, "subSize": 56, "y": 360})
finale = shot(9, "dusk", 57, {**CITY, "road": {"offset": 40, "traffic": 50}},
              title={"text": "NO CITIZEN", "sub": "LEFT BEHIND · MIZO FIRST", "start": 0.4, "end": 8.8, "size": 120, "subSize": 50, "y": 360},
              cards=[dict(start=2.5, end=8.6, value=len(P), label="POLICIES FOR MIZORAM", sub="Scenario manifesto built on public data", color="#ffd25a", y=0.52)])
segments = [intro, *P, finale]

starts, t = [], 0
for s in segments:
    starts.append(t)
    t += s["duration"]
say = ["*Mizo first.* A manifesto for every family", *SAY, "*No citizen left behind*"]
subs = [{"start": round(starts[k] + 0.5, 2), "end": round(starts[k] + segments[k]["duration"] - 0.3, 2), "text": say[k]} for k in range(len(segments))]

scene = {
    "title": "MIZO FIRST: The Manifesto",
    "note": "Campaign-style manifesto (scenario). Context: MizoTaxi STA notice of 29 May 2026; ~1,570 vehicles registered by Sept 2026; RTE Act. Legal notes on screen for Art. 16(3), RBI licensing, conscription and national taxes.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "transition": 0.4, "exposure": 1.08,
    "segments": segments, "subtitles": subs, "subtitleStyle": {"size": 50, "y": 0.9},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(P)} policies, {t:.1f}s | pension Rs {pension_cr:.1f} cr/yr, multiplier {multiplier:.1f}")
