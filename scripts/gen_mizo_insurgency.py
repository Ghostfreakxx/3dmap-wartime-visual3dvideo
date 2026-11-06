# Generates public/scenes/mizo-insurgency-1966.json
# Usage: python3 scripts/gen_mizo_insurgency.py public/scenes/mizo-insurgency-1966.json
#
# Sources consulted (see README "Mizo insurgency" section): Wikipedia articles
# on the MNF uprising, the Bombing of Aizawl and Operation Accomplishment;
# The Print; Scroll; UCA Dynamic Analysis of Dispute Management (India/Mizos);
# SVP National Police Academy; van Schendel, "A War Within a War" (Modern
# Asian Studies); Lok Sabha debates 29-07-1986. Borders are hand-traced.
import json, sys

# ---------- geography (approximate) ----------
MIZO = [[92.27, 24.25], [92.47, 24.17], [92.6, 24.36], [92.75, 24.52], [92.95, 24.4], [93.05, 24.35], [93.2, 24.15],
        [93.38, 24.05], [93.45, 23.7], [93.35, 23.4], [93.4, 23.1], [93.3, 22.8], [93.2, 22.5], [93.15, 22.25],
        [93.05, 22.0], [92.9, 21.95], [92.7, 22.05], [92.6, 22.2], [92.55, 22.5], [92.45, 22.75], [92.35, 23.0],
        [92.3, 23.3], [92.25, 23.6], [92.3, 23.9]]
SEA = [[88.0, 21.6], [89.8, 21.8], [90.5, 22.1], [90.75, 22.5], [91.4, 22.6], [91.8, 22.3], [91.98, 21.43], [92.3, 20.85],
       [92.9, 20.15], [93.5, 19.4], [93.5, 18.0], [88.0, 18.0]]
KAPTAI = [[92.05, 22.7], [92.18, 22.86], [92.3, 22.8], [92.35, 22.6], [92.2, 22.45], [92.05, 22.52]]
RIVERS = [
    {"km": 0.8, "path": [[92.75, 23.0], [92.65, 23.5], [92.6, 23.9], [92.65, 24.3], [92.8, 24.8]]},   # Tlawng
    {"km": 0.8, "path": [[93.35, 23.0], [93.4, 23.4], [93.45, 23.7], [93.38, 24.05]]},              # Tiau
    {"km": 1.0, "path": [[93.2, 22.3], [92.95, 22.0], [92.9, 21.5], [92.95, 21.0], [92.9, 20.2]]},  # Kaladan
    {"km": 1.0, "path": [[92.45, 22.9], [92.3, 22.8], [92.18, 22.65], [92.0, 22.5], [91.83, 22.36]]},  # Karnaphuli
    {"km": 1.2, "path": [[93.3, 24.6], [93.0, 24.75], [92.8, 24.83], [92.5, 24.88], [92.2, 24.9]]},  # Barak
]
C = lambda name, lon, lat, **kw: dict(name=name, at=[lon, lat], **kw)
CITIES = [
    C("Aizawl", 92.72, 23.73, size=30), C("Lunglei", 92.75, 22.88, size=26), C("Champhai", 93.33, 23.47, size=26),
    C("Kolasib", 92.68, 24.22), C("Vairengte", 92.75, 24.5), C("Serchhip", 92.85, 23.3), C("Saiha", 92.97, 22.49),
    C("Tlabung", 92.53, 22.9), C("Mamit", 92.47, 23.93), C("Silchar", 92.8, 24.83), C("Rangamati", 92.18, 22.65),
    C("Chittagong", 91.83, 22.36), C("Agartala", 91.28, 23.83), C("Imphal", 93.94, 24.82), C("Falam", 93.68, 22.91),
    C("Paletwa", 92.86, 21.3),
    C("EAST PAKISTAN", 91.75, 23.25, region=True, until="1971-12-16"),
    C("BANGLADESH", 91.75, 23.25, region=True, since="1971-12-16"),
    C("BURMA", 93.95, 22.2, region=True), C("TRIPURA", 91.65, 24.15, region=True, size=24),
    C("CACHAR · ASSAM", 92.4, 25.08, region=True, size=22), C("MANIPUR", 93.85, 24.35, region=True, size=24),
    C("MIZO DISTRICT", 92.95, 24.05, region=True, size=20, until="1972-01-21"),
    C("MIZORAM", 92.95, 24.05, region=True, size=22, since="1972-01-21"),
]

