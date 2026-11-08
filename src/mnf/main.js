import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildWorld, MOODS, POST } from './world.js';
import { buildFilm, buildShots, T_MINE } from './script.js';
import { pose } from '../lushai/moves.js';
import { FX2 } from './fx2.js';
import { animateVehicle } from './vehicles.js';
import { heightAt, VILLAGE, TOWN, villageY, townY } from './terrain.js';
import { ease, toon, inked } from '../toon.js';

const params = new URLSearchParams(location.search);
const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: params.has('still') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 4000);

const fx = new FX2();
const film = buildFilm(scene, fx);           // reserves jungle clearings first
const world = buildWorld(scene);
const { shots: SHOTS, total: TOTAL } = buildShots(film);

// platforms for the speaker (1961) and the accord (1986)
const vy = villageY(), ty = townY();
const plat = inked(new THREE.BoxGeometry(3.2, 1.0, 2.2), toon(0x8a6a44), 0.04);
plat.position.set(VILLAGE.x + 2, vy + 0.5, VILLAGE.z - 2.2); scene.add(plat);
const stage86 = inked(new THREE.BoxGeometry(5, 0.8, 3), toon(0x7a5a3a), 0.04);
stage86.position.set(TOWN.x, ty + 0.4, TOWN.z - 4); scene.add(stage86);
const flagFor = (x, z, y) => {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const pole = inked(new THREE.CylinderGeometry(0.05, 0.05, 5, 6), toon(0xe8e4dc), 0.02); pole.position.y = 2.5; g.add(pole);
  [[0xff9933, 0.35], [0xffffff, 0], [0x138808, -0.35]].forEach(([c, yy]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.03), toon(c)); m.position.set(0.8, 4.4 + yy, 0); g.add(m); });
  scene.add(g); return g;
};
const flags86 = [flagFor(TOWN.x - 3, TOWN.z - 3, ty), flagFor(TOWN.x + 3, TOWN.z - 3, ty)];

// air strikes: bombs on town houses
const tmp = new THREE.Vector3();
const hitHouses = [2, 5, 9, 14, 7];
hitHouses.forEach((hi, k) => {
  const hs = world.town.houses[hi]; hs.updateWorldMatrix(true, false); hs.getWorldPosition(tmp);
  const t = (k < 3 ? 26.1 : 28.3) + (k % 3) * 0.25;
  fx.explosion(t, tmp.clone().add(new THREE.Vector3(0, 1.5, 0)), 1.4);
  hs.userData.burnAt = t + 0.1;
  fx.smokeColumn(t + 0.5, 34, () => tmp.clone().add(new THREE.Vector3(0, 4, 0)), 2);
});
// the post burns during the night raid; the old village burns during grouping
const ph = world.town.post.children[0]; ph.userData.burnAt = 19.0;
world.village.houses.slice(0, 5).forEach((h, i) => { h.userData.burnAt = 96 + i * 0.6; });
world.village.houses.slice(0, 3).forEach((h) => { h.updateWorldMatrix(true, false); const p = h.getWorldPosition(new THREE.Vector3()); fx.smokeColumn(96.5, 106, () => p.clone().add(new THREE.Vector3(0, 5, 0)), 2); });
fx.build(scene);

