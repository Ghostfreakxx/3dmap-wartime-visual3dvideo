# Generates public/scenes/mizo-insurgency-detailed.json: a slower, more
# detailed telling of the Mizo insurgency (1961-1987).
# Usage: python3 scripts/gen_mizo_detailed.py public/scenes/mizo-insurgency-detailed.json
#
# Each event below carries the fact it shows; sources are listed in the
# README ("Mizo insurgency, detailed"). Positions of small posts and Aizawl
# neighbourhoods are approximate. Where a source gives no location (the
# 5 Nov 1968 raid) the marker is placed illustratively and says so.
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_mizo_insurgency import MIZO, SEA, KAPTAI, RIVERS, CITIES as BASE_CITIES, CHT_CAMPS, BURMA_CAMPS, JUNGLE_SW, JUNGLE_E

# ---------- places ----------
AIZ, LUN, CHA = [92.72, 23.73], [92.75, 22.88], [93.33, 23.47]
CHAWNGTE, DEM, HNA, MAR = [92.63, 22.62], [92.53, 22.9], [93.28, 23.72], [92.35, 23.55]
TIP, TUI, VAP, SAI = [93.02, 24.24], [92.97, 22.33], [93.27, 23.22], [92.97, 22.49]
SIL, KOL, CHT, BARKAL = [92.8, 24.83], [92.68, 24.22], [92.1, 22.9], [92.36, 22.74]
CHANMARI, DAWRPUI, CHHINGA = [92.724, 23.748], [92.72, 23.728], [92.712, 23.718]
POLICE_HQ = [92.718, 23.732]

C = lambda name, at, **kw: dict(name=name, at=at, **kw)
CITIES = [c for c in BASE_CITIES if c["name"] not in ("Aizawl",)] + [
    C("Aizawl", AIZ, size=30),
    C("Chawngte", CHAWNGTE, size=20), C("Hnahlan", HNA, size=20), C("Marpara", MAR, size=20),
    C("Tipaimukh", TIP, size=20), C("Tuipang", TUI, size=20), C("Vaphai", VAP, size=20),
    C("Chanmari", CHANMARI, size=22, maxView=0.6), C("Dawrpui", DAWRPUI, size=22, maxView=0.6),
    C("Chhinga Veng", CHHINGA, size=22, maxView=0.6), C("Barkal", BARKAL, size=20),
]

V_REGION = [91.2, 21.0, 94.3, 25.3]
V_DIST = [91.95, 21.9, 93.75, 24.95]
V_NORTH = [92.25, 23.45, 93.35, 25.0]
V_AIZ = [92.64, 23.66, 92.80, 23.80]
V_CHT = [91.5, 22.0, 93.2, 23.8]

AIZ_HQ = [[92.70, 23.745], [92.74, 23.745], [92.74, 23.715], [92.70, 23.715]]
ROAD = {"km": 9, "path": [SIL, [92.75, 24.5], KOL, [92.7, 23.95], AIZ]}


def U(id, f, at, troops=None, label=None, dx=0.0, dy=0.0):
    d = dict(id=id, faction=f, at=[at[0] + dx, at[1] + dy])
    if troops: d["troops"] = troops
    if label: d["label"] = label
    return d


# garrisons attacked on 28 Feb - 1 Mar 1966 (1 Assam Rifles + 5 BSF posts)
AR = [U("ar_aiz", "india", AIZ, 800, "1 Assam Rifles HQ"), U("ar_lun", "india", LUN, label="AR"), U("ar_cha", "india", CHA, label="AR")]
BSF_POSTS = {"chawngte": CHAWNGTE, "dem": DEM, "hna": HNA, "mar": MAR, "tip": TIP, "tui": TUI, "vap": VAP}
BSF = [U("bsf_" + k, "india", v, label="BSF") for k, v in BSF_POSTS.items()]
MNA_AT = {"aiz": (AIZ, -0.11, 0.09), "lun": (LUN, -0.1, 0.08), "cha": (CHA, -0.12, 0.1)}
MNA_AR = [U("mna_" + k, "mnf", p, label="MNA", dx=dx, dy=dy) for k, (p, dx, dy) in MNA_AT.items()]
MNA_BSF = [U("mnb_" + k, "mnf", v, label="MNA", dx=-0.09, dy=-0.07) for k, v in BSF_POSTS.items()]

