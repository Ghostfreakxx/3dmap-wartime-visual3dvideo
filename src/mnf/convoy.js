// THE CONVOY — the MNA ambush only, cut like a war movie: letterbox, grade, grain,
// slow motion and sparse subtitles. Reuses the choreography in script.js; every shot
// maps its own screen time onto a range of "story" time, so slow motion is free.
import * as THREE from 'three';
import { buildWorld, MOODS } from './world.js';
import { buildFilm, T_MINE } from './script.js';
import { pose } from '../lushai/moves.js';
import { FX2 } from './fx2.js';
import { animateVehicle } from './vehicles.js';
import { heightAt, pathY } from './terrain.js';
import { ease } from '../toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const py = (x) => pathY(x);
const h = (x, z) => heightAt(x, z);

const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(1280, 720);
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1280 / 720, 0.1, 4000);

const fx = new FX2();
const film = buildFilm(scene, fx);
const world = buildWorld(scene);
fx.build(scene);

const [jeep, K1, K2, K3] = film.vehicles;
const M = (i) => film.mna[i];
const off = film.officer;

// ------------------------------------------------------------ the cut
// s: [storyStart, storyEnd] played over `dur` seconds of screen time.
// cam(T, k): camera for story time T and shot progress k (0..1).
const lerpCam = (a, b, k) => ({ pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: a.fov + (b.fov - a.fov) * k });
const C = (pos, look, fov = 40) => ({ pos, look, fov });
const bren = M(13), bren2 = M(5), plunger = M(1), cmd = M(0);
const SHOTS = [
  { name: 'Hills', s: [30, 37.5], dur: 8, mood: 'mist', loc: 'MIZO HILLS, 1966',
    cam: (T, k) => lerpCam(C(V(-30, 46, -70), V(-95, 0, -2), 42), C(V(-48, 34, -58), V(-78, 0, -2), 40), ease.inOut(k)) },
  { name: 'Watcher', s: [39.2, 42.6], dur: 5, mood: 'jungle', sub: ['Commander (in Mizo)', 'Nobody fires until the jeep reaches the bend.'],
    cam: (T, k) => lerpCam(C(V(-0.7, h(-1, 7.4) + 1.05, 7.3), V(-2, h(-2, 9.4) + 0.95, 9.4), 36), C(V(-1.0, h(-1, 7.7) + 1.0, 7.8), V(-2, h(-2, 9.4) + 0.95, 9.4), 30), k) },
  { name: 'Gunner', s: [42.6, 46.4], dur: 5, mood: 'jungle',
    cam: (T, k) => { const x = bren.hx, z = bren.hz; return lerpCam(C(V(x + 3.0, h(x, z) + 1.3, z - 0.4), V(x, h(x, z) + 0.55, z - 0.2), 40), C(V(x + 2.6, h(x, z) + 1.1, z - 0.6), V(x - 0.1, h(x, z) + 0.5, z - 0.3), 34), k); } },
  { name: 'Truck', s: [46.4, 50.6], dur: 6, mood: 'jungle', sub: ['Jawan (in Hindi)', 'Too quiet, sahib. Not even birds.'],
    cam: (T, k) => { const x = K2.track.sample(T).x; return C(V(x - 0.6, py(x) + 4.2 - 0.6 * k, 3.6), V(x - 1.4, py(x) + 1.8, -1.9), 40 - 6 * k); } },
  { name: 'Lead Jeep', s: [50.6, 54.2], dur: 4, mood: 'jungle',
    cam: (T, k) => { const x = jeep.track.sample(T).x; return C(V(x - 5.5, py(x) + 2.0, 1.2), V(x + 8, py(x + 8) + 1.0, -0.9), 46); } },
  { name: 'Plunger', s: [53.6, 55.25], dur: 4, mood: 'jungle', sub: ['', 'Now.'],
    cam: (T, k) => { const x = plunger.hx, z = plunger.hz; return lerpCam(C(V(x - 1.7, h(x, z) + 1.25, z - 2.7), V(x, h(x, z) + 0.6, z), 42), C(V(x - 1.3, h(x, z) + 1.05, z - 2.2), V(x, h(x, z) + 0.5, z), 34), ease.in(k)); } },
  { name: 'Blast', s: [55.1, 55.95], dur: 5, mood: 'jungle', slow: true,
    cam: (T, k) => lerpCam(C(V(13.2, py(13.2) + 2.3, 2.3), V(22, py(22) + 1.4, -0.9), 46), C(V(12.8, py(12.8) + 2.2, 2.5), V(22.5, py(22.5) + 2.6, -0.9), 50), k) },
  { name: 'Contact', s: [55.95, 61.0], dur: 6, mood: 'battle', handheld: 1, sub: ['Officer', 'AMBUSH! Off the trucks! Get off the road!'],
    cam: (T, k) => lerpCam(C(V(-5.5, py(-5.5) + 1.6, -6.2), V(-1, py(-1) + 2.0, 5), 50), C(V(-8, py(-8) + 1.8, -6.3), V(-3, py(-3) + 2.2, 5), 50), k) },
  { name: 'Grenade', s: [61.0, 61.75], dur: 3.2, mood: 'battle', slow: true,
    cam: (T, k) => C(V(-2, py(-2) + 3.0, 4.6), V(-0.4, py(-0.4) + 1.6, -0.9), 46 - 4 * k) },
  { name: 'Return Fire', s: [62.0, 66.4], dur: 5.5, mood: 'battle', handheld: 1, sub: ['Officer', 'Bren gun — the ridge! Keep firing!'],
    cam: (T, k) => lerpCam(C(V(-6.3, py(-6.3) + 1.25, -4.7), V(-6, py(-6) + 2.6, 6), 50), C(V(-6.9, py(-6.9) + 1.5, -4.9), V(-6.5, py(-6.5) + 2.2, 6), 48), k) },
  { name: 'Last Stand', s: [66.4, 69.2], dur: 5, mood: 'battle', slow: true,
    cam: (T, k) => { const x = 19.1; return lerpCam(C(V(x + 2.0, py(x) + 1.2, -0.2), V(x, py(x) + 0.75, -2.7), 40), C(V(x + 1.6, py(x) + 1.0, -0.5), V(x, py(x) + 0.45, -2.7), 34), k); } },
  { name: 'The Ridge', s: [69.2, 77.5], dur: 7, mood: 'battle', handheld: 0.6,
    cam: (T, k) => { const x = bren2.hx, z = bren2.hz; return lerpCam(C(V(x + 1.6, h(x, z) + 1.0, z - 1.2), V(x - 2, py(x) - 0.5, -2.5), 46), C(V(x + 2.4, h(x, z) + 1.8, z - 0.8), V(x - 4, py(x) - 0.5, -2), 48), k); } },
  { name: 'Overrun', s: [81.2, 86.5], dur: 6, mood: 'battle', handheld: 0.8, sub: ['', 'Take the rifles. Quickly — the planes will come.'],
    cam: (T, k) => lerpCam(C(V(7.5, py(7.5) + 1.6, -5.6), V(2, py(2) + 1.6, 4), 50), C(V(6, py(6) + 3.0, -6.0), V(-1, py(-1) + 0.6, 0), 52), k) },
  { name: 'Silence', s: [88, 95.8], dur: 9, mood: 'sunset',
    cam: (T, k) => lerpCam(C(V(-24, py(-24) + 4.5, -6.5), V(-10, py(-10) + 1.2, -1), 44), C(V(8, py(8) + 6.5, -8), V(16, py(16) + 1, -1), 46), ease.inOut(k)) },
  { name: 'End', s: [95.8, 95.9], dur: 7, mood: 'sunset', end: true,
    cam: (T, k) => lerpCam(C(V(8, py(8) + 6.5, -8), V(16, py(16) + 1, -1), 46), C(V(4, py(4) + 40, -46), V(0, 0, 0), 46), ease.inOut(k)) },
];
let acc = 0;
for (const s of SHOTS) { s.start = acc; acc += s.dur; }
const TOTAL = acc;
const shotAt = (t) => { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start) return [i, SHOTS[i]]; return [0, SHOTS[0]]; };

