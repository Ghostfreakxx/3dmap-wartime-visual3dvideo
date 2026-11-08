import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildWorld, makePanji, MOODS } from './world.js';
import { buildCast, buildVillagers, buildShots, T_CHOP, T_HANG } from './script.js';
import { pose } from './moves.js';
import { FX } from './fx.js';
import { heightAt } from './terrain.js';
import { ease } from '../toon.js';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: params.has('still') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 4000);

// cast first: it reserves clearings in the jungle for the actors and cameras
const fx = new FX();
const cast = buildCast(scene, fx);
buildVillagers(scene, cast);
cast.actors.forEach((a) => a.track.finalize());
const world = buildWorld(scene);
makePanji(scene, [[-60, -26], [-22, 30]]);
const sahlam = world.village.sahlam;
sahlam.rotation.y = Math.atan2(cast.d.x, cast.d.y);
cast.attachHung(sahlam);
fx.build(scene);
const { shots: SHOTS, total: TOTAL } = buildShots(cast);

// ------------------------------------------------------------ 16:9 stage
function resize() {
  const W = innerWidth, H = innerHeight;
  let w = W, h = Math.round(W * 9 / 16);
  if (h > H) { h = H; w = Math.round(H * 16 / 9); }
  renderer.setSize(w, h); stage.style.width = w + 'px'; stage.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------ UI
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
ui.free.onclick = () => {
  freeCam = !freeCam; controls.enabled = freeCam; ui.free.classList.toggle('on', freeCam);
  if (freeCam) { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); controls.target.copy(camera.position).addScaledVector(dir, 10); controls.update(); }
};
ui.rec.onclick = () => {
  if (recorder) { recorder.stop(); return; }
  const stream = renderer.domElement.captureStream(30);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = 'lushai-ambush.webm'; a.click(); recorder = null; ui.rec.classList.remove('on'); ui.rec.textContent = '● REC'; document.body.classList.remove('recording'); };
  T = 0; freeCam && ui.free.onclick(); setPlay(true); document.body.classList.add('recording');
  recorder.start(); ui.rec.classList.add('on'); ui.rec.textContent = '■ STOP';
};
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); ui.play.onclick(); }
  if (e.code === 'ArrowRight') ui.next.onclick();
  if (e.code === 'ArrowLeft') ui.prev.onclick();
  if (e.key === 'h') document.body.classList.toggle('hide-ui');
});

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
  if (pos.y < 30) { camera.position.x += Math.sin(t * 0.9) * 0.025; camera.position.y += Math.sin(t * 1.3) * 0.02; }
  for (const ts of shot.shake ?? []) { const d = T - ts; if (d > 0 && d < 0.5) { const a = 0.08 * (1 - d / 0.5); camera.position.x += Math.sin(d * 90) * a; camera.position.y += Math.cos(d * 77) * a; } }
  camera.lookAt(look);
  camera.fov = fov; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------ frame