// ------------------------------------------------------------ 16:9 stage + UI (same as the other films)
function resize() {
  const W = innerWidth, H = innerHeight; let w = W, h = Math.round(W * 9 / 16);
  if (h > H) { h = H; w = Math.round(H * 16 / 9); }
  renderer.setSize(w, h); stageEl.style.width = w + 'px'; stageEl.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const $ = (id) => document.getElementById(id);
const ui = { play: $('play'), prev: $('prev'), next: $('next'), scrub: $('scrub'), time: $('time'), free: $('free'), rec: $('rec'), shots: $('shots'), caption: $('caption'), title: $('title'), fade: $('fade') };
let T = parseFloat(params.get('t') ?? '0');
if (params.has('shot')) T = SHOTS[+params.get('shot')].start + 0.01;
let playing = !params.has('still'), freeCam = false, recorder = null;
ui.scrub.max = TOTAL;
const shotAt = (T) => { for (let i = SHOTS.length - 1; i >= 0; i--) if (T >= SHOTS[i].start) return [i, SHOTS[i]]; return [0, SHOTS[0]]; };
SHOTS.forEach((s, i) => { const b = document.createElement('button'); b.textContent = `${i + 1}. ${s.name}`; b.onclick = () => { T = s.start + 0.001; }; ui.shots.appendChild(b); });
const setPlay = (p) => { playing = p; ui.play.textContent = p ? '❚❚' : '►'; };
setPlay(playing);
ui.play.onclick = () => { if (T >= TOTAL) T = 0; setPlay(!playing); };
ui.prev.onclick = () => { const [i] = shotAt(T); T = SHOTS[Math.max(0, T - SHOTS[i].start < 1 ? i - 1 : i)].start + 0.001; };
ui.next.onclick = () => { const [i] = shotAt(T); T = SHOTS[Math.min(SHOTS.length - 1, i + 1)].start + 0.001; };
ui.scrub.oninput = () => { T = +ui.scrub.value; };
const controls = new OrbitControls(camera, renderer.domElement); controls.enabled = false;
ui.free.onclick = () => { freeCam = !freeCam; controls.enabled = freeCam; ui.free.classList.toggle('on', freeCam); if (freeCam) { const d = new THREE.Vector3(); camera.getWorldDirection(d); controls.target.copy(camera.position).addScaledVector(d, 10); controls.update(); } };
ui.rec.onclick = () => {
  if (recorder) { recorder.stop(); return; }
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(renderer.domElement.captureStream(30), { mimeType: mime, videoBitsPerSecond: 12e6 });
  const chunks = []; recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = 'rambuai-convoy.webm'; a.click(); recorder = null; ui.rec.classList.remove('on'); ui.rec.textContent = '● REC'; document.body.classList.remove('recording'); };
  T = 0; freeCam && ui.free.onclick(); setPlay(true); document.body.classList.add('recording'); recorder.start(); ui.rec.classList.add('on'); ui.rec.textContent = '■ STOP';
};
addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); ui.play.onclick(); } if (e.code === 'ArrowRight') ui.next.onclick(); if (e.code === 'ArrowLeft') ui.prev.onclick(); if (e.key === 'h') document.body.classList.toggle('hide-ui'); });

