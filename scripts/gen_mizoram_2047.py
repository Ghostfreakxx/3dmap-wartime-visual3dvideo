# Generates public/scenes/mizoram-2047.json: "Mizoram 2047", a speculative
# development scenario built on today's real data.
# Usage: python3 scripts/gen_mizoram_2047.py public/scenes/mizoram-2047.json
#
# PART 1 uses sourced facts (see README "Mizoram 2047"). PART 2 is a
# SCENARIO: every projection below is computed from the ASSUMPTIONS block,
# so the numbers can be traced and changed. Nothing here is a forecast.
import json, math, os, runpy, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    argv = sys.argv
    sys.argv = [name, os.devnull]  # sibling generators write their JSON to argv[1]
    try:
        return runpy.run_path(os.path.join(HERE, name))
    finally:
        sys.argv = argv


NE = load("gen_northeast_burma.py")
MZ = load("gen_mizo_insurgency.py")

# ---------------- sourced facts (PART 1) ----------------
FACTS = dict(
    area_km2=21081, districts=11,
    pc_gsdp_2425=287097,            # PRS, per-capita GSDP 2024-25, current prices
    gsdp_2425_cr=34003,             # PRS 2025-26 analysis, revised 2024-25 GSDP (Rs crore)
    gsdp_cagr=0.0936,               # Economic Survey 2025-26, 2011-12 to 2024-25 (constant prices)
    asean_trade_bn=123,             # MoCI, India-ASEAN trade FY2024-25 (USD bn)
    solar_potential_gw=9.09,        # MNRE / NISE
    solar_installed_mw_2021=1.53,   # MNRE annual report 2021-22
    jhum_ha_2005=40100, jhum_ha_2022=18107, jhum_families=60681,
    rail_km=51.38,                  # Bairabi-Sairang, inaugurated 13 Sep 2025
    kaladan_road_km=109,            # Paletwa-Zorinpui (secondary source)
)

# ---------------- ASSUMPTIONS (PART 2, scenario) ----------------
A = dict(
    hill_factor=1.5,            # road km per straight-line km in hill terrain
    cost_cr_per_km=30,          # 4-lane hill expressway, Rs crore/km
    labour_share=0.20,          # share of cost paid as wages
    wage_lakh_year=3.6,         # average construction wage, Rs lakh/year
    build_years=8,
    homes=50000, rented_share=0.30, rent_month=12000,
    farm_ha=18000,
    battalions=5, battalion_size=1000,
    solar_mw=1000, kwh_per_kwp=1300, compute_share=0.30,
    trade_share=0.01,
    boosted_cagr=0.12, target_year=2047,
)