EV = []  # (keyframe dict) in order


def ev(**kw):
    EV.append(kw)


# ---------- 1961-1965 ----------
ev(date="1961-10-22", hold=4.5, view=V_REGION, caption="The Mizo National Front is formed",
   say="*October 1961.* After the Mautam famine, Laldenga's famine front becomes the *Mizo National Front*",
   territory=dict(india=[MIZO]), units=[U("mnf_hq", "mnf", AIZ, label="MNF · Laldenga", dy=-0.08)])
ev(date="1963-06-01", dateLabel="1963", seconds=4, hold=4.5, caption="Laldenga crosses into East Pakistan",
   say="*1963.* Laldenga crosses into *East Pakistan*: arms and training camps follow",
   territory=dict(india=[MIZO], mnf=[CHT_CAMPS]),
   arrows=[dict(faction="mnf", path=[AIZ, [92.4, 23.3], [92.15, 22.95]])],
   units=[U("mnf_hq", "mnf", CHT, label="MNF · Laldenga")])

# ---------- Operation Jericho ----------
ev(date="1966-02-28", seconds=4.5, hold=4.5, view=V_DIST, caption="Operation Jericho: 1 Assam Rifles attacked",
   say="*28 February 1966*, night: the MNF attacks *1 Assam Rifles* at Aizawl, Lunglei and Champhai",
   territory=dict(india=[MIZO]), units=AR + BSF + MNA_AR + [U("mnf_hq", "mnf", CHT, label="MNF · Laldenga")],
   fights=[dict(a="mna_aiz", b="ar_aiz", intensity=3), dict(a="mna_lun", b="ar_lun", intensity=2), dict(a="mna_cha", b="ar_cha", intensity=2)])
ev(date="1966-03-01", seconds=3, hold=4.5, caption="...and the BSF border posts",
   say="BSF posts are hit too: *Chawngte, Demagiri, Hnahlan, Marpara, Tipaimukh, Tuipang, Vaphai*",
   territory=dict(india=[MIZO]), units=AR + BSF + MNA_AR + MNA_BSF,
   fights=[dict(a="mnb_" + k, b="bsf_" + k, intensity=1) for k in BSF_POSTS] + [dict(a="mna_aiz", b="ar_aiz", intensity=2)])
ev(date="1966-03-01", seconds=2.5, hold=4.5, caption="1 March 1966: the MNF declares independence",
   say="*1 March.* The MNF declares *independence*",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ]), units=AR + BSF + MNA_AR + MNA_BSF,
   fights=[dict(a="mna_aiz", b="ar_aiz", intensity=2), dict(a="mna_lun", b="ar_lun", intensity=1), dict(a="mna_cha", b="ar_cha", intensity=1)])
ev(date="1966-03-02", seconds=3, hold=4, caption="The district is declared 'disturbed' (AFSPA)",
   say="*2 March.* Assam declares the whole Mizo district *disturbed* under the Armed Forces Special Powers Act",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ]), units=AR + BSF + MNA_AR + MNA_BSF,
   fights=[dict(a="mna_aiz", b="ar_aiz", intensity=2)])
ev(date="1966-03-03", seconds=4, hold=3.5, view=V_NORTH, caption="8 Sikh advances from Silchar",
   say="*3 March.* The 8th Sikh battalion starts down the road from *Silchar*",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ]),
   arrows=[dict(faction="india", path=[SIL, [92.75, 24.5], [92.69, 24.27]])],
   units=AR + [U("sikh8", "india", KOL, 800, "8 Sikh", dy=0.05)] + MNA_AR,
   fights=[dict(a="mna_aiz", b="ar_aiz", intensity=2)])