// ------------------------------------------------------------ camera
const _p = new THREE.Vector3(), _l = new THREE.Vector3();
function cameraFor(shot, T, t) {
  let pos, look, fov;
  if (shot.cam) ({ pos, look, fov } = shot.cam(T, t));
  else {
    const h = shot.hold ?? 0;
    const k = t < h ? 0.04 * (t / h) : 0.04 + 0.96 * ease.inOut((t - h) / (shot.dur - h));
    pos = _p.lerpVectors(shot.from.pos, shot.to.pos, k); look = _l.lerpVectors(shot.from.look, shot.to.look, k);
    fov = shot.from.fov + (shot.to.fov - shot.from.fov) * k;
  }
  camera.position.copy(pos);
  if (pos.y < 120) { camera.position.x += Math.sin(t * 0.9) * 0.025; camera.position.y += Math.sin(t * 1.3) * 0.02; }
  const sh = fx.shake(T);
  if (sh > 0) { camera.position.x += Math.sin(T * 91) * sh; camera.position.y += Math.cos(T * 77) * sh; }
  camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------ frame
const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), seatV = new THREE.Vector3();
let lastShot = -1;
function frame(T) {
  const [si, shot] = shotAt(T), t = T - shot.start;
  world.applyMood(MOODS[shot.mood]);
  if (!freeCam) cameraFor(shot, T, t); else controls.update();
  const ambushOn = T >= 32 && T < 96;
  stage86.visible = T >= 104; flags86.forEach((f) => (f.visible = T >= 104)); plat.visible = T < 16;

  // vehicles
  for (const v of film.vehicles) {
    v.root.visible = ambushOn;
    if (!ambushOn) continue;
    const s = v.track.sample(T);
    v.root.position.set(s.x, heightAt(s.x, s.z), s.z);
    v.root.rotation.set(0, s.ry, 0);
    v.body.position.set(0, 0, 0); v.body.rotation.set(0, 0, 0);
    if (s.mode !== 'idle' || true) v.body.position.y = T < T_MINE ? 0.03 * Math.sin(T * 17 + v.i) : 0;
    if (v.flip !== undefined && T >= v.flip) { // the jeep is thrown by the mine
      const u = Math.min(1, (T - v.flip) / 1.0);
      v.body.position.y = 3.0 * Math.sin(Math.PI * u) + (u >= 1 ? 0.2 : 0);
      v.body.rotation.z = -1.75 * ease.out(u); v.body.rotation.x = 0.3 * Math.sin(Math.PI * u);
    }
    animateVehicle(v, T, s.x - v.x0);
    v.root.updateMatrixWorld(true);
  }
  // jets
  film.jets.forEach((j) => {
    const u = (T - j.pass) / 4;
    j.root.visible = u > -0.05 && u < 1.05;
    if (!j.root.visible) return;
    j.root.position.set(TOWN.x - 150 + 300 * u, ty + 26 - 6 * Math.sin(Math.PI * u), TOWN.z + 4 + j.side * 7);
    j.root.rotation.set(0, Math.PI / 2, j.side * 0.25 * Math.sin(Math.PI * u));
  });

  // actors
  for (const a of film.actors) {
    const vis = !a.vis || (T >= a.vis[0] && T < a.vis[1]);
    if (!vis) { a.root.visible = false; continue; }
    let s, y = 0;
    const r = a.ride;
    if (r && T < r.until && r.v.root.visible) {
      // seated in a vehicle
      const vs = r.v.track.sample(T);
      const [lx, ly, lz, lr] = r.seat;
      r.v.body.updateMatrixWorld(true);
      seatV.set(lx, ly, lz).applyMatrix4(r.v.body.matrixWorld);
      a.root.position.copy(seatV);
      a.root.quaternion.setFromRotationMatrix(m4.extractRotation(r.v.body.matrixWorld)).multiply(q.setFromEuler(e.set(0, lr, 0)));
      const dead = T >= r.dieAt;
      pose(a, dead ? (r.dieMode === 'fall' ? 'fall' : 'fallFwd') : 'sit', dead ? (T - r.dieAt) * 0.6 : T, T + a.phase);
      if (dead) { a.legs[0].rotation.x = -1.45; a.legs[1].rotation.x = -1.45; a.body.rotation.x *= 0.55; }
      a.root.visible = true;
      continue;
    }
    s = a.track.sample(T);
    if (r && r.until < 999 && T - r.until < 0.4) y = (r.seat[1] + 0.2) * (1 - (T - r.until) / 0.4); // hop down
    const near = Math.hypot(s.x - camera.position.x, s.z - camera.position.z) < 220;
    a.root.visible = near;
    if (!near) continue;
    a.root.quaternion.identity();
    a.root.position.set(s.x, heightAt(s.x, s.z) + y + (a.lift ?? 0), s.z);
    a.root.rotation.set(0, s.ry, 0);
    pose(a, s.mode, s.mt, T + a.phase);
  }

  fx.update(T);
  world.update(T, camera);

  if (si !== lastShot) { lastShot = si; ui.caption.textContent = shot.caption; ui.title.textContent = shot.title ?? ''; [...ui.shots.children].forEach((b, i) => b.classList.toggle('active', i === si)); }
  ui.caption.classList.toggle('show', t > 0.6 && t < shot.dur - 0.5);
  ui.title.classList.toggle('show', !!shot.title && t > 0.4 && t < 4.6);
  ui.fade.style.opacity = fadeAt(si, shot, t);
  ui.scrub.value = T; ui.time.textContent = `${fmt(T)} / ${fmt(TOTAL)}`;
}
function fadeAt(si, shot, t) {
  const fadeIn = si === 0 ? 1 - t / 1.5 : 1 - t / 0.3;
  const fadeOut = si === SHOTS.length - 1 ? (t - shot.dur + 2) / 2 : (t - shot.dur + 0.25) / 0.25;
  return Math.max(0, Math.min(1, Math.max(fadeIn, fadeOut)));
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clock = new THREE.Clock();
function loop() { const dt = Math.min(clock.getDelta(), 0.1); if (playing) { T += dt; if (T >= TOTAL) { if (recorder) { T = TOTAL; recorder.stop(); setPlay(false); } else T = 0; } } frame(T); renderer.render(scene, camera); requestAnimationFrame(loop); }
if (params.has('still')) { frame(T); renderer.render(scene, camera); } else loop();

window.__renderer = renderer;
window.__film = { scene, camera, SHOTS, TOTAL, setTime: (t) => { T = t; }, frame: () => { frame(T); renderer.render(scene, camera); } };
window.__comp = (time, W = 1280, H = 720) => {
  T = time; frame(T); renderer.render(scene, camera);
  const c = (window.__compCanvas ??= Object.assign(document.createElement('canvas'), { width: W, height: H }));
  const g = c.getContext('2d'); g.drawImage(renderer.domElement, 0, 0, W, H);
  const [si, shot] = shotAt(T), t = T - shot.start, clamp = (x) => Math.max(0, Math.min(1, x));
  const fa = fadeAt(si, shot, t); if (fa > 0) { g.fillStyle = `rgba(0,0,0,${fa})`; g.fillRect(0, 0, W, H); }
  const wrap = (text, maxW) => { const words = text.split(' '), lines = []; let l = ''; for (const w of words) { const s = l ? l + ' ' + w : w; if (g.measureText(s).width > maxW && l) { lines.push(l); l = w; } else l = s; } lines.push(l); return lines; };
  const ca = Math.min(clamp((t - 0.6) / 0.4), clamp((shot.dur - 0.5 - t) / 0.4));
  if (ca > 0) {
    g.save(); g.globalAlpha = ca; g.font = '900 28px Nunito, "DejaVu Sans", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = wrap(shot.caption, W * 0.78), lh = 36; const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 48, bh = lines.length * lh + 24;
    const x = W / 2, y = H * 0.9 - bh / 2 + (1 - ca) * 10;
    g.fillStyle = 'rgba(43,37,34,0.85)'; g.strokeStyle = '#2b2522'; g.lineWidth = 4; g.beginPath(); g.roundRect(x - bw / 2, y - bh / 2, bw, bh, 16); g.fill(); g.stroke();
    g.fillStyle = '#f6eee0'; lines.forEach((l, i) => g.fillText(l, x, y - (lines.length - 1) * lh / 2 + i * lh)); g.restore();
  }
  if (shot.title) {
    const ta = Math.min(clamp((t - 0.4) / 0.5), clamp((4.6 - t) / 0.5));
    if (ta > 0) {
      g.save(); g.globalAlpha = ta; g.textAlign = 'center'; g.textBaseline = 'middle'; g.translate(W / 2, H * 0.3); g.scale(0.9 + 0.1 * ta, 0.9 + 0.1 * ta);
      g.font = '900 96px "DejaVu Sans", Impact, sans-serif'; g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = '#2b2522';
      g.fillStyle = '#2b2522'; g.fillText(shot.title, 0, 8); g.strokeText(shot.title, 0, 0); g.fillStyle = '#f6eee0'; g.fillText(shot.title, 0, 0);
      g.font = '900 30px "DejaVu Sans", sans-serif'; g.lineWidth = 8; g.strokeText('The troubled years of the Mizo Hills', 0, 70); g.fillText('The troubled years of the Mizo Hills', 0, 70);
      g.restore();
    }
  }
  return c.toDataURL('image/jpeg', 0.92);
};
