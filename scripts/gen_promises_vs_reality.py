# Generates public/scenes/promises-vs-reality.json: a one-minute, neutral
# report card on the flagship policies of Mizoram's last three governments.
# Usage: python3 scripts/gen_promises_vs_reality.py public/scenes/promises-vs-reality.json
#
# Sources (README "Promises vs Reality"):
#  Congress NLUP: Scroll; Senhri Journal (NLUP paper); NLUP executive summary.
#  MNF SEDP: EastMojo; ThePrint/PTI; Outlook; Business Standard (prohibition).
#  ZPM Bana Kaih: India Today NE; ThePrint/PTI; The Week/PTI; Northeast Now.
# Verdicts summarise those reports; they are not an official evaluation.
import json, sys

GREEN = {"low": "#12300f", "mid": "#2f6b2a", "high": "#6e8c4c"}
SKY = {
    "dawn": {"zenith": "#22385a", "horizon": "#ffc27a", "sun": "#fff2cf", "fog": "#9fb2a2", "sunElevation": 3},
    "gold": {"zenith": "#29507e", "horizon": "#ffd59a", "sun": "#fff4d8", "fog": "#b0b9a6", "sunElevation": 8},
    "day": {"zenith": "#2a5f9e", "horizon": "#cfe3f0", "sun": "#fffbe8", "fog": "#a9c0c8", "sunElevation": 22},
    "dusk": {"zenith": "#1b1e3f", "horizon": "#ff8f5a", "sun": "#ffd7a0", "fog": "#6c5a6a", "sunElevation": 1.5},
}
CITY = {"city": {"at": 1.05, "count": 3600, "radius": 380, "side": 1, "dist": 50, "lightSize": 4.5}}
MIST = {"mist": {"layers": 3, "opacity": 0.4, "height": 120}}
PARTIAL, PROGRESS = "#ffb347", "#7fd0ff"


def shot(duration, sky, seed, features, policy=None, title=None, cards=()):
    seg = {"type": "flyover3d", "duration": duration, "jet": {"hidden": True},
           "camera": {"mode": "chase", "distance": 46, "height": 36, "fov": 55, "lookDown": 55},
           "flight": {"speed": 120, "altitude": 470, "weave": 50},
           "terrain": {"seed": seed, "height": 400, **GREEN}, "sky": SKY[sky], "vignette": 0.5,
           "fogNear": 300, "fogFar": 3000, "features": features, "cards": list(cards)}
    if policy: seg["policy"] = {"start": 0.2, "end": duration - 0.2, "step": 1.1, **policy}
    if title: seg["title"] = title
    return seg


cards = [
    shot(16, "dawn", 72, {**MIST},
         policy=dict(label="CONGRESS · 2008-2018", icon="leaf", color="#5fb3ff", title="New Land Use Policy (NLUP)",
                     context="Promise: up to Rs 1 lakh per household to end jhum farming",
                     bullets=["~1.2 lakh households covered",
                              "Cost: ~Rs 2,800-3,000 crore",
                              "Jhum families: 68,433 -> 48,417 (2010-16)",
                              "Studies: many beneficiaries kept on jhum"],
                     verdict={"text": "PARTLY DELIVERED", "color": PARTIAL},
                     note="Sources: Scroll; Senhri Journal; NLUP summary. Opposition alleged partisan beneficiary selection.")),
    shot(16, "gold", 64, CITY,
         policy=dict(label="MNF · 2018-2023", icon="people", color="#ffb347", title="Socio-Economic Development Policy (SEDP)",
                     context="Promise: family livelihood grants (critics recalled an earlier Rs 3 lakh pledge)",
                     bullets=["60,000 families: Rs 50,000 each",
                              "Paid in Rs 25,000 instalments; Rs 700 cr budget (2022-23)",
                              "Third phase halted by the 2023 poll code",
                              "Liquor prohibition: passed in 2019"],
                     verdict={"text": "PARTLY DELIVERED", "color": PARTIAL},
                     note="Sources: EastMojo; PTI; Outlook; Business Standard. No published outcome evaluation found.")),
    shot(16, "day", 63, CITY,
         policy=dict(label="ZPM · 2023-PRESENT", icon="percent", color="#c59bff", title="Bana Kaih (Hand-holding)",
                     context="Promise: buy key crops at support prices; loans for local enterprise",
                     bullets=["Ginger Rs 50, broom Rs 80, chilli Rs 350 per kg (2026)",
                              "Ginger buying lost Rs 128 cr (2024-25)",
                              "Phase I: 2,255 partners, Rs 18.3 cr",
                              "Phase II: 2,135 applications pending"],
                     verdict={"text": "IN PROGRESS, AT A COST", "color": PROGRESS},
                     note="Sources: India Today NE; PTI via ThePrint and The Week; Northeast Now. Still running.")),
]

intro = shot(5, "dawn", 33, {"mist": {"layers": 3, "opacity": 0.45, "height": 150}},
             title={"text": "PROMISES", "sub": "VS REALITY · MIZORAM", "start": 0.3, "end": 4.8, "size": 130, "subSize": 56, "y": 380})
outro = shot(7, "dusk", 57, CITY,
             title={"text": "3 GOVERNMENTS", "sub": "3 FLAGSHIPS · JUDGE FOR YOURSELF", "start": 0.3, "end": 6.8, "size": 110, "subSize": 44, "y": 380})
segments = [intro, *cards, outro]

starts, t = [], 0
for s in segments:
    starts.append(t)
    t += s["duration"]
say = ["Three governments. Three *flagship* promises.",
       "Congress paid farmers to leave *jhum*: results were mixed",
       "MNF's *SEDP* reached 60,000 families, then stalled at the polls",
       "ZPM buys crops at *support prices*, and lost Rs 128 crore on ginger",
       "Promises cost money. *Judge for yourself*"]
subs = [{"start": round(starts[k] + 0.4, 2), "end": round(starts[k] + segments[k]["duration"] - 0.3, 2), "text": say[k]} for k in range(len(segments))]

scene = {
    "title": "Promises vs Reality: Mizoram",
    "note": "Neutral report card on flagship schemes of Congress (NLUP), MNF (SEDP) and ZPM (Bana Kaih). Verdicts summarise news and journal reports; not an official evaluation.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "transition": 0.35, "exposure": 1.08,
    "segments": segments, "subtitles": subs, "subtitleStyle": {"size": 48, "y": 0.905},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(segments)} segments, {t:.1f}s")