// ------------------------------------------------------------ one frame of the 3D scene at story time T
const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), seatV = new THREE.Vector3();
function scene3d(T, shot, k, tScreen) {
  world.applyMood(MOODS[shot.mood]);
  const c = shot.cam(T, k);
  camera.position.copy(c.pos);
  const hh = shot.handheld ?? 0.25;
  camera.position.x += (Math.sin(tScreen * 1.7) * 0.04 + Math.sin(tScreen * 5.3) * 0.015) * hh * 2;
  camera.position.y += (Math.sin(tScreen * 2.3) * 0.03 + Math.sin(tScreen * 7.1) * 0.012) * hh * 2;
  const sh = fx.shake(T); if (sh > 0) { camera.position.x += Math.sin(T * 91) * sh; camera.position.y += Math.cos(T * 77) * sh; }
  camera.lookAt(c.look); camera.fov = c.fov; camera.updateProjectionMatrix();

  for (const v of film.vehicles) {
    const s = v.track.sample(T);
    v.root.visible = true;
    v.root.position.set(s.x, heightAt(s.x, s.z), s.z); v.root.rotation.set(0, s.ry, 0);
    v.body.position.set(0, T < T_MINE ? 0.03 * Math.sin(T * 17 + v.i) : 0, 0); v.body.rotation.set(0, 0, 0);
    if (v.flip !== undefined && T >= v.flip) { const u = Math.min(1, (T - v.flip) / 1.0); v.body.position.y = 3.0 * Math.sin(Math.PI * u) + (u >= 1 ? 0.2 : 0); v.body.rotation.z = -1.75 * ease.out(u); v.body.rotation.x = 0.3 * Math.sin(Math.PI * u); }
    animateVehicle(v, T, s.x - v.x0); v.root.updateMatrixWorld(true);
  }
  film.jets.forEach((j) => (j.root.visible = false));
  for (const a of film.actors) {
    if (a.vis && !(T >= a.vis[0] && T < a.vis[1])) { a.root.visible = false; continue; }
    const r = a.ride;
    if (r && T < r.until) {
      const [lx, ly, lz, lr] = r.seat;
      seatV.set(lx, ly, lz).applyMatrix4(r.v.body.matrixWorld);
      a.root.position.copy(seatV);
      a.root.quaternion.setFromRotationMatrix(m4.extractRotation(r.v.body.matrixWorld)).multiply(q.setFromEuler(e.set(0, lr, 0)));
      const dead = T >= r.dieAt;
      pose(a, dead ? r.dieMode : 'sit', dead ? (T - r.dieAt) * 0.6 : T, T + a.phase);
      if (dead) { a.legs[0].rotation.x = -1.45; a.legs[1].rotation.x = -1.45; a.body.rotation.x *= 0.55; }
      a.root.visible = true; continue;
    }
    const s = a.track.sample(T);
    let y = 0; if (r && r.until < 999 && T - r.until < 0.4) y = (r.seat[1] + 0.2) * (1 - (T - r.until) / 0.4);
    const near = Math.hypot(s.x - camera.position.x, s.z - camera.position.z) < 220;
    a.root.visible = near; if (!near) continue;
    a.root.quaternion.identity(); a.root.position.set(s.x, heightAt(s.x, s.z) + y, s.z); a.root.rotation.set(0, s.ry, 0);
    pose(a, s.mode, s.mt, T + a.phase);
  }
  fx.update(T);
  world.update(T, camera);
  renderer.render(scene, camera);
}