ev(date="1966-03-03", seconds=4, hold=5.5, view=V_AIZ, caption="Night of 3 March: ambush at Chanmari",
   say="That night an Assam Rifles patrol is *ambushed* at Chanmari, Aizawl: *5 jawans* are killed",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ]),
   units=[U("ar_aiz", "india", [92.72, 23.73], 800, "1 Assam Rifles HQ"), U("patrol", "india", CHANMARI, label="AR patrol"),
          U("amb1", "mnf", [92.738, 23.762], label="MNA"), U("amb2", "mnf", [92.708, 23.765], label="MNA")],
   fights=[dict(a="amb1", b="patrol", intensity=3), dict(a="amb2", b="patrol", intensity=2)],
   battles=[dict(at=CHANMARI, label="Chanmari ambush")], stats=["Assam Rifles patrol, Chanmari", "Killed: 5 jawans"])
ev(date="1966-03-05", seconds=5, hold=3.5, caption="5 March: jets over Aizawl",
   say="*5 March*, 10 a.m.: Toofani and Hunter jets appear over *Aizawl*",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ]),
   airstrikes=[dict(**{"from": [92.95, 24.2]}, at=DAWRPUI, label="IAF air strikes", passes=2)],
   units=[U("ar_aiz", "india", [92.72, 23.73], 800, "1 Assam Rifles HQ"),
          U("amb1", "mnf", [92.745, 23.75], label="MNA"), U("amb2", "mnf", [92.70, 23.745], label="MNA")],
   fights=[dict(a="amb1", b="ar_aiz", intensity=2), dict(a="amb2", b="ar_aiz", intensity=2)])
ev(date="1966-03-06", seconds=5, hold=5.5, caption="6 March: Dawrpui and Chhinga Veng burn",
   say="*6 March.* Heavier bombing: houses in *Dawrpui* and *Chhinga Veng* burn; residents flee to the hills",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ]),
   airstrikes=[dict(**{"from": [92.95, 24.2]}, at=CHHINGA, label="IAF air strikes", passes=3)],
   units=[U("ar_aiz", "india", [92.72, 23.73], 800, "1 Assam Rifles HQ"),
          U("amb1", "mnf", [92.75, 23.76], label="MNA"), U("amb2", "mnf", [92.69, 23.75], label="MNA")],
   stats=["Civilian deaths: est. 13-20 (contested)", "Officially reported at the time: none"])
ev(date="1966-03-07", seconds=4.5, hold=4.5, view=V_NORTH, caption="7 March: the army relieves the Aizawl garrison",
   say="*7 March.* The army reaches Aizawl; the MNF falls back toward *Lunglei*",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ, ROAD]),
   arrows=[dict(faction="india", path=[KOL, [92.7, 23.95], [92.72, 23.78]]), dict(faction="mnf", path=[[92.65, 23.75], [92.75, 23.45], [92.8, 23.2]])],
   units=AR[:1] + [U("sikh8", "india", AIZ, 800, "8 Sikh", dy=0.07), U("mna_aiz", "mnf", [92.8, 23.25], label="MNA")],
   fights=[dict(a="sikh8", b="mna_aiz", intensity=2)])
ev(date="1966-03-08", seconds=4, hold=3.5, view=V_DIST, caption="2/11 Gorkha Rifles and 3 Bihar move south and east",
   say="*8 March.* 2/11 *Gorkha Rifles* head for Champhai, 3 *Bihar* for Lunglei",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ, ROAD]),
   arrows=[dict(faction="india", path=[AIZ, [93.0, 23.62], [93.22, 23.52]]), dict(faction="india", path=[AIZ, [92.85, 23.3], [92.78, 23.02]])],
   units=AR + [U("sikh8", "india", AIZ, 800, "8 Sikh", dy=0.07), U("gr", "india", [93.15, 23.56], 800, "2/11 GR"),
               U("bihar", "india", [92.8, 23.1], 800, "3 Bihar")] + MNA_AR[1:] + [U("mna_aiz", "mnf", [92.82, 23.2], label="MNA")],
   fights=[dict(a="bihar", b="mna_aiz", intensity=2)])
