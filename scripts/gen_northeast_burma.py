# Generates public/scenes/northeast-burma-1824.json (shared polygons are reused across keyframes).
# Usage: python3 scripts/gen_northeast_burma.py public/scenes/northeast-burma-1824.json
import json, sys
# ---------- geography (approximate, hand-traced) ----------
SEA = [[84,19.6],[85.8,19.8],[86.8,20.7],[87.5,21.6],[88.1,21.65],[88.9,21.6],[89.8,21.8],[90.5,22.1],[90.75,22.5],[91.4,22.6],[91.8,22.3],[91.98,21.43],[92.3,20.85],[92.9,20.15],[93.5,19.4],[94.3,18.45],[94.5,17.3],[94.2,16.05],[95.2,15.8],[95.8,16.1],[96.3,16.5],[96.9,16.9],[97.4,16.9],[97.6,16.45],[97.7,15.5],[97.85,15.25],[98.2,14.08],[98.6,12.44],[98.7,11.0],[98.55,9.98],[98.3,8.0],[98.2,4.0],[84,4.0]]
RIVERS = [
 {"km":2.5,"path":[[97.24,24.27],[96.6,23.4],[96.08,21.97],[95.98,21.85],[95.4,21.6],[94.86,21.17],[94.93,20.15],[94.97,19.97],[95.18,19.32],[95.22,18.82],[95.46,17.64],[95.6,17.25],[95.4,16.4],[95.2,15.85]]},
 {"km":1.8,"path":[[94.9,24.87],[94.6,24.0],[94.3,23.2],[94.7,22.6],[95.13,22.1],[95.4,21.6]]},
 {"km":3,"path":[[95.8,27.8],[94.9,27.48],[94.5,26.9],[94.2,26.75],[92.8,26.62],[91.75,26.18],[90.6,26.15],[89.98,26.02],[89.7,25.2],[89.8,24.0],[90.4,23.5],[90.6,23.0],[90.75,22.5]]},
 {"km":2,"path":[[88.1,24.8],[89.0,24.0],[89.7,23.8],[90.4,23.5]]},
 {"km":1.8,"path":[[98.6,25.5],[98.2,24.0],[97.9,22.0],[97.8,20.0],[97.65,17.8],[97.63,16.49]]},
 {"km":1.2,"path":[[93.2,24.2],[92.8,24.83],[92.2,24.9],[91.87,24.9]]},
]
CITIES = [("Calcutta",88.36,22.57,28),("Dhaka",90.41,23.81),("Chittagong",91.83,22.36),("Sylhet",91.87,24.9),("Silchar",92.8,24.83),
 ("Guwahati",91.75,26.18),("Sibsagar",94.64,26.98),("Shillong",91.88,25.58),("Kohima",94.11,25.67),("Imphal",93.94,24.82),
 ("Aizawl",92.72,23.73,28),("Lunglei",92.73,22.88),("Falam",93.68,22.91),("Akyab",92.9,20.15),("Mandalay",96.08,21.97,28),
 ("Bhamo",97.24,24.27),("Prome",95.22,18.82),("Toungoo",96.43,18.94),("Rangoon",96.16,16.8,28),("Moulmein",97.63,16.49),
 ("Tavoy",98.2,14.08),("Mergui",98.6,12.44)]