// ------------------------------------------------------------ grading, letterbox, titles
const W = 1280, H = 720, BAR = 92; // 2.39:1 inside 16:9
const grain = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
{ const gg = grain.getContext('2d'), id = gg.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gg.putImageData(id, 0, 0); }
const wide = Object.assign(document.createElement('canvas'), { width: W, height: H });
const reel = Object.assign(document.createElement('canvas'), { width: 720, height: 1280 });
const clamp = (x) => Math.max(0, Math.min(1, x));

function storyOf(t) {
  const [i, shot] = shotAt(t), lt = t - shot.start, k = clamp(lt / shot.dur);
  return { i, shot, lt, k, T: shot.s[0] + (shot.s[1] - shot.s[0]) * k };
}
function grade(g, T, shot, lt, t) {
  g.save();
  g.filter = shot.mood === 'sunset' ? 'contrast(1.15) saturate(0.85) sepia(0.15)' : 'contrast(1.18) saturate(0.72) sepia(0.12) brightness(0.97)';
  g.drawImage(renderer.domElement, 0, 0, W, H);
  g.restore();
  // teal shadows / warm highlights
  g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = shot.mood === 'sunset' ? 'rgba(255,140,60,0.25)' : 'rgba(40,90,90,0.22)'; g.fillRect(0, 0, W, H); g.restore();
  // vignette
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  // explosion flash
  const flash = Math.max(0, 1 - Math.abs(T - T_MINE) / 0.12) + Math.max(0, 1 - Math.abs(T - 61.3) / 0.08) * 0.6;
  if (flash > 0) { g.fillStyle = `rgba(255,240,210,${0.7 * flash})`; g.fillRect(0, 0, W, H); }
  // grain
  g.save(); g.globalAlpha = 0.07; g.globalCompositeOperation = 'overlay';
  const ox = (Math.floor(t * 24) * 97) % 256, oy = (Math.floor(t * 24) * 57) % 256;
  for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) g.drawImage(grain, x, y);
  g.restore();
}
function fadeAmt(i, shot, lt) {
  const inn = i === 0 ? 1 - lt / 2.0 : 0;
  const out = shot.end ? (lt - 2.2) / 1.2 : 0;
  const cut = i > 0 && lt < 0.06 && SHOTS[i - 1].slow ? 0 : 0;
  return clamp(Math.max(inn, out, cut));
}
function drawSub(g, shot, lt, x, y, size, maxW) {
  if (!shot.sub) return;
  const a = Math.min(clamp((lt - 0.5) / 0.3), clamp((shot.dur - 0.4 - lt) / 0.3));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  const [who, line] = shot.sub;
  g.font = `italic 600 ${size}px "DejaVu Serif", Georgia, serif`;
  g.lineWidth = size * 0.18; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.fillStyle = '#f3efe6';
  const txt = who ? `${who}: “${line}”` : `“${line}”`;
  g.strokeText(txt, x, y, maxW); g.fillText(txt, x, y, maxW);
  g.restore();
}
function drawEnd(g, lt, cx, cy, size) {
  const a = clamp((lt - 3.2) / 0.8);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#efe9dc';
  g.font = `600 ${size}px "DejaVu Serif", Georgia, serif`;
  ['Ambushes like this one made every road in the Mizo Hills deadly.', 'The insurgency lasted twenty years,', 'until the Mizo Peace Accord of 30 June 1986.'].forEach((l, i) => g.fillText(l, cx, cy + i * size * 1.5));
  g.globalAlpha = a * 0.7; g.font = `italic ${size * 0.7}px "DejaVu Serif", Georgia, serif`;
  g.fillText('A composite, inspired by MNA convoy ambushes of the insurgency.', cx, cy + size * 5.4);
  g.restore();
}

