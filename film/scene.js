// The Hills They Held — deterministic animated 3D map.
// Everything on screen is a pure function of time: window.renderFrame(seconds).
import * as THREE from 'three';

export const DURATION = 92;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// 0 → 1 → 0 window with fades
const win = (t, a, b, f = 0.8) => Math.min(smooth(a, a + f, t), 1 - smooth(b - f, b, t));
let seed = 7;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const noise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
};

// ---------- geography (real coordinates, stylised relief) ----------
const LON0 = 92.75, LAT0 = 23.45, S = 10;
const X = lon => (lon - LON0) * S * 0.92;
const Z = lat => -(lat - LAT0) * S;

function height(lon, lat) {
  const west = smooth(91.95, 92.55, lon + 0.12 * Math.sin(lat * 2.1));
  const cachar = smooth(24.35, 24.75, lat) * (1 - smooth(93.05, 93.5, lon));
  const mask = west * (1 - cachar);
  const ridge = 1 - Math.abs(Math.sin((lon * 5.2 + 0.5 * Math.sin(lat * 2.6) + 0.35 * noise(lon * 3, lat * 3)) * Math.PI));
  const vary = 0.45 + 0.75 * noise(lon * 2.3 + 9, lat * 4.1);
  let h = mask * (0.26 + 0.5 * Math.pow(ridge, 1.4) * vary + 0.4 * smooth(93.1, 94.0, lon) + 0.22 * noise(lon * 5, lat * 5));
  h += 0.5 * smooth(25.15, 25.6, lat) * (0.4 + 0.6 * noise(lon * 4, lat * 6));           // hills north of Cachar
  h += 0.16 * (1 - mask) * Math.pow(1 - Math.abs(Math.sin(lon * 6 * Math.PI)), 2) * smooth(91.3, 91.6, lon) * (1 - smooth(24.2, 24.5, lat));
  const dv = (lon - 93.94) ** 2 / 0.05 + (lat - 24.75) ** 2 / 0.09;        // Imphal valley
  h *= 1 - 0.85 * Math.exp(-dv);
  h += 0.07 * noise(lon * 16, lat * 16) * (0.3 + mask);
  return h;
}
const isSea = (lon, lat) => lat < 22.75 + 0.06 * Math.sin(lon * 9) && lon < 91.62 + (22.9 - lat) * 0.42 + 0.05 * Math.sin(lat * 11);
const P = (lon, lat, lift = 0.1) => new THREE.Vector3(X(lon), height(lon, lat) + lift, Z(lat));

// Outline of the Lushai Hills (approximate, clockwise from the northern tip)
const HOME = [[92.78, 24.5], [93.02, 24.38], [93.3, 24.08], [93.42, 23.6], [93.38, 23.05], [93.2, 22.6],
  [93.12, 22.15], [92.85, 21.98], [92.6, 22.0], [92.52, 22.5], [92.36, 22.95], [92.28, 23.5], [92.26, 24.05], [92.45, 24.4]];
function inHome(lon, lat) {
  let inside = false;
  for (let i = 0, j = HOME.length - 1; i < HOME.length; j = i++) {
    const [xi, yi] = HOME[i], [xj, yj] = HOME[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1920, 1080, false);
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);
scene.fog = new THREE.FogExp2(0x0a1016, 0.02);
const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 400);