BENGAL = [[84,27],[86,26.6],[88,26.45],[89.9,26.3],[90.0,25.3],[91.0,25.2],[92.4,25.1],[92.45,24.3],[91.95,24.3],[91.3,23.9],[91.2,23.0],[91.7,22.9],[92.2,22.0],[92.35,20.8],[91.5,20.0],[84,18.5]]
ASSAM = [[90.0,25.9],[90.0,26.8],[92.0,26.95],[94.0,27.5],[95.8,28.2],[96.6,27.9],[95.8,27.0],[95.2,26.5],[94.2,25.95],[93.0,25.65],[92.0,25.65],[91.0,25.95]]
HILLS_ASSAM = [[90.0,25.3],[91.0,25.2],[92.4,25.1],[92.45,24.3],[93.1,24.3],[93.2,25.0],[93.0,25.65],[92.0,25.65],[91.0,25.95],[90.0,25.9]]  # Khasi-Jaintia-Cachar
NAGA = [[93.0,25.65],[94.2,25.95],[95.2,26.5],[95.3,26.0],[94.6,25.3],[93.9,25.6],[93.2,25.0]]
MANIPUR = [[93.1,24.3],[93.2,25.0],[93.9,25.6],[94.6,25.3],[94.3,24.0],[94.1,23.6],[93.6,23.85],[93.4,24.0]]
LUSHAI = [[92.25,24.3],[92.45,24.3],[93.1,24.3],[93.4,24.0],[93.3,23.0],[93.4,22.0],[93.0,21.8],[92.6,21.9],[92.3,22.7],[92.2,23.5]]
CHIN = [[93.3,23.0],[93.4,24.0],[93.6,23.85],[94.1,23.6],[94.1,23.0],[94.0,21.8],[93.4,21.3],[93.4,22.0]]
ARAKAN = [[92.35,20.8],[92.7,21.6],[93.4,21.3],[94.0,21.8],[94.6,19.4],[94.5,17.3],[94.0,15.5],[92.0,19.0]]
UPPER = [[94.3,24.0],[94.6,25.3],[95.3,26.0],[96.0,27.0],[97.5,28.3],[98.5,27.5],[98.7,25.5],[97.8,24.0],[98.8,23.5],[99.5,22.0],[100.5,21.5],[100.2,20.4],[98.9,19.8],[97.8,19.4],[96.9,19.4],[94.6,19.4],[94.0,21.8],[94.1,23.0],[94.1,23.6]]
PEGU = [[94.6,19.4],[96.9,19.4],[97.0,18.5],[96.9,17.3],[96.3,16.5],[95.0,15.5],[94.0,15.5],[94.5,17.3]]
TENASSERIM = [[96.9,19.4],[97.8,19.4],[97.8,18.5],[97.5,17.5],[98.6,16.0],[98.6,14.5],[99.2,12.0],[98.8,10.0],[98.5,9.6],[96.0,9.6],[96.9,17.3],[97.0,18.5]]
RANGOON = [[95.9,17.1],[96.5,17.1],[96.5,16.5],[95.9,16.5]]
IRRA_1825 = {"km":25,"path":[[96.16,16.8],[95.6,17.25],[95.46,17.64],[95.22,18.82]]}
IRRA_1826 = {"km":25,"path":[[95.22,18.82],[95.18,19.32],[94.97,19.97],[94.93,20.15],[94.86,21.17],[95.65,21.65]]}

def T(**kw): return {k:v for k,v in kw.items()}
U = lambda id,f,lon,lat,troops=None,label=None: {k:v for k,v in dict(id=id,faction=f,at=[lon,lat],troops=troops,label=label).items() if v is not None}

BR0 = [BENGAL]
BR26 = [BENGAL, ASSAM, ARAKAN, TENASSERIM]
BR35 = BR26 + [HILLS_ASSAM]
BR52 = BR35 + [PEGU]
BR66 = BR52 + [NAGA]
BR86 = BR66 + [UPPER]
BR90 = BR86 + [LUSHAI, CHIN]
BR91 = BR90 + [MANIPUR]
BURMA_PRE = [UPPER, PEGU, TENASSERIM, ARAKAN, ASSAM, MANIPUR]