ev(date="1966-03-14", seconds=4, hold=3.5, caption="14 March: Lunglei secured",
   say="*14 March.* Lunglei is secured",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ, ROAD, {"km": 9, "path": [AIZ, [92.85, 23.3], LUN]}]),
   units=AR + [U("sikh8", "india", AIZ, 800, "8 Sikh", dy=0.07), U("gr", "india", [93.22, 23.52], 800, "2/11 GR"),
               U("bihar", "india", LUN, 800, "3 Bihar", dy=0.06), U("mna_lun", "mnf", [92.6, 22.95], label="MNA"),
               U("mna_cha", "mnf", [93.22, 23.58], label="MNA")],
   fights=[dict(a="bihar", b="mna_lun", intensity=3), dict(a="gr", b="mna_cha", intensity=1)], battles=[dict(at=LUN, label="Lunglei")])
ev(date="1966-03-15", seconds=3, hold=4, caption="15 March: Champhai secured; 61 Mountain Brigade all in",
   say="*15 March.* Champhai is secured; all four battalions of *61 Mountain Brigade* are in the hills",
   territory=dict(mnf=[MIZO], india=[AIZ_HQ, ROAD, {"km": 9, "path": [AIZ, [92.85, 23.3], LUN]}, {"km": 9, "path": [AIZ, [93.0, 23.62], CHA]}]),
   units=AR + [U("sikh8", "india", AIZ, 800, "8 Sikh", dy=0.07), U("gr", "india", CHA, 800, "2/11 GR", dy=0.06),
               U("bihar", "india", LUN, 800, "3 Bihar", dy=0.06), U("mna_lun", "mnf", [92.5, 22.95], label="MNA"),
               U("mna_cha", "mnf", [93.4, 23.62], label="MNA")],
   fights=[dict(a="gr", b="mna_cha", intensity=3)], battles=[dict(at=CHA, label="Champhai")])
ev(date="1966-03-25", seconds=4.5, hold=6.5, view=V_REGION, caption="25 March: every place retaken",
   say="By *25 March* every town is retaken; MNF leaders take refuge in *East Pakistan*",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW, JUNGLE_E, CHT_CAMPS]),
   arrows=[dict(faction="mnf", path=[[92.5, 22.95], [92.35, 22.9], [92.15, 22.9]])],
   units=AR[:1] + [U("sikh8", "india", AIZ, 800, "8 Sikh", dx=0.13, dy=0.09), U("gr", "india", CHA, 800, "2/11 GR", dy=0.06),
                   U("bihar", "india", LUN, 800, "3 Bihar", dy=0.06), U("mna_lun", "mnf", [92.12, 22.95], label="MNA"),
                   U("mna_cha", "mnf", [93.38, 23.3], label="MNA"), U("mnf_hq", "mnf", CHT, label="MNF · Laldenga", dy=-0.1)],
   stats=["1966 uprising (SATP):", "Security forces killed: 59", "MNA killed: 95 · arrested: 558"])

# ---------- 1967-1970 ----------
GARRISON = [U("ar_aiz", "india", AIZ, 800, "Assam Rifles"), U("sikh8", "india", AIZ, 800, dx=0.13, dy=0.09),
            U("gr", "india", CHA, 800, dy=0.06), U("bihar", "india", LUN, 800, dy=0.06)]
ev(date="1967-01-03", seconds=4.5, hold=4.5, view=V_DIST, caption="Villages regrouped into guarded centres",
   say="*January 1967.* Village pickets fail, and villagers are moved into guarded *Protected and Progressive Villages*",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW, JUNGLE_E]),
   units=GARRISON + [U("mna_lun", "mnf", [92.4, 23.0], label="MNA"), U("mna_cha", "mnf", [93.36, 23.3], label="MNA")])