// ---------- terrain ----------
const LON_A = 88.5, LON_B = 97.5, LAT_A = 19.3, LAT_B = 27.8, NX = 420, NZ = 420;
{
  const pos = [], col = [], idx = [];
  const c = new THREE.Color();
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const lon = lerp(LON_A, LON_B, i / NX), lat = lerp(LAT_B, LAT_A, j / NZ);
    const sea = isSea(lon, lat), h = sea ? -0.02 : height(lon, lat);
    pos.push(X(lon), h, Z(lat));
    if (sea) c.setRGB(0.03, 0.10, 0.17);
    else {
      const k = clamp(h / 1.1);
      c.setRGB(lerp(0.07, 0.30, k), lerp(0.19, 0.44, k), lerp(0.10, 0.20, k));   // forested hills
      c.lerp(new THREE.Color(0.36, 0.31, 0.19), 1 - smooth(0.06, 0.26, h));      // dry plains
      const g = 0.9 + 0.2 * noise(lon * 40, lat * 40);
      c.multiplyScalar(g);
    }
    col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, d = a + NX + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })));
}
const sun = new THREE.DirectionalLight(0xffe2b0, 2.6);
sun.position.set(-30, 16, 10);
scene.add(sun);
const fill = new THREE.HemisphereLight(0x5f7fa8, 0x0b0d10, 0.75);
scene.add(fill);

// ---------- homeland outline ----------
const outlinePts = [];
for (let i = 0; i < HOME.length; i++) {
  const a = HOME[i], b = HOME[(i + 1) % HOME.length];
  for (let k = 0; k < 24; k++) outlinePts.push(P(lerp(a[0], b[0], k / 24), lerp(a[1], b[1], k / 24), 0.2));
}
const outlineCurve = new THREE.CatmullRomCurve3(outlinePts, true);
const outlineMat = new THREE.MeshBasicMaterial({ color: 0xffc04d, transparent: true, opacity: 0, fog: false });
scene.add(new THREE.Mesh(new THREE.TubeGeometry(outlineCurve, 700, 0.055, 6, true), outlineMat));
const haloMat = new THREE.MeshBasicMaterial({ color: 0xffc04d, transparent: true, opacity: 0, fog: false,
  blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Mesh(new THREE.TubeGeometry(outlineCurve, 700, 0.2, 6, true), haloMat));

// ---------- village lights ----------
function dotTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
const DOT = dotTexture();
const villages = [];
while (villages.length < 70) {
  const lon = lerp(92.2, 93.45, rand()), lat = lerp(21.95, 24.5, rand());
  if (!inHome(lon, lat)) continue;
  const m = new THREE.SpriteMaterial({ map: DOT, color: 0xffc866, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const s = new THREE.Sprite(m); s.position.copy(P(lon, lat, 0.16)); s.scale.setScalar(0.42);
  s.userData = { phase: rand() * 6.28, order: rand() };
  scene.add(s); villages.push(s);
}

// ---------- animated arrows ----------
const arrows = [];
function arrow(points, color, t0, t1, tEnd, radius = 0.07) {
  // fly at one height just above the highest ground on the route, so ridges never hide the arrow
  let top = 0;
  for (let i = 0; i < points.length - 1; i++) for (let k = 0; k <= 30; k++)
    top = Math.max(top, height(lerp(points[i][0], points[i + 1][0], k / 30), lerp(points[i][1], points[i + 1][1], k / 30)));
  const curve = new THREE.CatmullRomCurve3(points.map(([lon, lat]) => new THREE.Vector3(X(lon), top + 0.28, Z(lat))));
  const SEG = 120, RAD = 6;
  const geo = new THREE.TubeGeometry(curve, SEG, radius, RAD, false);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, fog: false });
  const tube = new THREE.Mesh(geo, mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.2, radius * 8, 10), mat);
  scene.add(tube, head);
  arrows.push({ curve, geo, mat, tube, head, t0, t1, tEnd, SEG, RAD });
}
const GOLD = 0xffc04d, RED = 0xff4b3a, GREY = 0xb9c2cc;

