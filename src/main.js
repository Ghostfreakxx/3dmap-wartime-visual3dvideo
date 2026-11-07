import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildWorld, MOODS } from './world.js';
import { buildArmies, buildHeroes } from './cast.js';
import { animateHero, animateHorse } from './characters.js';
import { Volleys } from './volleys.js';
import { SHOTS, TOTAL, VOLLEY_TIMES, shotAt, cameraFor } from './director.js';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: params.has('still') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 3000);
const world = buildWorld(scene);
const armies = buildArmies(scene);
const cast = buildHeroes(scene);
const archerSquads = armies.english.filter((s) => s.cfg.type === 'archer');
const targets = armies.french.filter((s) => ['vanguard', 'vanguard2', 'horseL', 'horseR'].includes(s.cfg.name));
const volleys = new Volleys(scene, VOLLEY_TIMES.map((t) => ({ t, from: archerSquads, to: targets, n: 420 })));

// ---------------------------------------------------------------- layout: 16:9 stage
function resize() {
  const W = innerWidth, H = innerHeight - (document.body.classList.contains('hide-ui') ? 0 : 0);
  let w = W, h = Math.round(W * 9 / 16);
  if (h > H) { h = H; w = Math.round(H * 16 / 9); }
  renderer.setSize(w, h);
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- UI
const $ = (id) => document.getElementById(id);
const ui = { play: $('play'), prev: $('prev'), next: $('next'), scrub: $('scrub'), time: $('time'), rain: $('rain'), free: $('free'), rec: $('rec'), shots: $('shots'), caption: $('caption'), title: $('title'), fade: $('fade') };
let T = parseFloat(params.get('t') ?? '0');
if (params.has('shot')) T = SHOTS[+params.get('shot')].start + 0.01 + parseFloat(params.get('dt') ?? '0');
let playing = !params.has('still');
let rainOn = true, freeCam = false, recorder = null;
ui.scrub.max = TOTAL;

SHOTS.forEach((s, i) => {
  const b = document.createElement('button');
  b.textContent = `${i + 1}. ${s.name}`;
  b.onclick = () => { T = s.start + 0.001; };
  ui.shots.appendChild(b);
});
const setPlay = (p) => { playing = p; ui.play.textContent = p ? '❚❚' : '►'; };
setPlay(playing);
ui.play.onclick = () => { if (T >= TOTAL) T = 0; setPlay(!playing); };
ui.prev.onclick = () => { const [i] = shotAt(T); T = SHOTS[Math.max(0, T - SHOTS[i].start < 1 ? i - 1 : i)].start + 0.001; };
ui.next.onclick = () => { const [i] = shotAt(T); T = SHOTS[Math.min(SHOTS.length - 1, i + 1)].start + 0.001; };
ui.scrub.oninput = () => { T = +ui.scrub.value; };
ui.rain.onclick = () => { rainOn = !rainOn; ui.rain.classList.toggle('off', !rainOn); };

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
ui.free.onclick = () => {
  freeCam = !freeCam; controls.enabled = freeCam; ui.free.classList.toggle('on', freeCam);
  if (freeCam) {
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    controls.target.copy(camera.position).addScaledVector(dir, 12);
    controls.update();
  }
};

ui.rec.onclick = () => {
  if (recorder) { recorder.stop(); return; }
  const stream = renderer.domElement.captureStream(30);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    a.download = 'longbow-battle.webm'; a.click();
    recorder = null; ui.rec.classList.remove('on'); ui.rec.textContent = '● REC';
    document.body.classList.remove('recording');
  };
  T = 0; freeCam && ui.free.onclick(); setPlay(true);
  document.body.classList.add('recording');
  recorder.start(); ui.rec.classList.add('on'); ui.rec.textContent = '■ STOP';
};
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); ui.play.onclick(); }
  if (e.code === 'ArrowRight') ui.next.onclick();
  if (e.code === 'ArrowLeft') ui.prev.onclick();
  if (e.key === 'h') document.body.classList.toggle('hide-ui');
});

// ---------------------------------------------------------------- frame
let lastShot = -1;
function frame(T, dt) {
  const [si, shot] = shotAt(T);
  const t = T - shot.start;
  world.applyMood(MOODS[shot.mood], renderer);

  // who is on stage
  for (const [k, g] of Object.entries(cast.groups)) g.visible = shot.show.includes(k);
  const hammer = shot.archerMode !== 'draw';
  cast.archers.forEach((h) => { h.root.visible = hammer; h.stake.visible = true; h.mode = 'hammer'; });
  cast.bowArchers.forEach((h, i) => { h.root.visible = !hammer; h.mode = 'draw'; h.phase = i * 0.15; });

  if (!freeCam) cameraFor(shot, t, camera);
  else controls.update();

  // armies
  const aim = volleys.aim(T);
  for (const s of armies.all) s.update(T, { aim });
  volleys.update(T);

  // heroes (only animate what can be seen)
  for (const h of cast.heroes) if (h.root.parent?.visible !== false) animateHero(h, h.mode === 'draw' ? Math.max(0, T - VOLLEY_TIMES[0] + 4.5 * 0.62 - h.phase) : T);
  for (const h of cast.horses) { h.mode = 'idle'; animateHorse(h, T); }

  world.update(T, camera, rainOn);

  // captions & cuts
  if (si !== lastShot) {
    lastShot = si;
    ui.caption.classList.remove('show'); void ui.caption.offsetWidth;
    ui.caption.textContent = shot.caption;
    ui.title.textContent = shot.title ?? '';
    [...ui.shots.children].forEach((b, i) => b.classList.toggle('active', i === si));
  }
  ui.caption.classList.toggle('show', t > 0.6 && t < shot.dur - 0.5);
  ui.title.classList.toggle('show', !!shot.title && t > 0.4 && t < 4.2);
  const fadeIn = si === 0 ? 1 - t / 1.2 : 1 - t / 0.35;
  const fadeOut = si === SHOTS.length - 1 ? (t - shot.dur + 1.5) / 1.5 : (t - shot.dur + 0.3) / 0.3;
  ui.fade.style.opacity = Math.max(0, Math.min(1, Math.max(fadeIn, fadeOut)));

  ui.scrub.value = T;
  ui.time.textContent = `${fmt(T)} / ${fmt(TOTAL)}`;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (playing) {
    T += dt;
    if (T >= TOTAL) {
      if (recorder) { T = TOTAL; recorder.stop(); setPlay(false); }
      else T = 0;
    }
  }
  frame(T, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
// ?still renders only on demand (used for headless screenshots)
if (params.has('still')) { frame(T, 0); renderer.render(scene, camera); } else loop();
window.__film = { scene, camera, setTime: (t) => { T = t; }, frame: () => { frame(T, 0); renderer.render(scene, camera); }, SHOTS };