kfs = [
 dict(date="1824-03-05", caption="War is declared on Konbaung Burma",
  view=[86.5,14.5,99.5,28.5],
  territory=dict(british=BR0, burma=BURMA_PRE, lushai=[LUSHAI, CHIN]),
  units=[U("bengal","british",88.6,22.9,20000,"Bengal Army"), U("chitt","british",91.85,22.5,3000), U("sylhet","british",91.9,24.95,3000),
         U("fleet","british",92.7,13.0,11000,"Campbell"), U("bandula","burma",92.95,20.7,10000,"Maha Bandula"),
         U("assam_b","burma",94.4,26.9,4000), U("manip_b","burma",93.9,24.9,3000), U("lushai","lushai",92.75,23.4,None,"Lushai chiefs")]),
 dict(date="1824-05-17", caption="Rangoon taken; Burmese win at Ramu",
  territory=dict(british=BR0+[RANGOON], burma=BURMA_PRE, lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="british", path=[[92.7,13.3],[94.5,14.8],[96.0,16.2],[96.16,16.7]]), dict(faction="burma", path=[[92.95,20.7],[92.4,21.0],[92.1,21.4]])],
  battles=[dict(at=[92.15,21.45], label="Ramu")],
  units=[U("bengal","british",88.6,22.9,20000,"Bengal Army"), U("chitt","british",91.85,22.5,2000), U("sylhet","british",91.9,24.95,3000),
         U("fleet","british",96.16,16.8,11000,"Campbell"), U("bandula","burma",92.2,21.5,10000,"Maha Bandula"),
         U("assam_b","burma",94.4,26.9,4000), U("manip_b","burma",93.9,24.9,3000), U("lushai","lushai",92.75,23.4,None,"Lushai chiefs")]),
 dict(date="1824-12-15", caption="Bandula's army is beaten outside Rangoon",
  view=[90.0,15.0,99.0,27.5],
  territory=dict(british=BR0+[RANGOON], burma=BURMA_PRE, lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="burma", path=[[92.2,21.5],[93.6,19.5],[95.0,18.0],[96.0,17.0]])],
  battles=[dict(at=[96.1,16.95], label="Rangoon")],
  units=[U("bengal","british",88.6,22.9,15000,"Bengal Army"), U("chitt","british",91.85,22.5,3000), U("sylhet","british",91.9,24.95,3000),
         U("fleet","british",96.2,16.7,5000,"Campbell"), U("bandula","burma",95.7,17.45,60000,"Maha Bandula"),
         U("assam_b","burma",94.4,26.9,4000), U("manip_b","burma",93.9,24.9,3000), U("lushai","lushai",92.75,23.4,None,"Lushai chiefs")]),
 dict(date="1825-04-01", caption="Bandula falls at Danubyu; Arakan and Assam taken",
  territory=dict(british=BR0+[RANGOON, IRRA_1825, ARAKAN, ASSAM], burma=[UPPER, PEGU, TENASSERIM, MANIPUR], lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="british", path=[[96.16,16.8],[95.6,17.25]]), dict(faction="british", path=[[91.9,22.4],[92.6,21.0],[93.2,20.6]]), dict(faction="british", path=[[91.75,26.0],[93.0,26.5],[94.6,26.95]])],
  battles=[dict(at=[95.6,17.25], label="Danubyu"), dict(at=[93.2,20.6], label="Mrauk U")],
  units=[U("bengal","british",88.6,22.9,12000,"Bengal Army"), U("sylhet","british",91.9,24.95,2000), U("arakan","british",93.2,20.6,11000,"Morrison"),
         U("assam","british",94.5,26.9,3000,"Assam column"), U("fleet","british",95.7,17.6,5000,"Campbell"), U("bandula","burma",95.4,18.4,15000,"Burmese army"),
         U("manip_b","burma",93.9,24.9,3000), U("lushai","lushai",92.75,23.4,None,"Lushai chiefs")]),
 dict(date="1825-06-15", caption="Gambhir Singh's Manipur Levy expels the Burmese",
  view=[89.5,15.0,99.0,27.5],
  territory=dict(british=BR0+[RANGOON, IRRA_1825, ARAKAN, ASSAM], burma=[UPPER, PEGU, TENASSERIM], manipur=[MANIPUR], lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="manipur", path=[[92.8,24.83],[93.4,24.85],[93.94,24.82]])],
  units=[U("bengal","british",88.6,22.9,12000,"Bengal Army"), U("arakan","british",93.2,20.6,6000,"Morrison"),
         U("assam","british",94.5,26.9,3000,"Assam column"), U("fleet","british",95.22,18.82,5000,"Campbell"), U("bandula","burma",95.4,19.8,15000,"Burmese army"),
         U("levy","manipur",93.94,24.82,500,"Manipur Levy"), U("lushai","lushai",92.75,23.4,None,"Lushai chiefs")]),
 dict(date="1826-02-24", caption="Treaty of Yandabo: Assam, Arakan, Tenasserim ceded",
  territory=dict(british=BR26, burma=[UPPER, PEGU], manipur=[MANIPUR], lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="british", path=[[95.22,18.82],[94.95,20.1],[94.86,21.17],[95.6,21.6]])],
  battles=[dict(at=[95.65,21.65], label="Yandabo")],
  units=[U("bengal","british",88.6,22.9,12000,"Bengal Army"), U("arakan","british",93.0,20.3,3000),
         U("assam","british",94.5,26.9,2000), U("fleet","british",95.65,21.65,4000,"Campbell"), U("bandula","burma",96.0,22.2,10000,"Burmese army"),
         U("levy","manipur",93.94,24.82,1000,"Manipur Levy"), U("lushai","lushai",92.75,23.4,None,"Lushai chiefs")]),
 dict(date="1852-12-20", caption="Second war: Lower Burma (Pegu) annexed",
  territory=dict(british=BR52, burma=[UPPER], manipur=[MANIPUR], lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="british", path=[[93.5,15.0],[95.5,15.9],[96.16,16.7]]), dict(faction="british", path=[[96.16,16.8],[95.5,17.6],[95.22,18.7]])],
  battles=[dict(at=[96.16,16.8], label="Rangoon")],
  units=[U("bengal","british",88.6,22.9,15000,"Bengal Army"), U("fleet","british",95.6,18.0,8000,"Godwin"),
         U("bandula","burma",96.0,22.2,10000,"Burmese army"), U("levy","manipur",93.94,24.82,1000), U("lushai","lushai",92.75,23.4,None,"Lushai chiefs")]),
 dict(date="1871-12-15", caption="The Lushai Expedition marches on the hills",
  view=[90.6,21.2,95.0,26.0],
  territory=dict(british=BR66, burma=[UPPER], manipur=[MANIPUR], lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="british", path=[[92.8,24.83],[92.9,24.2],[93.1,23.7],[93.25,23.4]]), dict(faction="british", path=[[92.53,22.9],[92.75,22.9],[93.0,23.1]])],
  units=[U("cachar","british",93.2,23.45,1700,"Bourchier"), U("chitt2","british",93.0,23.05,1800,"Brownlow"),
         U("levy","manipur",93.94,24.82,1000), U("lushai","lushai",92.75,23.7,None,"Lushai chiefs")]),
 dict(date="1885-11-28", caption="Third war: Mandalay falls, King Thibaw exiled",
  view=[90.0,15.0,99.5,27.5],
  territory=dict(british=BR66, burma=[UPPER], manipur=[MANIPUR], lushai=[LUSHAI, CHIN]),
  arrows=[dict(faction="british", path=[[95.18,19.32],[94.97,19.97],[94.86,21.17],[95.4,21.6],[96.0,21.9]])],
  battles=[dict(at=[94.97,19.97], label="Minhla"), dict(at=[96.08,21.97], label="Mandalay")],
  units=[U("burmafield","british",96.0,21.95,10000,"Prendergast"), U("bengal","british",88.6,22.9,15000,"Bengal Army"),
         U("thibaw","burma",96.15,22.1,None,"Royal army"), U("levy","manipur",93.94,24.82,1000), U("lushai","lushai",92.75,23.7,None,"Lushai chiefs")]),
 dict(date="1886-01-01", caption="Upper Burma annexed to British India",
  territory=dict(british=BR86, manipur=[MANIPUR], lushai=[LUSHAI, CHIN]),
  units=[U("burmafield","british",96.08,21.97,10000,"Upper Burma Field Force"), U("bengal","british",88.6,22.9,15000,"Bengal Army"),
         U("levy","manipur",93.94,24.82,1000), U("lushai","lushai",92.75,23.7,None,"Lushai chiefs")]),
 dict(date="1890-03-15", caption="Chin-Lushai Expedition; Fort Aijal is founded",
  view=[90.6,21.2,95.2,26.0],
  territory=dict(british=BR90, manipur=[MANIPUR]),
  arrows=[dict(faction="british", path=[[92.53,22.9],[92.7,23.3],[92.72,23.7]]), dict(faction="british", path=[[94.3,22.6],[94.0,22.8],[93.68,22.91]])],
  units=[U("chitt2","british",92.72,23.73,3400,"Tregear"), U("burmacol","british",93.68,22.91,3400,"Symons"),
         U("levy","manipur",93.94,24.82,1000), U("lushai","lushai",92.9,23.3,None,"Lushai chiefs")]),
 dict(date="1891-04-27", caption="Anglo-Manipur War: Imphal occupied",
  territory=dict(british=BR91),
  arrows=[dict(faction="british", path=[[94.11,25.67],[94.0,25.2],[93.95,24.9]]), dict(faction="british", path=[[92.8,24.83],[93.4,24.8],[93.9,24.8]]), dict(faction="british", path=[[94.6,24.2],[94.2,24.5],[93.97,24.75]])],
  battles=[dict(at=[93.97,24.47], label="Khongjom")],
  units=[U("kohima","british",93.95,24.95,2000), U("aijal","british",92.72,23.73,400,"Fort Aijal"),
         U("levy","manipur",93.97,24.5,None,"Manipur army")]),
 dict(date="1898-04-01", caption="The Lushai Hills district is formed under Assam",
  territory=dict(british=BR91),
  units=[U("aijal","british",92.72,23.73,400,"Aizawl garrison"), U("kohima","british",93.94,24.82,1000)]),
]