// 18–30 s: conflict in both directions: pressure from the east, Mizo raids to the west and north
arrow([[94.1, 24.7], [93.75, 24.35], [93.42, 24.05]], GREY, 20.0, 22.5, 29.5, 0.05);   // from Manipur
arrow([[92.3, 23.5], [91.85, 23.6], [91.4, 23.75]], GOLD, 20.6, 23.1, 29.5, 0.05);     // raid toward Tripura
arrow([[94.2, 22.75], [93.8, 22.85], [93.45, 22.95]], GREY, 21.2, 23.7, 29.5, 0.05);   // from the Chin Hills
arrow([[92.5, 22.55], [92.2, 22.4], [91.9, 22.25]], GOLD, 21.8, 24.3, 29.5, 0.05);    // raid toward Chittagong
arrow([[92.78, 24.45], [92.8, 24.7], [92.85, 24.98]], GOLD, 22.4, 24.9, 29.5, 0.05);   // raid toward Cachar
// 36–42 s: raids on the plains
arrow([[92.75, 24.2], [92.7, 24.45], [92.62, 24.72]], GOLD, 36.4, 38.6, 42.0);
arrow([[92.95, 24.15], [93.0, 24.42], [92.95, 24.68]], GOLD, 37.0, 39.2, 42.0);
arrow([[92.5, 24.1], [92.42, 24.4], [92.3, 24.66]], GOLD, 37.6, 39.8, 42.0);
// 42–54 s: Lushai Expedition, two columns
arrow([[92.8, 24.83], [92.85, 24.45], [92.95, 24.05], [93.1, 23.65]], RED, 44.0, 49.5, 53.6, 0.085); // Cachar column
arrow([[91.83, 22.34], [92.17, 22.65], [92.48, 22.9], [92.85, 23.2]], RED, 44.6, 50.0, 53.6, 0.085); // Chittagong column
// 54–66 s: Chin-Lushai Expedition, columns from three sides
arrow([[92.8, 24.83], [92.74, 24.4], [92.72, 23.73]], RED, 56.0, 60.5, 80.0, 0.085);                 // to Aijal
arrow([[91.83, 22.34], [92.17, 22.65], [92.48, 22.9], [92.73, 22.88]], RED, 56.4, 60.9, 80.0, 0.085); // to Lungleh
arrow([[94.75, 22.45], [94.35, 22.72], [94.0, 22.87], [93.7, 22.91]], RED, 56.8, 61.3, 80.0, 0.085);  // Burma column, into the Chin Hills only

// ---------- tea gardens (Cachar foothills) ----------
const gardens = [];
for (let i = 0; i < 26; i++) {
  const lon = lerp(92.3, 93.0, rand()), lat = lerp(24.52, 24.95, rand());
  const m = new THREE.MeshBasicMaterial({ color: 0xff4b3a, transparent: true, opacity: 0, fog: false });
  const q = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.2), m);
  q.position.copy(P(lon, lat, 0.06));
  q.userData.order = (24.95 - lat) / 0.43 * 0.7 + rand() * 0.3;       // spreads southward
  scene.add(q); gardens.push(q);
}

// ---------- labels (DOM, projected) ----------
const labelRoot = document.getElementById('labels');
const labels = [];
function label(text, lon, lat, cls, a, b, lift = 0.5) {
  const el = document.createElement('div'); el.className = 'label ' + cls; el.innerHTML = text;
  labelRoot.appendChild(el); labels.push({ el, pos: P(lon, lat, lift), a, b });
}
label('LUSHAI HILLS', 92.85, 23.3, 'home', 8.5, 30, 1.3);
label('CACHAR', 92.8, 25.0, '', 19, 54);
label('MANIPUR', 94.0, 24.75, '', 19, 31);
label('TRIPURA', 91.4, 23.8, '', 19, 31);
label('CHITTAGONG', 91.85, 22.2, '', 19, 31);
label('CHIN HILLS', 94.05, 22.9, '', 19, 31);
label('Tea gardens', 92.62, 24.86, 'place fort', 31, 42);
label('Cachar column', 92.95, 24.6, 'place fort', 45, 53.6);
label('Chittagong column', 92.05, 22.48, 'place fort', 45.6, 53.6);
label('From Cachar', 92.8, 24.83, 'place fort', 56, 65.6);
label('From Chittagong', 91.9, 22.3, 'place fort', 56.4, 65.6);
label('Burma column', 94.2, 22.62, 'place fort', 56.8, 65.6);
label('CHIN HILLS', 93.85, 23.2, '', 56.8, 65.6);
label('Fort Lungleh · 1889', 92.73, 22.88, 'place fort', 61, 86);
label('Fort Aijal · 1890', 92.72, 23.73, 'place fort', 61.6, 86);
label('Changsil', 92.63, 23.93, 'place gold', 68, 72.4, 0.9);
label('Rangamati', 92.17, 22.65, 'place gold', 72.8, 77.6);