let lastShot = -1;
const ambushShots = new Set(['Panji', 'The Column', 'Watched', 'In the Bamboo', 'Ambush', 'The Charge', 'No Quarter', 'Trophy']);
function frame(T) {
  const [si, shot] = shotAt(T);
  const t = T - shot.start;
  world.applyMood(MOODS[shot.mood]);
  if (!freeCam) cameraFor(shot, T, t); else controls.update();

  const atAmbush = ambushShots.has(shot.name) || freeCam;
  for (const a of cast.actors) {
    const s = a.track.sample(T);
    const nearCam = Math.hypot(s.x - camera.position.x, s.z - camera.position.z) < 260 && (!shot.solo || shot.solo.includes(a));
    a.root.visible = nearCam;
    if (!nearCam) continue;
    a.root.position.set(s.x, heightAt(s.x, s.z), s.z);
    a.root.rotation.y = s.ry;
    pose(a, s.mode, s.mt, T + a.phase);
  }
  // trophies
  for (const r of cast.reds) {
    const dead = r.track.sample(T).mode.startsWith('fall') || r.track.sample(T).mode.startsWith('dead');
    r.head.visible = !(dead && (T > 69 || (r === cast.victim && T > T_CHOP + 0.1)));
  }
  for (const w of cast.carriers) w.pole.visible = T >= 71.9 && T < T_HANG;
  cast.hung.forEach((h) => (h.visible = T >= T_HANG));

  fx.update(T);
  world.update(T, camera);

  // captions & cuts (DOM, for interactive viewing)
  if (si !== lastShot) {
    lastShot = si;
    ui.caption.textContent = shot.caption; ui.title.textContent = shot.title ?? '';
    [...ui.shots.children].forEach((b, i) => b.classList.toggle('active', i === si));
  }
  ui.caption.classList.toggle('show', t > 0.6 && t < shot.dur - 0.5);
  ui.title.classList.toggle('show', !!shot.title && t > 0.4 && t < 4.6);
  ui.fade.style.opacity = fadeAt(si, shot, t);
  ui.scrub.value = T;
  ui.time.textContent = `${fmt(T)} / ${fmt(TOTAL)}`;
}
function fadeAt(si, shot, t) {
  const fadeIn = si === 0 ? 1 - t / 1.5 : 1 - t / 0.3;
  const fadeOut = si === SHOTS.length - 1 ? (t - shot.dur + 2) / 2 : (t - shot.dur + 0.25) / 0.25;
  const black = shot.blackAfter !== undefined ? (t - shot.blackAfter) / 0.12 : 0;
  return Math.max(0, Math.min(1, Math.max(fadeIn, fadeOut, black)));
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (playing) { T += dt; if (T >= TOTAL) { if (recorder) { T = TOTAL; recorder.stop(); setPlay(false); } else T = 0; } }
  frame(T); renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
if (params.has('still')) { frame(T); renderer.render(scene, camera); } else loop();

// ------------------------------------------------------------ offline renderer hook (captions burned in)
window.__renderer = renderer;
window.__film = {
  scene, camera, SHOTS, TOTAL,
  setTime: (t) => { T = t; },
  frame: () => { frame(T); renderer.render(scene, camera); },
};
window.__comp = (time, W = 1280, H = 720) => {
  T = time; frame(T); renderer.render(scene, camera);
  const c = (window.__compCanvas ??= Object.assign(document.createElement('canvas'), { width: W, height: H }));
  const g = c.getContext('2d');
  g.drawImage(renderer.domElement, 0, 0, W, H);
  const [si, shot] = shotAt(T), t = T - shot.start;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const fa = fadeAt(si, shot, t);
  if (fa > 0) { g.fillStyle = `rgba(0,0,0,${fa})`; g.fillRect(0, 0, W, H); }
  const wrap = (text, maxW) => { const words = text.split(' '), lines = []; let l = ''; for (const w of words) { const s = l ? l + ' ' + w : w; if (g.measureText(s).width > maxW && l) { lines.push(l); l = w; } else l = s; } lines.push(l); return lines; };
  const ca = Math.min(clamp((t - 0.6) / 0.4), clamp((shot.dur - 0.5 - t) / 0.4));
  if (ca > 0) {
    g.save(); g.globalAlpha = ca; g.font = '900 30px Nunito, "DejaVu Sans", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = wrap(shot.caption, W * 0.74), lh = 38;
    const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 48, bh = lines.length * lh + 24;
    const x = W / 2, y = H * 0.9 - bh / 2 + (1 - ca) * 10;
    g.fillStyle = 'rgba(43,37,34,0.85)'; g.strokeStyle = '#2b2522'; g.lineWidth = 4;
    g.beginPath(); g.roundRect(x - bw / 2, y - bh / 2, bw, bh, 16); g.fill(); g.stroke();
    g.fillStyle = '#f6eee0'; lines.forEach((l, i) => g.fillText(l, x, y - (lines.length - 1) * lh / 2 + i * lh));
    g.restore();
  }
  if (shot.title) {
    const ta = Math.min(clamp((t - 0.4) / 0.5), clamp((4.6 - t) / 0.5));
    if (ta > 0) {
      g.save(); g.globalAlpha = ta; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.translate(W / 2, H * 0.3); g.scale(0.9 + 0.1 * ta, 0.9 + 0.1 * ta);
      g.font = '900 76px "DejaVu Sans", Impact, sans-serif'; g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#2b2522';
      g.fillStyle = '#2b2522'; g.fillText(shot.title, 0, 7); g.strokeText(shot.title, 0, 0); g.fillStyle = '#f6eee0'; g.fillText(shot.title, 0, 0);
      g.restore();
    }
  }
  return c.toDataURL('image/jpeg', 0.92);
};