ev(date="1967-01-31", seconds=3.5, hold=4.5, caption="31 January 1967: jets strike Hmuntlang",
   say="*31 January 1967.* Air Force jets strike *Hmuntlang* village; Delhi denies it",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW, JUNGLE_E]),
   units=GARRISON + [U("mna_lun", "mnf", [92.4, 23.0], label="MNA"), U("mna_cha", "mnf", [93.36, 23.3], label="MNA")])
ev(date="1967-02-15", seconds=4.5, hold=5.5, caption="Ambushes on army convoys",
   say="MNA fighters *ambush* convoys near *Saiha, Tuipang* and *Demagiri*, then slip over the border",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW, JUNGLE_E]),
   units=GARRISON + [U("cv_sai", "india", [92.92, 22.56], label="Convoy"), U("cv_tui", "india", [92.98, 22.4], label="Convoy"),
                     U("cv_dem", "india", [92.6, 22.95], label="Convoy"),
                     U("am_sai", "mnf", [92.82, 22.62], label="MNA"), U("am_tui", "mnf", [93.1, 22.36], label="MNA"),
                     U("am_dem", "mnf", [92.48, 23.02], label="MNA")],
   fights=[dict(a="am_sai", b="cv_sai", intensity=3), dict(a="am_tui", b="cv_tui", intensity=2), dict(a="am_dem", b="cv_dem", intensity=2)],
   stats=["Security forces killed,", "4 Jan - 15 Feb 1967: 75 (SATP)"])
ev(date="1967-02-25", seconds=3.5, hold=4.5, caption="First grouping: 106 villages into 18 centres",
   say="The first grouping moves *106 villages* into *18 centres*: 52,210 people",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW, JUNGLE_E]),
   units=GARRISON + [U("mna_lun", "mnf", [92.4, 23.0], label="MNA"), U("mna_cha", "mnf", [93.36, 23.3], label="MNA")])
ev(date="1968-08-15", dateLabel="AUGUST 1968", seconds=4.5, hold=4.5, caption="Amnesty: 1,524 MNF members surrender",
   say="*August 1968.* Under an amnesty, *1,524* MNF members surrender",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW]),
   arrows=[dict(faction="mnf", path=[[92.45, 23.1], [92.6, 23.45], [92.68, 23.68]])],
   units=GARRISON + [U("surr", "mnf", AIZ, 1524, "Surrendered", dx=-0.12, dy=-0.05), U("mna_lun", "mnf", [92.4, 23.0], label="MNA")])
ev(date="1968-11-05", seconds=4, hold=5, caption="5 November 1968: raid on an MNF camp",
   say="*5 November 1968.* Assam Rifles raid an MNF camp; *3 riflemen* are killed",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW]),
   units=GARRISON + [U("raid", "india", [92.5, 23.25], label="Assam Rifles"), U("camp", "mnf", [92.37, 23.15], label="MNF camp (site unrecorded)")],
   fights=[dict(a="raid", b="camp", intensity=3)], stats=["Assam Rifles killed: 3", "(camp location not given in sources)"])
ev(date="1969-08-01", seconds=4, hold=4.5, caption="New Grouping Centres: 184 villages into 40",
   say="*1969.* A second phase moves *184 villages* into *40 centres*: 97,339 people",
   territory=dict(india=[MIZO], mnf=[JUNGLE_SW]),
   units=GARRISON + [U("mna_lun", "mnf", [92.4, 23.0], label="MNA")])

# ---------- 1971-1972 ----------
ev(date="1971-09-29", seconds=4.5, hold=4, view=V_CHT, caption="Mizo fighters in the Hill Tracts, 1971",
   say="*1971.* Mizo fighters operate with the Pakistan Army in the *Chittagong Hill Tracts*",
   territory=dict(india=[MIZO], mnf=[CHT_CAMPS]),
   units=GARRISON[:1] + [U("bihar", "india", LUN, 800, dy=0.06), U("mna_b", "mnf", BARKAL, label="MNA", dy=0.05),
                         U("mna_r", "mnf", [92.18, 22.65], label="MNA", dy=0.05)])