// ---------- story ----------
const CAPTIONS = [
  [8.5, 18, 'On these ridges, Mizo chiefs ruled their own villages.<br>No outside power governed them.'],
  [19, 30, 'They fought and raided their neighbours, and each other.<br>But no rival power took the hills from them.'],
  [31, 36.2, 'Then British tea gardens pushed into the Cachar foothills,<br>onto land the chiefs counted as their own.'],
  [36.6, 42, 'The chiefs struck back, raiding the plains.'],
  [43, 48.4, 'Britain answered with two armed columns.<br>Villages were burned.'],
  [48.8, 53.6, 'Then the columns withdrew.<br>The chiefs still ruled the hills.'],
  [55, 60.4, 'Eighteen years later the columns returned.<br>Another marched into the Chin Hills from Burma.'],
  [60.8, 65.6, 'This time they stayed.<br>Forts rose at Lungleh and Aijal.'],
  [67, 72.4, 'The chiefs rose against the forts.<br>The warrior Khuangchera fell fighting at Changsil.'],
  [72.8, 77.6, 'Chieftess Ropuiliani refused to submit.<br>Captured in 1893, she died in prison at Rangamati.'],
  [79, 85.4, 'Annexed in stages from 1890, the Lushai Hills<br>were one district of British India by 1898.'],
  [86.2, 91, 'Today the land is Mizoram.<br>Those who defended it are remembered.'],
];
const DATES = [
  [31, 42, '1850s – 1860s', 'THE PLAINS CLOSE IN'],
  [43, 53.6, '1871 – 1872', 'THE LUSHAI EXPEDITION'],
  [55, 65.6, '1889 – 1890', 'THE CHIN-LUSHAI EXPEDITION'],
  [67, 77.6, '1890 – 1895', 'THE CHIEFS RISE'],
  [79, 85.4, '1890 – 1898', 'ANNEXED'],
];
// camera keyframes: [time, eye lon, eye lat, eye height, target lon, target lat]
const CAM = [
  [0, 92.9, 21.6, 2.4, 92.85, 23.6],
  [8, 92.85, 20.9, 9, 92.8, 23.4],
  [18, 92.8, 20.1, 19, 92.75, 23.45],
  [30, 92.75, 20.4, 17, 92.75, 23.6],
  [36, 92.9, 22.6, 10, 92.7, 24.5],
  [42, 92.7, 21.3, 15, 92.65, 23.6],
  [54, 92.35, 20.6, 17, 92.7, 23.3],
  [60, 93.0, 20.3, 18, 92.85, 23.2],
  [66, 92.7, 21.5, 12, 92.7, 23.5],
  [70, 92.55, 22.75, 6.5, 92.64, 23.85],
  [75, 92.1, 21.4, 7.5, 92.3, 22.75],
  [79, 92.75, 20.1, 19, 92.75, 23.4],
  [92, 92.8, 19.7, 22, 92.75, 23.4],
];
function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], k = smooth(a[0], b[0], t);
  const v = j => lerp(a[j], b[j], k);
  camera.position.set(X(v(1)), v(3), Z(v(2)));
  camera.lookAt(X(v(4)), 0.3, Z(v(5)));
  camera.updateMatrixWorld();
}

const $ = id => document.getElementById(id);
const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