AIZAWL_HQ = [[92.69, 23.75], [92.75, 23.75], [92.75, 23.71], [92.69, 23.71]]
ROAD = {"km": 9, "path": [[92.8, 24.83], [92.75, 24.5], [92.68, 24.22], [92.7, 23.95], [92.72, 23.73]]}
JUNGLE_SW = [[92.3, 23.35], [92.48, 23.25], [92.55, 22.6], [92.47, 22.32], [92.32, 22.6]]
JUNGLE_E = [[93.25, 23.85], [93.42, 23.75], [93.38, 23.1], [93.22, 23.2]]
CHT_CAMPS = [[91.98, 23.2], [92.3, 23.32], [92.37, 22.5], [92.1, 22.3], [91.95, 22.7]]
BURMA_CAMPS = [[92.7, 21.9], [93.3, 22.05], [93.5, 21.4], [92.95, 21.0], [92.62, 21.4]]


def U(id, f, lon, lat, troops=None, label=None):
    d = dict(id=id, faction=f, at=[lon, lat])
    if troops: d["troops"] = troops
    if label: d["label"] = label
    return d


ZOOM_AIZAWL = [92.05, 22.6, 93.6, 24.95]
FULL = [91.4, 21.0, 94.2, 25.2]

kfs = [
    dict(date="1966-02-28", view=ZOOM_AIZAWL, caption="Operation Jericho: night attacks on the garrisons",
         territory=dict(india=[MIZO]),
         units=[U("ar1", "india", 92.73, 23.74, 800, "1 Assam Rifles"), U("arL", "india", 92.76, 22.89, 120, "AR post"),
                U("arC", "india", 93.33, 23.48, 120, "AR post"),
                U("mnaA", "mnf", 92.58, 23.88, label="MNA"), U("mnaL", "mnf", 92.6, 23.02, label="MNA"),
                U("mnaC", "mnf", 93.17, 23.63, label="MNA")],
         fights=[dict(a="mnaA", b="ar1", intensity=3), dict(a="mnaL", b="arL", intensity=2), dict(a="mnaC", b="arC", intensity=2)]),
    dict(date="1966-03-01", caption="The MNF declares independence; treasuries seized",
         territory=dict(mnf=[MIZO], india=[AIZAWL_HQ]),
         units=[U("ar1", "india", 92.73, 23.74, 800, "1 Assam Rifles"), U("arL", "india", 92.76, 22.89, 120, "AR post"),
                U("arC", "india", 93.33, 23.48, 120, "AR post"),
                U("mnaA", "mnf", 92.6, 23.86, label="MNA"), U("mnaL", "mnf", 92.61, 23.0, label="MNA"),
                U("mnaC", "mnf", 93.18, 23.62, label="MNA")],
         fights=[dict(a="mnaA", b="ar1", intensity=3), dict(a="mnaL", b="arL", intensity=2), dict(a="mnaC", b="arC", intensity=2)]),
    dict(date="1966-03-05", caption="Air strikes on Aizawl, 5-6 March; 8 Sikh moves up from Silchar",
         territory=dict(mnf=[MIZO], india=[AIZAWL_HQ]),
         arrows=[dict(faction="india", path=[[92.8, 24.83], [92.75, 24.5], [92.68, 24.25]])],
         units=[U("ar1", "india", 92.73, 23.74, 800, "1 Assam Rifles"), U("arL", "india", 92.76, 22.89, 120, "AR post"),
                U("arC", "india", 93.33, 23.48, 120, "AR post"), U("sikh8", "india", 92.68, 24.25, 800, "8 Sikh"),
                U("mnaA", "mnf", 92.65, 23.8, label="MNA"), U("mnaL", "mnf", 92.66, 22.96, label="MNA"),
                U("mnaC", "mnf", 93.24, 23.56, label="MNA")],
         fights=[dict(a="mnaA", b="ar1", intensity=2), dict(a="mnaL", b="arL", intensity=1)]),
    dict(date="1966-03-07", caption="The army reaches Aizawl; the MNF falls back south",
         # strikes on 5-6 March: animated during the 5 -> 7 March interval
         airstrikes=[dict(**{"from": [92.98, 24.91]}, at=[92.72, 23.73], label="IAF air strikes", passes=2)],
         airstrikeStop=0.85,
         territory=dict(mnf=[MIZO], india=[AIZAWL_HQ, ROAD]),
         arrows=[dict(faction="india", path=[[92.68, 24.22], [92.7, 23.95], [92.72, 23.78]]),
                 dict(faction="mnf", path=[[92.65, 23.78], [92.72, 23.5], [92.8, 23.25]])],
         units=[U("ar1", "india", 92.73, 23.74, 800, "1 Assam Rifles"), U("arL", "india", 92.76, 22.89, 120, "AR post"),
                U("arC", "india", 93.33, 23.48, 120, "AR post"), U("sikh8", "india", 92.71, 23.8, 800, "8 Sikh"),
                U("mnaA", "mnf", 92.8, 23.3, label="MNA"), U("mnaL", "mnf", 92.66, 22.96, label="MNA"),
                U("mnaC", "mnf", 93.24, 23.56, label="MNA")],
         fights=[dict(a="sikh8", b="mnaA", intensity=2)]),
    dict(date="1966-03-15", caption="All of 61 Mountain Brigade (4 battalions) is in the hills",
         territory=dict(mnf=[MIZO], india=[ROAD, {"km": 9, "path": [[92.72, 23.73], [92.85, 23.3], [92.8, 23.05]]},
                                           {"km": 9, "path": [[92.72, 23.73], [93.0, 23.6], [93.3, 23.48]]}]),
         arrows=[dict(faction="india", path=[[92.72, 23.7], [92.85, 23.3], [92.8, 23.08]]),
                 dict(faction="india", path=[[92.75, 23.72], [93.0, 23.6], [93.25, 23.5]])],
         units=[U("ar1", "india", 92.73, 23.74, 800, "1 Assam Rifles"), U("bde", "india", 92.7, 23.82, 1600, "61 Mtn Bde"),
                U("arL", "india", 92.76, 22.89, 120, "AR post"), U("arC", "india", 93.33, 23.48, 120, "AR post"),
                U("sikh8", "india", 92.8, 23.1, 800, "8 Sikh"), U("bn3", "india", 93.22, 23.52, 800),
                U("mnaA", "mnf", 92.68, 22.95, label="MNA"), U("mnaL", "mnf", 92.6, 22.8, label="MNA"),
                U("mnaC", "mnf", 93.3, 23.6, label="MNA")],
         fights=[dict(a="sikh8", b="mnaA", intensity=2), dict(a="bn3", b="mnaC", intensity=2)]),
    dict(date="1966-03-25", view=FULL, caption="Every town is retaken; the MNF takes to the jungle",
         territory=dict(india=[MIZO], mnf=[JUNGLE_SW, JUNGLE_E, CHT_CAMPS]),
         arrows=[dict(faction="mnf", path=[[92.6, 22.8], [92.45, 22.75], [92.25, 22.8]])],
         units=[U("ar1", "india", 92.73, 23.74, 800, "1 Assam Rifles"), U("bde", "india", 92.7, 23.82, 1600, "61 Mtn Bde"),
                U("sikh8", "india", 92.76, 22.89, 800, "8 Sikh"), U("bn3", "india", 93.33, 23.48, 800),
                U("mnaA", "mnf", 92.45, 23.0, label="MNA"), U("mnaL", "mnf", 92.15, 22.8, label="MNA"),
                U("mnaC", "mnf", 93.35, 23.4, label="MNA")],
         fights=[dict(a="sikh8", b="mnaA", intensity=1), dict(a="bn3", b="mnaC", intensity=1)]),
    dict(date="1967-02-25", caption="Regrouping: 106 villages moved into 18 centres (52,210 people)",
         territory=dict(india=[MIZO], mnf=[JUNGLE_SW, JUNGLE_E, CHT_CAMPS]),
         units=[U("ar1", "india", 92.73, 23.74, 800, "Assam Rifles"), U("bde", "india", 92.7, 23.82, 1600, "61 Mtn Bde"),
                U("sikh8", "india", 92.76, 22.89, 800), U("bn3", "india", 93.33, 23.48, 800),
                U("mnaA", "mnf", 92.42, 23.1, label="MNA"), U("mnaL", "mnf", 92.15, 22.8, label="MNA"),
                U("mnaC", "mnf", 93.36, 23.45, label="MNA")],
         fights=[dict(a="mnaA", b="sikh8", intensity=1), dict(a="mnaC", b="bn3", intensity=1)]),
    dict(date="1969-08-01", caption="New Grouping Centres: 184 villages into 40 centres (97,339 people)",
         territory=dict(india=[MIZO], mnf=[JUNGLE_SW, CHT_CAMPS]),
         units=[U("ar1", "india", 92.73, 23.74, 800, "Assam Rifles"), U("bde", "india", 92.7, 23.82, 1600, "61 Mtn Bde"),
                U("sikh8", "india", 92.76, 22.89, 800), U("bn3", "india", 93.33, 23.48, 800),
                U("mnaA", "mnf", 92.42, 23.0, label="MNA"), U("mnaL", "mnf", 92.15, 22.8, label="MNA")],
         fights=[dict(a="sikh8", b="mnaA", intensity=1)]),
    dict(date="1971-12-10", view=[91.3, 21.6, 93.7, 24.4], caption="1971 war: MNF camps in East Pakistan are overrun",
         territory=dict(india=[MIZO], mnf=[JUNGLE_SW, CHT_CAMPS]),
         arrows=[dict(faction="india", path=[[92.53, 22.9], [92.35, 22.8], [92.2, 22.72]])],
         battles=[dict(at=[92.18, 22.65], label="Rangamati")],
         units=[U("ar1", "india", 92.73, 23.74, 800, "Assam Rifles"), U("sikh8", "india", 92.76, 22.89, 800),
                U("cht", "india", 92.25, 22.74, label="Indian forces"),
                U("mnaA", "mnf", 92.12, 22.95, label="MNA"), U("mnaL", "mnf", 92.12, 22.58, label="MNA")],
         fights=[dict(a="cht", b="mnaL", intensity=3), dict(a="cht", b="mnaA", intensity=2)]),
    dict(date="1972-01-21", view=FULL, caption="Mizoram becomes a Union Territory; the MNF flees to Burma",
         territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]),
         arrows=[dict(faction="mnf", path=[[92.2, 22.6], [92.5, 22.0], [92.9, 21.5]])],
         units=[U("ar1", "india", 92.73, 23.74, 800, "Assam Rifles"), U("sikh8", "india", 92.76, 22.89, 800),
                U("mnaA", "mnf", 92.95, 21.6, label="MNA"), U("mnaL", "mnf", 93.15, 21.4, label="MNA")]),
    dict(date="1975-01-13", view=[92.1, 22.9, 93.4, 24.6], caption="MNA gunmen kill three senior police officers in Aizawl",
         territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]),
         battles=[dict(at=[92.74, 23.72])],
         units=[U("police", "india", 92.8, 23.68, label="Police HQ"), U("ar1", "india", 92.68, 23.92, 800, "Assam Rifles"),
                U("mnaS", "mnf", 92.62, 23.62, label="MNA squad"),
                U("mnaA", "mnf", 92.95, 21.6, label="MNA"), U("mnaL", "mnf", 93.15, 21.4, label="MNA")],
         fights=[dict(a="mnaS", b="police", intensity=3)]),
    dict(date="1986-06-30", view=FULL, caption="Mizoram Peace Accord: Laldenga and the Government of India",
         territory=dict(india=[MIZO]),
         arrows=[dict(faction="mnf", path=[[93.0, 21.6], [92.9, 22.4], [92.8, 23.2], [92.73, 23.65]])],
         units=[U("ar1", "india", 92.7, 23.82, 800, "Assam Rifles"),
                U("mnaA", "mnf", 92.78, 23.62, label="MNF"), U("mnaL", "mnf", 92.82, 23.4, label="MNF")]),
    dict(date="1986-08-21", caption="Arms handed over; Laldenga heads a new government",
         territory=dict(india=[MIZO]),
         units=[U("ar1", "india", 92.7, 23.82, 800, "Assam Rifles"),
                U("mnaA", "mnf", 92.74, 23.66, 572, "MNF cadres overground")]),
    dict(date="1987-02-20", caption="Mizoram becomes a state of India",
         territory=dict(state=[MIZO]),
         units=[]),
]