ev(date="1971-12-10", seconds=4, hold=4.5, caption="December 1971: MNF camps overrun",
   say="*December 1971.* Indian forces enter the Hill Tracts and overrun the *MNF camps*",
   territory=dict(india=[MIZO], mnf=[CHT_CAMPS]),
   arrows=[dict(faction="india", path=[DEM, [92.4, 22.82], [92.25, 22.72]])],
   units=GARRISON[:1] + [U("bihar", "india", LUN, 800, dy=0.06), U("cht_f", "india", [92.32, 22.82], label="Indian forces"),
                         U("mna_b", "mnf", BARKAL, label="MNA", dy=-0.08), U("mna_r", "mnf", [92.18, 22.65], label="MNA", dy=0.05)],
   fights=[dict(a="cht_f", b="mna_b", intensity=3), dict(a="cht_f", b="mna_r", intensity=2)])
ev(date="1972-01-21", seconds=4.5, hold=4.5, view=V_REGION, caption="Mizoram becomes a Union Territory",
   say="The MNF flees into *Burma*. On *21 January 1972*, Mizoram becomes a Union Territory",
   territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]),
   arrows=[dict(faction="mnf", path=[[92.2, 22.6], [92.5, 22.0], [92.9, 21.5]])],
   units=GARRISON[:2] + [U("mna_b", "mnf", [92.95, 21.6], label="MNA"), U("mna_r", "mnf", [93.15, 21.4], label="MNA")])

# ---------- 1974-1987 ----------
EXILE = [U("mna_b", "mnf", [92.95, 21.6], label="MNA"), U("mna_r", "mnf", [93.15, 21.4], label="MNA")]
ev(date="1974-06-01", dateLabel="1974", seconds=4, hold=4, caption="Laldenga sends terms from London",
   say="*1974.* From London, Laldenga sends his terms to *Indira Gandhi*",
   territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]), units=GARRISON[:2] + EXILE)
ev(date="1975-01-13", seconds=5, hold=6, view=V_AIZ, caption="13 January 1975: attack on the police HQ",
   say="*13 January 1975.* MNA gunmen in police uniform kill three senior officers at Aizawl *police HQ*",
   territory=dict(india=[MIZO]),
   units=[U("police", "india", POLICE_HQ, label="Police HQ"), U("sq", "mnf", [92.700, 23.722], label="MNA squad")],
   fights=[dict(a="sq", b="police", intensity=3, oneWay=True)], battles=[dict(at=POLICE_HQ)],
   stats=["Killed: the Inspector General,", "a Deputy IG and a Superintendent", "(one source dates it 14 January)"])
ev(date="1976-02-06", dateLabel="1976", seconds=4.5, hold=4, view=V_REGION, caption="1976: a partial accord",
   say="*1976.* A partial accord with Laldenga (sources differ: February or July)",
   territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]), units=GARRISON[:2] + EXILE)
ev(date="1980-04-04", seconds=4, hold=4, caption="4 April 1980: ceasefire",
   say="*4 April 1980.* Laldenga meets Indira Gandhi and orders an MNF *ceasefire*",
   territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]), units=GARRISON[:2] + EXILE)
ev(date="1982-06-01", dateLabel="1982", seconds=3.5, hold=4, caption="1982: talks collapse, MNF banned again",
   say="*1982.* Talks collapse and the MNF is *banned* again",
   territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]), units=GARRISON[:2] + EXILE)
ev(date="1984-10-31", seconds=3.5, hold=4, caption="October 1984: talks stall",
   say="*October 1984.* New talks stall when Indira Gandhi is *assassinated*",
   territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]), units=GARRISON[:2] + EXILE)
ev(date="1985-02-15", seconds=3.5, hold=4, caption="15 February 1985: Laldenga meets Rajiv Gandhi",
   say="*15 February 1985.* Laldenga meets *Rajiv Gandhi*; talks resume",
   territory=dict(india=[MIZO], mnf=[BURMA_CAMPS]), units=GARRISON[:2] + EXILE)