scene = {
 "title": "British expansion in the Northeast & Burma, 1824-1898",
 "note": "SAMPLE DATA. Borders are hand-traced approximations; troop figures are rough, commonly cited orders of magnitude, and several (marked as placeholders in the README) need checking. Verify everything against your sources before publishing.",
 "width":1080,"height":1920,"fps":30,"audio":None,
 "segments":[{
  "type":"campaign2d","duration":50,"hold":3,"timing":"keyframes",
  "bbox":[82,4,104,31],"view":kfs[0]["view"],
  "caption":"BRITAIN IN THE NORTHEAST & BURMA","legendBottom":400,
  "style":{"land":["#7f8a5a","#a3a873","#5d6a42"],"water":"#1f3f78","river":"#2d5294"},
  "factions":[
   {"id":"british","name":"British India","color":"#e0333c","flag":{"type":"union"}},
   {"id":"burma","name":"Konbaung Burma","color":"#f0b429","flag":{"type":"disc","bg":"#ffffff","fg":"#d4a017"}},
   {"id":"manipur","name":"Kingdom of Manipur","color":"#9b5de5","flag":{"type":"solid","color":"#7b3fc4"}},
   {"id":"lushai","name":"Lushai & Chin chiefs","color":"#2fa36b","flag":{"type":"solid","color":"#1f7a4d"}},
  ],
  "layers":{"water":[SEA],"rivers":RIVERS},
  "cities":[dict(name=c[0],at=[c[1],c[2]],**({"size":c[3]} if len(c)>3 else {})) for c in CITIES],
  "keyframes":kfs,
 }],
 "subtitles":[
  {"start":0.5,"end":4.5,"text":"*1824.* Britain goes to war with Burma"},
  {"start":5.5,"end":11.5,"text":"over Assam, Manipur and the frontier"},
  {"start":17.0,"end":21.5,"text":"Yandabo hands Britain *Assam* and *Arakan*"},
  {"start":28.0,"end":32.0,"text":"*1871.* Columns push into the *Lushai Hills*"},
  {"start":33.0,"end":37.0,"text":"*1885.* Mandalay falls; Burma is annexed"},
  {"start":38.5,"end":43.0,"text":"*1890.* Fort Aijal: today's *Aizawl*"},
  {"start":44.5,"end":49.5,"text":"By *1898* the hills are a district of Assam"},
 ],
 "subtitleStyle":{"size":52,"y":0.88},
}
json.dump(scene, open(sys.argv[1],'w'), indent=1, ensure_ascii=False)