function compose(t) {
  const { i, shot, lt, k, T } = storyOf(t);
  scene3d(T, shot, k, t);
  // ---- 16:9 cinema frame
  const g = wide.getContext('2d');
  grade(g, T, shot, lt, t);
  const fa = fadeAmt(i, shot, lt);
  if (fa > 0) { g.fillStyle = `rgba(0,0,0,${fa})`; g.fillRect(0, 0, W, H); }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, BAR); g.fillRect(0, H - BAR, W, BAR);
  if (shot.loc) {
    const a = Math.min(clamp((lt - 1.6) / 0.6), clamp((shot.dur - 0.6 - lt) / 0.5));
    const n = Math.floor(clamp((lt - 1.6) / 1.2) * shot.loc.length); // typewriter
    g.save(); g.globalAlpha = a; g.font = '600 26px "DejaVu Sans Mono", monospace'; g.fillStyle = '#efe9dc'; g.textBaseline = 'middle';
    g.fillText(shot.loc.slice(0, n), 70, H - BAR - 40); g.restore();
    const ta = Math.min(clamp((lt - 3.6) / 0.8), clamp((shot.dur - 0.4 - lt) / 0.6));
    if (ta > 0) { g.save(); g.globalAlpha = ta; g.textAlign = 'center'; g.fillStyle = '#efe9dc'; g.font = '700 84px "DejaVu Serif", Georgia, serif'; g.fillText('THE CONVOY', W / 2, H / 2 + 10); g.restore(); }
  }
  drawSub(g, shot, lt, W / 2, H - BAR / 2, 26, W - 80);
  if (shot.end) drawEnd(g, lt, W / 2, 300, 26);

  // ---- 9:16 reel: dark red backdrop, stepped title, the scope band in the middle
  const r = reel.getContext('2d'), RW = 720, RH = 1280;
  const bg = r.createRadialGradient(RW / 2, RH * 0.6, 40, RW / 2, RH * 0.6, RH * 0.75);
  bg.addColorStop(0, '#7a1e26'); bg.addColorStop(0.55, '#4a1218'); bg.addColorStop(1, '#1e0709');
  r.fillStyle = bg; r.fillRect(0, 0, RW, RH);
  const bandH = H - 2 * BAR, ph = Math.round(RW * bandH / W), py0 = 430;
  r.drawImage(wide, 0, BAR, W, bandH, 0, py0, RW, ph);
  r.font = '700 44px "DejaVu Sans", Arial, sans-serif'; r.textAlign = 'center'; r.textBaseline = 'middle';
  const TITLE = ['The Convoy | MNA Ambush', 'Mizo Hills, 1966'];
  TITLE.forEach((l, j) => { const w = r.measureText(l).width + 40; r.fillStyle = '#fff'; r.beginPath(); r.roundRect(RW / 2 - w / 2, 270 + j * 64 - 34, w, 68, 12); r.fill(); });
  r.fillStyle = '#111'; TITLE.forEach((l, j) => r.fillText(l, RW / 2, 272 + j * 64));
  drawSub(r, shot, lt, RW / 2, py0 + ph + 60, 26, RW - 40);
  if (shot.end) { r.fillStyle = 'rgba(0,0,0,0)'; drawEnd(r, lt, RW / 2, py0 + ph + 70, 19); }
  return [wide.toDataURL('image/jpeg', 0.92), reel.toDataURL('image/jpeg', 0.92)];
}

window.__compBoth = compose;
window.__film = { TOTAL, SHOTS };
const params = new URLSearchParams(location.search);
if (!params.has('still')) {
  const view = document.createElement('canvas'); view.width = W; view.height = H; stageEl.appendChild(view); renderer.domElement.style.display = 'none';
  const t0 = performance.now();
  (function loop() { const t = ((performance.now() - t0) / 1000) % TOTAL; compose(t); view.getContext('2d').drawImage(wide, 0, 0); requestAnimationFrame(loop); })();
}