scene = {
    "title": "The Mizo insurgency, 1966-1987",
    "note": "Events and dates are from the sources listed in the README. Indian figures are nominal unit strengths, not counts; MNA strength is unknown and is not shown. Exchanges of fire are illustrative of the fighting, not a record of specific engagements, except where a caption names one. Borders are hand-traced.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None,
    "segments": [{
        "type": "campaign2d", "duration": 62, "hold": 3, "timing": "keyframes",
        "bbox": [89.5, 19.5, 96.5, 27.0], "view": ZOOM_AIZAWL,
        "caption": "THE MIZO INSURGENCY", "legendBottom": 400,
        "footnote": "Indian figures: nominal unit strengths. MNA strength unknown. Fire is illustrative.",
        "style": {"land": ["#6f7d4c", "#94a066", "#4f5c36"], "water": "#1f3f78", "river": "#2d5294", "territoryAlpha": 0.55},
        "factions": [
            {"id": "india", "name": "Indian Army & Assam Rifles", "color": "#ff9933",
             "flag": {"type": "tricolor-h", "colors": ["#ff9933", "#ffffff", "#138808"], "wheel": "#000080"}},
            {"id": "mnf", "name": "Mizo National Front (MNA)", "color": "#2f6fd6",
             "flag": {"type": "solid", "color": "#1f4fa8", "star": "#ffffff"}},
            {"id": "state", "name": "State of Mizoram (1987)", "color": "#2fbf71",
             "flag": {"type": "tricolor-h", "colors": ["#ff9933", "#ffffff", "#138808"], "wheel": "#000080"}},
        ],
        "layers": {"water": [SEA, KAPTAI], "rivers": RIVERS},
        "cities": CITIES,
        "keyframes": kfs,
    }],
    "subtitles": [
        {"start": 0.4, "end": 4.3, "text": "*28 February 1966.* Operation Jericho begins"},
        {"start": 4.6, "end": 8.8, "text": "The MNF declares *independence*"},
        {"start": 9.2, "end": 13.3, "text": "Jets strike *Aizawl*, 5 and 6 March"},
        {"start": 13.7, "end": 18.0, "text": "The army fights its way back in"},
        {"start": 22.8, "end": 27.0, "text": "Villages are *regrouped* under guard"},
        {"start": 32.0, "end": 36.4, "text": "*1971.* The MNF loses its East Pakistan bases"},
        {"start": 41.0, "end": 45.2, "text": "*1972.* Mizoram becomes a Union Territory"},
        {"start": 50.0, "end": 54.4, "text": "*1986.* The Mizoram Peace Accord"},
        {"start": 58.6, "end": 61.9, "text": "*1987.* Mizoram becomes a *state*"},
    ],
    "subtitleStyle": {"size": 52, "y": 0.88},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