window.renderFrame = function (t) {
  camAt(t);

  // homeland outline: gold while free, flashing when pressed, red once annexed
  const taken = smooth(79, 82, t), freeAgain = smooth(86, 88.5, t);
  const press = Math.max(win(t, 22.5, 29.5, 1.2), win(t, 67, 72, 1)) * (0.5 + 0.5 * Math.sin(t * 7));
  const colour = new THREE.Color(0xffc04d).lerp(new THREE.Color(0xff3b2e), taken * (1 - freeAgain));
  outlineMat.color.copy(colour); haloMat.color.copy(colour);
  const vis = smooth(8, 11, t) * (1 - smooth(90.5, 92, t));
  outlineMat.opacity = vis * 0.95;
  haloMat.opacity = vis * (0.16 + 0.34 * press + 0.2 * taken * (1 - freeAgain));

  // village lights: appear, flicker, dim under the Raj, return at the end
  const dim = 1 - 0.8 * taken * (1 - freeAgain);
  for (const v of villages) {
    const on = smooth(9 + v.userData.order * 7, 10.5 + v.userData.order * 7, t);
    v.material.opacity = on * dim * (0.62 + 0.3 * Math.sin(t * 2.3 + v.userData.phase)) * (1 - smooth(90.5, 92, t));
  }

  // arrows grow along their path, hold, then fade
  for (const a of arrows) {
    const g = smooth(a.t0, a.t1, t), o = smooth(a.t0, a.t0 + 0.3, t) * (1 - smooth(a.tEnd - 0.8, a.tEnd, t));
    a.mat.opacity = o * 0.95;
    a.tube.visible = a.head.visible = o > 0.001 && g > 0.01;
    a.geo.setDrawRange(0, Math.floor(g * a.SEG) * a.RAD * 6);
    const u = clamp(g, 0.001, 0.999);
    a.head.position.copy(a.curve.getPointAt(u));
    a.head.quaternion.setFromUnitVectors(up, a.curve.getTangentAt(u, tmp).normalize());
  }

  // tea gardens spread south
  for (const q of gardens) {
    q.material.opacity = 0.9 * smooth(31.5 + q.userData.order * 3.5, 32.3 + q.userData.order * 3.5, t) * (1 - smooth(41, 42.5, t));
  }

  // light: warm day, colder under annexation, warm again at the close
  sun.intensity = lerp(2.6, 1.3, taken * (1 - freeAgain));
  fill.intensity = 0.75;

  renderer.render(scene, camera);

  // labels
  for (const l of labels) {
    const o = win(t, l.a, l.b, 0.7);
    tmp.copy(l.pos).project(camera);
    l.el.style.opacity = tmp.z < 1 ? o : 0;
    l.el.style.left = ((tmp.x * 0.5 + 0.5) * 1920).toFixed(1) + 'px';
    l.el.style.top = ((-tmp.y * 0.5 + 0.5) * 1080).toFixed(1) + 'px';
  }

  // text
  let cap = '', capO = 0;
  for (const [a, b, text] of CAPTIONS) { const o = win(t, a, b, 0.6); if (o > capO) { capO = o; cap = text; } }
  if ($('caption').innerHTML !== cap && capO > 0) $('caption').innerHTML = cap;
  $('caption').style.opacity = capO;

  let d = '', ds = '', dO = 0;
  for (const [a, b, big, small] of DATES) { const o = win(t, a, b, 0.6); if (o > dO) { dO = o; d = big; ds = small; } }
  if (dO > 0) { $('date').textContent = d; $('dateSub').textContent = ds; }
  $('date').style.opacity = dO; $('dateSub').style.opacity = dO;

  $('title').style.opacity = win(t, 1.6, 7.6, 1.2);
  $('fade').style.opacity = Math.max(1 - smooth(0, 2.5, t), smooth(90.3, 91.8, t));
};

window.FILM = { duration: DURATION, ready: true };
if (new URLSearchParams(location.search).has('play')) {
  const start = performance.now();
  const loop = () => { window.renderFrame(((performance.now() - start) / 1000) % DURATION); requestAnimationFrame(loop); };
  loop();
} else {
  window.renderFrame(Number(new URLSearchParams(location.search).get('t') || 0));
}