ev(date="1986-06-30", seconds=4.5, hold=5, caption="30 June 1986: the Mizoram Accord",
   say="*30 June 1986.* Laldenga and Home Secretary R. D. Pradhan sign the *Mizoram Accord*",
   territory=dict(india=[MIZO]),
   arrows=[dict(faction="mnf", path=[[93.0, 21.6], [92.9, 22.4], [92.8, 23.2], [92.73, 23.62]])],
   units=GARRISON[:1] + [U("mna_b", "mnf", [92.78, 23.55], label="MNF"), U("mna_r", "mnf", [92.85, 23.35], label="MNF")])
ev(date="1986-08-21", seconds=4, hold=5, caption="Laldenga forms a government",
   say="Arms are handed over, and on *21 August 1986* Laldenga heads a new government",
   territory=dict(india=[MIZO]),
   units=GARRISON[:1] + [U("mna_b", "mnf", AIZ, 572, "MNF cadres overground", dx=-0.05, dy=-0.2)],
   stats=["MNF cadres who came overground: 572", "(Lok Sabha, 28 July 1986: 525 so far)"])
ev(date="1987-02-20", seconds=4.5, hold=6, caption="20 February 1987: the State of Mizoram",
   say="*20 February 1987.* Mizoram becomes a *state* of India",
   territory=dict(state=[MIZO]), units=[])

# ---------- timing & subtitles (mirrors the engine's schedule) ----------
INTRO_HOLD = EV[0]["hold"]
subs, t = [], INTRO_HOLD
subs.append({"start": 0.4, "end": INTRO_HOLD + 0.2, "text": EV[0]["say"]})
for e in EV[1:]:
    mv, hd = e["seconds"], e["hold"]
    subs.append({"start": round(t + mv * 0.45, 2), "end": round(t + mv + hd - 0.15, 2), "text": e["say"]})
    t += mv + hd
duration = round(t, 2)
for e in EV:
    e.pop("say")

scene = {
    "title": "The Mizo insurgency, 1961-1987 (detailed)",
    "note": "See README 'Mizo insurgency, detailed' for sources. Indian figures are nominal unit strengths; MNA strength is unknown and not shown. Fire is illustrative of fighting reported in that place and period; named incidents are captioned.",
    "width": 1080, "height": 1920, "fps": 30, "audio": None, "transition": 0,
    "segments": [{
        "type": "campaign2d", "duration": duration, "hold": 0,
        "bbox": [89.5, 19.5, 96.5, 27.0], "view": V_REGION,
        "caption": "THE MIZO INSURGENCY", "legendBottom": 420,
        "footnote": "Indian figures: nominal unit strengths. MNA strength unknown. Fire is illustrative.",
        "style": {"land": ["#6f7d4c", "#94a066", "#4f5c36"], "water": "#1f3f78", "river": "#2d5294", "territoryAlpha": 0.55},
        "factions": [
            {"id": "india", "name": "Indian Army, Assam Rifles & BSF", "color": "#ff9933",
             "flag": {"type": "tricolor-h", "colors": ["#ff9933", "#ffffff", "#138808"], "wheel": "#000080"}},
            {"id": "mnf", "name": "Mizo National Front (MNA)", "color": "#2f6fd6",
             "flag": {"type": "solid", "color": "#1f4fa8", "star": "#ffffff"}},
            {"id": "state", "name": "State of Mizoram (1987)", "color": "#2fbf71",
             "flag": {"type": "tricolor-h", "colors": ["#ff9933", "#ffffff", "#138808"], "wheel": "#000080"}},
        ],
        "layers": {"water": [SEA, KAPTAI], "rivers": RIVERS},
        "cities": CITIES,
        "keyframes": EV,
    }],
    "subtitles": subs,
    "subtitleStyle": {"size": 46, "y": 0.87},
}
json.dump(scene, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(f"{len(EV)} events, {duration:.1f}s")