def hav(a, b):
    R = 6371
    la1, lo1, la2, lo2 = map(math.radians, (a[1], a[0], b[1], b[0]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


# ---------------- places ----------------
HQ = {
    "Aizawl": [92.72, 23.73], "Kolasib": [92.68, 24.22], "Mamit": [92.47, 23.93], "Saitual": [92.97, 23.68],
    "Khawzawl": [93.19, 23.54], "Champhai": [93.33, 23.47], "Serchhip": [92.85, 23.3], "Hnahthial": [92.95, 22.97],
    "Lunglei": [92.75, 22.88], "Lawngtlai": [92.9, 22.53], "Siaha": [92.97, 22.49],
}
GATES = {"Zorinpui": [92.72, 21.98], "Zokhawthar": [93.39, 23.36], "Vairengte": [92.75, 24.5], "Tlabung": [92.53, 22.9]}
P = {**HQ, **GATES}
KOLKATA, SITTWE, PALETWA = [88.36, 22.57], [92.9, 20.15], [92.86, 21.3]
SILCHAR, BAIRABI, SAIRANG = [92.8, 24.83], [92.55, 24.18], [92.65, 23.81]
KALAY, MANDALAY, YANGON, BANGKOK, MAESOT = [94.06, 23.19], [96.08, 21.97], [96.16, 16.8], [100.5, 13.75], [98.57, 16.71]

# expressway grid = minimum spanning tree over district HQs + gateways
names = list(P)
inside, edges = {names[0]}, []
while len(inside) < len(names):
    best = min(((hav(P[a], P[b]), a, b) for a in inside for b in names if b not in inside))
    edges.append(best)
    inside.add(best[2])
road_km = [(d * A["hill_factor"], a, b) for d, a, b in edges]
total_km = sum(k for k, _, _ in road_km)
person_years_per_km = A["cost_cr_per_km"] * 1e7 * A["labour_share"] / (A["wage_lakh_year"] * 1e5)
jobs_per_km = person_years_per_km / A["build_years"]
total_jobs = total_km * jobs_per_km
rent_cr = A["homes"] * A["rented_share"] * A["rent_month"] * 12 / 1e7
solar_twh = A["solar_mw"] * 1000 * A["kwh_per_kwp"] / 1e9
compute_mw = solar_twh * 1e6 * A["compute_share"] / 8760
trade_bn = FACTS["asean_trade_bn"] * A["trade_share"]
yrs = A["target_year"] - 2025
gsdp_trend = FACTS["gsdp_2425_cr"] * (1 + FACTS["gsdp_cagr"]) ** yrs
gsdp_boost = FACTS["gsdp_2425_cr"] * (1 + A["boosted_cagr"]) ** yrs


def fmt_cr(x):
    return f"Rs {x/1e5:.1f} lakh crore" if x >= 1e5 else f"Rs {x:,.0f} crore"


# ---------------- map ----------------
C = lambda name, at, **kw: dict(name=name, at=at, **kw)
CITIES = [
    C("Kolkata", KOLKATA, size=26), C("Dhaka", [90.41, 23.81]), C("Chittagong", [91.83, 22.36]), C("Sittwe", SITTWE, size=24),
    C("Paletwa", PALETWA), C("Yangon", YANGON, size=24), C("Mandalay", MANDALAY, size=24), C("Bangkok", BANGKOK, size=26),
    C("Kalay", KALAY), C("Imphal", [93.94, 24.82]), C("Guwahati", [91.75, 26.18]), C("Silchar", SILCHAR),
    C("Mae Sot", MAESOT, maxView=9),
    C("INDIA", [89.0, 25.6], region=True, size=34), C("BANGLADESH", [90.2, 23.2], region=True, size=26),
    C("MYANMAR", [96.4, 20.0], region=True, size=34), C("THAILAND", [100.2, 16.0], region=True, size=30),
    C("BAY OF BENGAL", [89.4, 18.0], region=True, size=26),
] + [C(n, at, size=(28 if n == "Aizawl" else 20), **({} if n == "Aizawl" else {"maxView": 4})) for n, at in HQ.items()] + [
    C(n, at, size=19, maxView=4) for n, at in GATES.items()
]

V_SEA = [86.5, 13.2, 101.0, 27.0]
V_KAL = [87.6, 19.3, 94.8, 25.2]
V_MZ = [91.95, 21.8, 93.75, 24.95]
V_SOUTH = [92.25, 21.75, 93.45, 23.25]

LAI = [[92.62, 22.86], [92.95, 22.86], [93.1, 22.62], [93.0, 22.38], [92.86, 22.12], [92.68, 22.3], [92.7, 22.6]]
MARA = [[93.0, 22.62], [93.2, 22.55], [93.15, 22.25], [93.05, 22.0], [92.9, 21.95], [92.86, 22.12], [93.0, 22.38]]
CHAKMA = [[92.45, 22.86], [92.62, 22.86], [92.7, 22.6], [92.68, 22.3], [92.55, 22.2], [92.48, 22.5]]


def U(id, f, at, n=None, label=None, dx=0, dy=0):
    d = dict(id=id, faction=f, at=[at[0] + dx, at[1] + dy])
    if n: d["troops"] = int(round(n))
    if label: d["label"] = label
    return d


EV, active = [], []


def ev(add=(), drop=(), **kw):
    # markers from earlier chapters shrink to small icons when new ones arrive
    global active
    kept = [x for x in active if x["id"] not in drop]
    if add:
        kept = [{**x, "mini": True} for x in kept]
    active = kept + list(add)
    kw.setdefault("territory", dict(mizoram=[MZ["MIZO"]]))
    EV.append(dict(units=[dict(x) for x in active], **kw))


# ---------------- PART 1: today ----------------
ev(date="2026-01-01", hold=5.5, view=V_SEA, caption="Mizoram today",
   say="*Mizoram*: 21,081 km² of hills between Bangladesh and Myanmar",
   stats=[f"Area: {FACTS['area_km2']:,} km² · {FACTS['districts']} districts",
          f"Per-capita GSDP 2024-25: Rs {FACTS['pc_gsdp_2425']:,}",
          f"GSDP growth 2011-25: {FACTS['gsdp_cagr']*100:.2f}% a year"])
ev(date="2026-01-01", seconds=6, hold=6.5, view=V_KAL, caption="The Kaladan Multi-Modal corridor",
   say="The *Kaladan* corridor: Kolkata by sea to *Sittwe*, up the river to Paletwa, then by road into Mizoram",
   add=[U("sittwe", "trade", SITTWE, label="Sittwe port", dx=0.35)],
   routes=[dict(kind="sea", path=[KOLKATA, [88.15, 21.9], [88.4, 21.0], [90.0, 20.4], [91.7, 19.95], [92.75, 20.05], SITTWE], label="Sea leg", labelAt=[90.0, 20.1]),
           dict(kind="river", path=[SITTWE, [92.96, 20.5], [92.9, 20.9], PALETWA], label="Kaladan river", labelAt=[93.6, 20.75]),
           dict(kind="road", status="stalled", path=[PALETWA, [92.8, 21.65], GATES["Zorinpui"]], label="~109 km road: stalled", labelAt=[93.75, 21.65]),
           dict(kind="road", path=[GATES["Zorinpui"], HQ["Lawngtlai"], HQ["Lunglei"], HQ["Serchhip"], HQ["Aizawl"]], label="To Aizawl", labelAt=[93.5, 23.0])],
   stats=["Sittwe port: operational", "Paletwa-Zorinpui road: stalled by the Arakan conflict",
          "Target: fully operational by 2027", "Saves ~700 km on Kolkata-Mizoram"])
ev(date="2026-01-01", seconds=4.5, hold=5, view=V_MZ, caption="Rail reaches Aizawl, 2025",
   say="*13 September 2025*: the 51.38 km Bairabi-Sairang line brings rail to Aizawl",
   routes=[dict(kind="rail", path=[SILCHAR, [92.65, 24.5], BAIRABI, [92.6, 24.0], SAIRANG], label="Bairabi-Sairang rail", labelAt=[92.25, 24.05])],
   stats=["Bairabi-Sairang: 51.38 km", "Opened 13 September 2025"])
ev(date="2026-01-01", seconds=5.5, hold=6.5, view=V_SEA, caption="The gateway to Southeast Asia",
   say=f"India-ASEAN trade: *${FACTS['asean_trade_bn']} billion* a year. Mizoram sits on the shortest land path east",
   add=[U("zokh", "trade", GATES["Zokhawthar"], label="Zokhawthar border trade", dx=0.25)],
   arrows=[dict(faction="trade", path=[HQ["Aizawl"], GATES["Zokhawthar"], KALAY, MANDALAY, [97.5, 19.0], MAESOT, BANGKOK]),
           dict(faction="trade", path=[SITTWE, [93.4, 18.2], [94.3, 15.9], [95.8, 15.7], YANGON])],
   stats=[f"India-ASEAN trade FY2024-25: ${FACTS['asean_trade_bn']} bn",
          f"Scenario: if {A['trade_share']*100:.0f}% moved via Mizoram:", f"${trade_bn:.1f} bn of goods a year"])

# ---------------- PART 2: the scenario ----------------
ev(date="2027-01-01", seconds=4, hold=6, view=V_MZ, caption="SCENARIO: a new government",
   say="*Scenario.* A new *right-wing* government takes office with a Mizo-first programme",
   stats=["SCENARIO, NOT A FORECAST", "Mizo-first jobs · homes · farms", "energy · security · one administration"])

north = [e for e in road_km if min(P[e[1]][1], P[e[2]][1]) >= 23.2]
south = [e for e in road_km if e not in north]


def exp_routes(es):
    return [dict(kind="expressway", path=[P[a], P[b]]) for _, a, b in es]


def job_units(es, tag):
    out = []
    for k, (km, a, b) in enumerate(es):
        mid = [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2]
        out.append(U(f"job_{tag}{k}", "jobs", mid, km * jobs_per_km))
    return out


ev(date="2029-01-01", seconds=6, hold=5.5, caption="An expressway grid, built by Mizo workers",
   say="*Autobahn-style* public works: an expressway grid built by Mizo workers, starting in the north",
   routes=exp_routes(north), add=job_units(north, "n"),
   stats=[f"Northern links: {sum(k for k,_,_ in north):,.0f} km",
          f"~{jobs_per_km:.0f} construction jobs per km", "(assumed Rs 30 cr/km, 20% wages)"])
ev(date="2032-01-01", seconds=6, hold=6, caption="All 11 district HQs and 4 border gates linked",
   say=f"By *2032* all 11 district headquarters and the border gates are linked: *{total_km:,.0f} km*",
   routes=exp_routes(south), add=job_units(south, "s"),
   stats=[f"Expressway grid: {total_km:,.0f} km", f"Construction jobs: ~{total_jobs:,.0f} a year", f"for {A['build_years']} years"])

HOMES = {"Aizawl": 0.42, "Lunglei": 0.14, "Champhai": 0.1, "Kolasib": 0.08, "Serchhip": 0.07, "Lawngtlai": 0.07, "Siaha": 0.05, "Mamit": 0.07}
ev(date="2033-01-01", seconds=5, hold=6.5, caption="Homes for an urban Mizoram",
   say="*50,000* new urban homes, owned by Mizo families who rent to visitors and workers",
   add=[U("home_" + n, "homes", HQ[n], A["homes"] * s, dx=-0.13, dy=0.05) for n, s in HOMES.items()],
   stats=["Land stays with Mizo owners (Art. 371G)", f"{A['rented_share']*100:.0f}% rented at Rs {A['rent_month']:,}/month:",
          f"~Rs {rent_cr:,.0f} crore a year to Mizo landlords"])

FARMS = {"Lunglei": 0.2, "Lawngtlai": 0.2, "Mamit": 0.15, "Siaha": 0.12, "Champhai": 0.13, "Serchhip": 0.1, "Hnahthial": 0.1}
ev(date="2034-01-01", seconds=5, hold=6.5, caption="Beyond jhum: farm reform",
   say="*Farm reform*: the last jhum plots move to terraces, orchards and agroforestry",
   add=[U("farm_" + n, "farms", HQ[n], A["farm_ha"] * s, dx=0.13, dy=-0.06) for n, s in FARMS.items()],
   stats=[f"Jhum area: {FACTS['jhum_ha_2005']:,} ha (2005-06)", f"-> {FACTS['jhum_ha_2022']:,} ha (2022-23)",
          f"Scenario: convert the remaining ~{A['farm_ha']:,} ha"])
BAT = ["Aizawl", "Lunglei", "Champhai", "Kolasib", "Siaha"]
ev(date="2035-01-01", seconds=4.5, hold=6, caption="Mizo battalions*",
   say="*Mizo battalions*: thousands of young Mizos in uniform, guarding the border",
   add=[U("bat_" + n, "army", HQ[n], A["battalion_size"], dx=0.02, dy=0.12) for n in BAT],
   stats=[f"{A['battalions']} battalions x {A['battalion_size']:,} = {A['battalions']*A['battalion_size']:,} jobs",
          "*Defence is a Union subject: in practice", "via Territorial Army / India Reserve Bns"])
SOLAR = {"Champhai": 220, "Khawzawl": 150, "Serchhip": 160, "Lunglei": 180, "Lawngtlai": 140, "Kolasib": 150}
ev(date="2036-01-01", seconds=5, hold=6.5, caption="A solar belt across the hills",
   say=f"A *solar belt*: {A['solar_mw']:,} MW, a ninth of the state's {FACTS['solar_potential_gw']} GW potential",
   add=[U("sol_" + n, "solar", HQ[n], mw, dx=0.16, dy=0.06) for n, mw in SOLAR.items()],
   stats=[f"Potential: {FACTS['solar_potential_gw']} GW (MNRE)", f"Installed in 2021: {FACTS['solar_installed_mw_2021']} MW",
          f"Scenario {A['solar_mw']:,} MW -> {solar_twh:.1f} TWh a year"])
ev(date="2037-01-01", seconds=4.5, hold=6.5, caption="Compute hubs for the youth",
   say="*Compute hubs*: Mizo youth run AI servers and Bitcoin mining on solar power",
   add=[U("cmp_aiz", "compute", HQ["Aizawl"], compute_mw * 0.5, dx=0.17, dy=-0.04),
        U("cmp_lun", "compute", HQ["Lunglei"], compute_mw * 0.3, dx=-0.17, dy=-0.1),
        U("cmp_cha", "compute", HQ["Champhai"], compute_mw * 0.2, dx=0.05, dy=-0.12)],
   stats=[f"{A['compute_share']*100:.0f}% of solar output -> ~{compute_mw:.0f} MW of compute", "Crypto gains taxed at 30% in India"])

ADCS = [U("adc_lai", "lai", HQ["Lawngtlai"], label="Lai ADC", dx=-0.05, dy=0.1),
        U("adc_mara", "mara", HQ["Siaha"], label="Mara ADC", dx=0.12, dy=-0.12),
        U("adc_cha", "chakma", [92.6, 22.62], label="Chakma ADC", dx=-0.06)]
ev(date="2038-01-01", seconds=5, hold=6, view=V_SOUTH, caption="Three district councils (since 1972)",
   say="Today three *Autonomous District Councils* govern the south: Lai, Mara and Chakma",
   territory=dict(mizoram=[MZ["MIZO"]], lai=[LAI], mara=[MARA], chakma=[CHAKMA]), add=ADCS,
   stats=["Created 1972 under the Sixth Schedule", "Chakma ADC ~44,000 people · Mara ADC ~65,000"])
ev(date="2039-01-01", seconds=4.5, hold=6.5, caption="One administration for all Mizoram",
   say="The scenario merges them into *one administration* for the whole state",
   drop=[u["id"] for u in ADCS],
   stats=["Requires Parliament to amend", "the Sixth Schedule (Union power)"])

active = [{**x, "mini": True} for x in active]
ev(date="2047-01-01", seconds=6, hold=9, view=V_MZ, caption="Mizoram 2047 (scenario)",
   say=f"*2047.* On trend GSDP reaches {fmt_cr(gsdp_trend)}; at {A['boosted_cagr']*100:.0f}% a year, *{fmt_cr(gsdp_boost)}*",
   stats=[f"GSDP 2024-25: Rs {FACTS['gsdp_2425_cr']:,} crore",
          f"2047 on trend ({FACTS['gsdp_cagr']*100:.2f}%): {fmt_cr(gsdp_trend)}",
          f"2047 at {A['boosted_cagr']*100:.0f}%: {fmt_cr(gsdp_boost)}",
          "SCENARIO, NOT A FORECAST"])
ev(date="2047-01-01", seconds=6, hold=7, view=V_SEA, caption="The gateway of Southeast Asia",
   say="*Mizoram 2047*: India's gateway to Southeast Asia")

# ---------------- timing & subtitles ----------------
INTRO = 7.0
subs, t = [{"start": INTRO + 0.3, "end": INTRO + EV[0]["hold"], "text": EV[0]["say"]}], INTRO + EV[0]["hold"]
for e in EV[1:]:
    mv, hd = e["seconds"], e["hold"]
    subs.append({"start": round(t + mv * 0.45, 2), "end": round(t + mv + hd - 0.15, 2), "text": e["say"]})
    t += mv + hd
map_dur = round(t - INTRO, 2)
for e in EV:
    e.pop("say")

icon = lambda g, bg, fg="#ffffff": {"type": "icon", "glyph": g, "bg": bg, "fg": fg}
scene = {
    "title": "Mizoram 2047 (scenario)",
    "note": "PART 1 is sourced data; PART 2 is a speculative scenario computed from the assumptions in scripts/gen_mizoram_2047.py.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "transition": 0.5,
    "segments": [
        {"type": "flyover3d", "duration": INTRO, "jet": {"hidden": True},
         "camera": {"mode": "chase", "distance": 40, "height": 30, "fov": 55},
         "flight": {"speed": 170, "altitude": 470, "weave": 70},
         "terrain": {"seed": 33, "height": 400, "low": "#12300f", "mid": "#2f6b2a", "high": "#6e8c4c"},
         "sky": {"zenith": "#203a5a", "horizon": "#ffc26b", "sun": "#fff4c8", "fog": "#7f9a7a", "sunElevation": 4},
         "title": {"text": "MIZORAM 2047", "sub": "A VISION · SCENARIO", "start": 0.4, "end": INTRO - 0.2, "size": 96, "subSize": 50}},
        {"type": "campaign2d", "duration": map_dur, "hold": 0, "bbox": [84.0, 11.0, 103.5, 28.5], "view": V_SEA,
         "dateFormat": "YYYY", "caption": "MIZORAM 2047", "legendBottom": 390,
         "footnote": "Part 1: sourced data. Part 2: scenario computed from stated assumptions, not a forecast.",
         "style": {"land": ["#6f7d4c", "#94a066", "#4f5c36"], "water": "#1d4a86", "river": "#2d5a9e", "territoryAlpha": 0.45},
         "factions": [
             {"id": "mizoram", "name": "Mizoram", "color": "#2fbf71", "flag": {"type": "solid", "color": "#2fbf71"}},
             {"id": "trade", "name": "Trade gateways", "color": "#3fa9ff", "flag": icon("anchor", "#1e6fb8")},
             {"id": "jobs", "name": "Expressway jobs", "unit": "jobs", "color": "#ff8a3d", "flag": icon("road", "#d9661f")},
             {"id": "homes", "name": "New urban homes", "unit": "homes", "color": "#e05a7a", "flag": icon("house", "#c23b5c")},
             {"id": "farms", "name": "Farms beyond jhum", "unit": "ha", "color": "#3fbf5f", "flag": icon("leaf", "#24873f")},
             {"id": "army", "name": "Mizo battalions*", "unit": "", "color": "#8a9a4a", "flag": icon("shield", "#4a5a2a")},
             {"id": "solar", "name": "Solar parks", "unit": "MW", "color": "#ffd23f", "flag": icon("sun", "#f2b705", "#3a2a00")},
             {"id": "compute", "name": "Compute hubs", "unit": "MW", "color": "#8f74ff", "flag": icon("chip", "#5b3fd6")},
             {"id": "lai", "name": "Lai ADC", "color": "#e0b23a", "flag": {"type": "solid", "color": "#e0b23a"}},
             {"id": "mara", "name": "Mara ADC", "color": "#d0563a", "flag": {"type": "solid", "color": "#d0563a"}},
             {"id": "chakma", "name": "Chakma ADC", "color": "#8a5cc7", "flag": {"type": "solid", "color": "#8a5cc7"}},
         ],
         "layers": {"water": [NE["SEA"], MZ["KAPTAI"]], "rivers": NE["RIVERS"] + MZ["RIVERS"]},
         "cities": CITIES,
         "keyframes": EV},
    ],
    "subtitles": subs,
    "subtitleStyle": {"size": 46, "y": 0.885},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(EV)} events, total {INTRO + map_dur:.1f}s | grid {total_km:.0f} km, jobs/yr {total_jobs:,.0f}, rent Rs {rent_cr:.0f} cr, "
      f"solar {solar_twh:.2f} TWh, compute {compute_mw:.1f} MW, trade ${trade_bn:.2f} bn, GSDP 2047 {gsdp_trend:,.0f} / {gsdp_boost:,.0f} cr")
