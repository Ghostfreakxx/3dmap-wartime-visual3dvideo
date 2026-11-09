// OPERATION JERICHO — Aizawl, 28 February – 7 March 1966.
// Historical drama: the MNA night assault, the siege of the 1st Assam Rifles at Lammual, the
// MNF flag, the IAF air strikes of 5 March and the withdrawal. Characters are fictional.
import * as THREE from 'three';
import { buildWorld, MOODS, CLEAR } from '../mnf/world.js';
import { Track } from '../mnf/script.js';
import { makeActor } from '../lushai/rig.js';
import '../mnf/rig2.js';
import { pose } from '../lushai/moves.js';
import { FX2 } from '../mnf/fx2.js';
import { makeJet, makeTruck, animateVehicle } from '../mnf/vehicles.js';
import { heightAt, TOWN } from '../mnf/terrain.js';
import { LAM } from './layout.js';
import { buildSet, animateSet, makeChopper, CEN, W } from './set.js';
import { drawLammualMap } from './map.js';
import { ease, rng } from '../toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI, R = rng(1966);
const loc = (x, z) => [CEN.x + x, CEN.z + z];

// ------------------------------------------------------------ renderer / world
const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setSize(1280, 720);
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1280 / 720, 0.1, 4000);
for (let x = -100; x <= 100; x += 5) for (let z = -100; z <= 100; z += 5) CLEAR.push([CEN.x + x, CEN.z + z, 3.6]); // Aizawl: houses, not jungle
const world = buildWorld(scene);
world.town.group.visible = false; world.town.post.visible = false;
const set = buildSet(scene);
const qgLamp = new THREE.PointLight(0xffd9a0, 14, 14, 1.4); qgLamp.position.copy(W(-5, -13.4, 2.9)); scene.add(qgLamp);
const qgBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); qgBulb.position.copy(qgLamp.position); scene.add(qgBulb);
const fx = new FX2();
fx.tracer = function (t, from, to, col = 0xffb040) { const d = to.clone().sub(from); this.p.push({ t0: t, life: 0.16, pos: from.clone(), vel: d.multiplyScalar(1 / 0.16), g: 0, r0: 0.07, r1: 0.07, col, a0: 1, a1: 1 }); };
MOODS.night66 = { ...MOODS.night, top: 0x121a40, horizon: 0x2e3c6c, bottom: 0x161c36, fog: 0x1e2648, fogDensity: 0.0045, hemiSky: 0x7080b8, hemiGround: 0x161a28, hemiI: 1.35, sunLight: 0xa8b8e8, sunI: 1.05, sunDir: [-0.4, 0.7, -0.5], sun: 0xdde4ff, mist: 0, fire: 0 };
MOODS.siege = { ...MOODS.battle, top: 0x8a8e88, horizon: 0xd2c8b0, fog: 0xb4ab98, bottom: 0xb4ab98, fogDensity: 0.0042, sunLight: 0xffe6c0, sunI: 1.5, mist: 0 };
MOODS.strike = { ...MOODS.smoke, top: 0x7a7c80, horizon: 0xcfc0a4, fog: 0xa49884, bottom: 0xa49884, fogDensity: 0.0048, sunI: 1.6, mist: 0 };
MOODS.ember = { ...MOODS.dusk, mist: 0, fogDensity: 0.004, fire: 0 };
MOODS.memory = { ...MOODS.strike, fog: 0x8a8070, sunI: 1.3, hemiI: 1.2 };

// ------------------------------------------------------------ cast
const actors = [], SND = [];
const add = (kind, variant, weapon) => { const a = makeActor(kind, variant, weapon); a.phase = R() * 10; a.phaseSign = R() < 0.5 ? -1 : 1; a.track = new Track(); scene.add(a.root); actors.push(a); return a; };
const gpos = (x, z, y = 0) => { const [wx, wz] = loc(x, z); return V(wx, heightAt(wx, wz) + y, wz); };
const blood = (t, x, z, y = 0.9, dir = V(0, 0.3, 1), amt = 1.2) => { fx.blood(t, gpos(x, z, y), dir.clone().normalize(), amt); fx.blood(t + 0.15, gpos(x, z, y * 0.7), dir.clone().normalize(), amt * 0.6); SND.push({ T: t, type: 'hit', pos: gpos(x, z, y) }); };
function at(a, t, x, z, mode, ry) { const [wx, wz] = loc(x, z); a.track.at(t, wx, wz, mode, ry); return { at }; } // chainable: at(a, ...).at(a, ...)
const jump = (a, t, x, z, mode, ry) => { const [wx, wz] = loc(x, z); a.track.jump(t, wx, wz, mode, ry); return a; };
const out = (x, z) => Math.atan2(x, z); // facing away from the compound centre
const inward = (x, z) => Math.atan2(-x, -z);

// ---- Assam Rifles
const AR = [];
const sentry = add('jawan', 'young'); AR.push(sentry);
for (let t = 0; t < 8.6; t += 2.9) { at(sentry, t, -8.2, -13.0, 'walk', PI / 2); at(sentry, t + 1.45, -2.2, -13.0, 'walk', -PI / 2); }
at(sentry, 8.95, -6.5, -12.6, 'run').at(sentry, 9.35, -6.5, -12.6, 'kneelFire', PI);
fx.dust(9.0, gpos(-4.6, -13.4)); fx.spark(9.0, gpos(-4.4, -14.2, 0.6)); SND.push({ T: 9.0, type: 'rifle', pos: gpos(-40, 0, 1) }); // the first round
const crew = [];
const crewSpec = [['B1', 'bren'], ['B1', 'old'], ['B2', 'bren'], ['B3', 'bren'], ['B4', 'soldier'], ['B5', 'bren'], ['B5', 'old'], ['B6', 'soldier'], ['B7', 'soldier']];
crewSpec.forEach(([id, v], i) => {
  const bk = LAM.bunkers.find((b) => b.id === id), a = add('jawan', v); a.bk = bk;
  const d = Math.hypot(bk.x, bk.z), ox = bk.x / d, oz = bk.z / d, side = crewSpec.filter((c, j) => c[0] === id && j < i).length;
  const x = bk.x - ox * 0.4 + (side ? oz * 1.0 : 0), z = bk.z - oz * 0.4 - (side ? ox * 1.0 : 0);
  a.x = x; a.z = z; a.ry = out(bk.x, bk.z) + (side ? 0.4 : 0);
  at(a, 0, x, z, v === 'bren' ? 'prone' : 'idle', a.ry).at(a, 9.6 + R() * 0.8, x, z, v === 'bren' ? 'proneBurst' : 'kneelFire', a.ry);
  crew.push(a); AR.push(a);
});
const trench = [];
[[-19.2, -10], [-19.2, -3], [-19.2, 5], [-10, 18.8], [3, 18.6]].forEach(([x, z], i) => {
  const a = add('jawan', i % 2 ? 'old' : 'soldier'), ry = Math.abs(x) > 15 ? -PI / 2 : 0;
  at(a, 0, x, z, 'crouch', ry).at(a, 10 + R(), x, z, 'kneelFire', ry); a.x = x; a.z = z; a.ry = ry; trench.push(a); AR.push(a);
});
const capt = add('jawan', 'officer'); AR.push(capt);
at(capt, 0, 4, 9, 'idle', PI).at(capt, 9.8, 4, 9, 'point', PI + 0.6).at(capt, 14, 4, 9, 'talk', PI);
const radio = add('jawan', 'young', null); AR.push(radio);
at(radio, 0, 9.4, 12.4, 'phone', PI);
// night casualties
const killAR = (a, t, mode = 'fall') => { a.track.at(t, a.track.k[a.track.k.length - 1].x, a.track.k[a.track.k.length - 1].z, mode); a.td = t; blood(t, a.x, a.z, 0.8, V(-Math.sin(a.ry), 0.3, -Math.cos(a.ry))); };
killAR(crew[6], 14.2); killAR(trench[1], 24.0, 'fallFwd');

// ---- MNA
const MNA = [];
const posts = [];
LAM.mnaAxes.forEach((ax, ai) => {
  const n = ai === 1 ? 6 : ai === 2 || ai === 3 ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const [fx0, fz0] = ax.from, [tx, tz] = ax.to;
    const k = 0.42 + 0.14 * R(), sx = (R() - 0.5) * 9, sz = (R() - 0.5) * 9;
    const px = fx0 + (tx - fx0) * (0.55 + 0.1 * R()) + sx * 0.6, pz = fz0 + (tz - fz0) * (0.55 + 0.1 * R()) + sz * 0.6;
    posts.push({ ax: ai, sx: fx0 + sx, sz: fz0 + sz, px, pz });
  }
});
const variants = ['fighter', 'khaki', 'cap', 'civvy', 'gunner'];
posts.forEach((p, i) => {
  const v = i === 7 ? 'commander' : variants[i % 5];
  const a = add('mna', v); Object.assign(a, p);
  const ry = Math.atan2(-p.px, -p.pz);
  at(a, 0, p.sx, p.sz, 'crouch', ry).at(a, 2 + R() * 1.5, p.sx, p.sz, 'run').at(a, 7.5 + R(), p.px, p.pz, i % 3 === 0 ? 'proneFire' : v === 'gunner' ? 'proneBurst' : v === 'cap' ? 'kneelBurst' : 'crouchAim', ry);
  a.ry = ry; MNA.push(a);
});
const cmdr = MNA[7];
const zamaPost = posts.findIndex((p) => p.ax === 1);
const axW = MNA.filter((a) => a.ax === 1);
const zama = axW.find((a) => a.variant === 'fighter') ?? axW[0];
const mapuia = axW.find((a) => a.variant === 'khaki' && a !== zama) ?? axW.find((a) => a !== zama);
// Zama gets his own run past the camera at the start
// treasury & exchange raids (axes S and S-E)
const tre = LAM.outside[0], exc = LAM.outside[1];
MNA.filter((a) => a.ax === 2).forEach((a, j) => { at(a, 12.5 + j * 0.3, a.px, a.pz, 'run').at(a, 15.6 + j * 0.2, tre.x - 1.4 + j * 1.4, tre.z - tre.d / 2 - 1.2, 'loot', 0).at(a, 21, tre.x - 1.4 + j * 1.4, tre.z - tre.d / 2 - 1.2, 'crouchAim', PI * 0.95); });
MNA.filter((a) => a.ax === 3).forEach((a, j) => { at(a, 12.8 + j * 0.3, a.px, a.pz, 'run').at(a, 15.8 + j * 0.2, exc.x - 1.2 + j * 1.2, exc.z - exc.d / 2 - 1.2, j === 1 ? 'plant' : 'aim', 0).at(a, 21.5, exc.x - 1.2 + j * 1.2, exc.z - exc.d / 2 - 1.2, 'crouchAim', PI * 0.95); });
SND.push({ T: 16.0, type: 'breach', pos: gpos(tre.x, tre.z - tre.d / 2, 1) });
fx.explosion(16.0, gpos(tre.x, tre.z - tre.d / 2 - 0.3, 1), 0.45);
// MNA night casualties
const killMNA = (a, t, mode = 'fall') => { const s = a.track.k[a.track.k.length - 1]; a.track.at(t, s.x, s.z, mode); a.td = t; blood(t, s.x - CEN.x, s.z - CEN.z, 0.6, V(Math.sin(a.ry + PI), 0.3, Math.cos(a.ry + PI))); };
killMNA(MNA[2], 12.6); killMNA(MNA[12], 19.2, 'fallFwd'); killMNA(MNA[20], 27.4);

// ---- the siege (1–4 March): day-time positions, a helicopter, the assault on B1 and the flag
MNA.forEach((a) => { if (a.td) return; jump(a, 99.5, a.px, a.pz, a.track.k[a.track.k.length - 1].mode === 'proneFire' ? 'proneFire' : 'kneelFire', a.ry); });
const assault = MNA.filter((a) => !a.td && (a.ax === 1 || a.ax === 2)).slice(0, 5);
const b1 = LAM.bunkers[0];
assault.forEach((a, j) => {
  const tx = b1.x + 1.2 * Math.cos(j * 1.3), tz = b1.z + 1.2 * Math.sin(j * 1.3);
  at(a, 116.8 + j * 0.2, a.px, a.pz, 'run').at(a, 119.3 + j * 0.15, tx, tz, 'autoFire', inward(b1.x, b1.z)).at(a, 121.0, tx, tz, 'aim', inward(b1.x, b1.z));
});
crew.filter((a) => a.bk.id === 'B1').forEach((a, j) => killAR(a, 118.6 + j * 0.5));
const bearer = assault[0];
bearer.track.at(121.1, bearer.track.k[bearer.track.k.length - 1].x, bearer.track.k[bearer.track.k.length - 1].z, 'idle');
jump(bearer, 121.2, b1.x + 0.35, b1.z, 'hoist', PI / 2); bearer.liftWin = [121.2, 216.9, 1.62];
at(bearer, 124.2, b1.x + 0.35, b1.z, 'cheer', PI / 2);
assault.slice(1).forEach((a) => a.track.at(124.0 + R() * 0.4, a.track.k[a.track.k.length - 1].x, a.track.k[a.track.k.length - 1].z, 'cheer'));
const T_FLAG0 = 121.2, T_FLAG1 = 124.0;
at(capt, 99.5, 9.6, 12.2, 'phone', PI + 0.3); at(capt, 127.5, 9.6, 12.2, 'phone', PI + 0.3);
jump(radio, 99.4, 8.2, 12.6, 'idle', PI);
// the supply helicopter
const chopper = makeChopper(); scene.add(chopper.root);
const chopPath = [[100, 75, 42, 45], [103.5, 40, 22, 20], [106.2, LAM.helipad.x + 3, 7, LAM.helipad.z + 6], [107.6, LAM.helipad.x + 5, 9, LAM.helipad.z + 4], [111.5, 70, 34, -40]];
const chopAt = (T) => { let i = 0; while (i < chopPath.length - 1 && chopPath[i + 1][0] <= T) i++; const a = chopPath[i], b = chopPath[Math.min(i + 1, chopPath.length - 1)]; const u = b === a ? 0 : ease.inOut(Math.min(1, Math.max(0, (T - a[0]) / (b[0] - a[0])))); return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, z: a[3] + (b[3] - a[3]) * u, vx: b[1] - a[1], vz: b[3] - a[3] }; };
for (let t = 105.4; t < 108.4; t += 0.22 + R() * 0.2) { const c = chopAt(t); fx.spark(t, gpos(c.x + (R() - 0.5) * 1.5, c.z + (R() - 0.5) * 2, c.y + 1.2)); }
for (let t = 104.8; t < 109; t += 0.35 + R() * 0.4) SND.push({ T: t, type: 'rifle', pos: gpos(-30 + R() * 60, 30 + R() * 10, 1.0) });

// ---- 5 March: the air strike
const jets = [makeJet(), makeJet(), makeJet(), makeJet()];
jets.forEach((j) => { j.root.scale.setScalar(1.25); scene.add(j.root); });
const runs = LAM.airRuns;
const pass = (j, t0, t1, from, to, alt0, altMid) => ({ j, t0, t1, from, to, alt0, altMid });
const PASSES = [
  pass(0, 200.6, 203.6, [-110, -60], [110, 40], 55, 48), pass(1, 201.0, 204.0, [-110, -48], [110, 52], 55, 48),
  pass(0, 205.0, 207.6, runs[0][0], runs[0][1], 30, 14), pass(1, 206.0, 208.6, [runs[0][0][0] + 4, runs[0][0][1] - 6], [runs[0][1][0] + 4, runs[0][1][1] - 6], 30, 15),
  pass(2, 210.0, 212.6, runs[1][0], runs[1][1], 28, 15), pass(3, 210.9, 213.5, [runs[1][0][0], runs[1][0][1] - 8], [runs[1][1][0], runs[1][1][1] - 8], 28, 16),
  pass(0, 215.8, 218.4, runs[0][1], runs[0][0], 30, 13),
];
const jetPos = (p, T) => { const u = (T - p.t0) / (p.t1 - p.t0); const x = p.from[0] + (p.to[0] - p.from[0]) * u, z = p.from[1] + (p.to[1] - p.from[1]) * u; const g = gpos(x, z); return { u, pos: V(g.x, Math.max(g.y, heightAt(CEN.x, CEN.z)) + p.alt0 + (p.altMid - p.alt0) * Math.sin(PI * Math.min(1, Math.max(0, u))), g.z), ry: Math.atan2(p.to[0] - p.from[0], p.to[1] - p.from[1]) }; };
PASSES.forEach((p, k) => SND.push({ T: (p.t0 + p.t1) / 2, type: 'jet', pos: jetPos(p, (p.t0 + p.t1) / 2).pos, dur: p.t1 - p.t0 }));
// cannon: strafing passes walk rounds across the ground ahead of the jet
const strafe = (p, u0, u1) => {
  for (let T = p.t0 + (p.t1 - p.t0) * u0; T < p.t0 + (p.t1 - p.t0) * u1; T += 0.05) {
    const jp = jetPos(p, T), ahead = jetPos(p, T + 0.45).pos, from = jp.pos.clone();
    const tgt = V(ahead.x + (R() - 0.5) * 3, 0, ahead.z + (R() - 0.5) * 3); tgt.y = heightAt(tgt.x, tgt.z);
    fx.tracer(T, from, tgt, 0xffd080); fx.dust(T + 0.15, tgt); if (R() < 0.3) fx.spark(T + 0.15, tgt.clone().add(V(0, 0.3, 0)));
    if (R() < 0.5) SND.push({ T, type: 'cannon', pos: from });
  }
};
strafe(PASSES[2], 0.3, 0.62); strafe(PASSES[3], 0.32, 0.6); strafe(PASSES[6], 0.35, 0.65);
// bombs (incendiaries) — fall from the jet, burst, set houses alight
const bombs = [];
[[4, 0.17], [4, 0.23], [4, 0.29], [5, 0.72], [5, 0.78], [5, 0.84]].forEach(([pi, u]) => {
  const p = PASSES[pi], t0 = p.t0 + (p.t1 - p.t0) * u, rel = jetPos(p, t0).pos, land = jetPos(p, t0 + 0.18).pos; // bombs carry forward a little
  land.y = heightAt(land.x, land.z);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 4, 8), new THREE.MeshToonMaterial({ color: 0x2a2a28 })); m.rotation.x = PI / 2; scene.add(m);
  bombs.push({ m, t0, t1: t0 + 0.75, from: rel, to: land });
  fx.explosion(t0 + 0.75, land, 1.5); SND.push({ T: t0 + 0.75, type: 'bomb', pos: land });
  // nearest houses catch fire
  set.houses.map((h) => ({ h, d: Math.hypot(h.wx - land.x, h.wz - land.z) })).sort((a, b) => a.d - b.d).slice(0, 2).forEach(({ h }, k) => {
    set.addFire(V(h.wx, h.top - 0.6, h.wz), 1.1, t0 + 0.8 + k * 0.4, 400);
    fx.smokeColumn(t0 + 1.2 + k * 0.4, 320, () => V(h.wx, h.top + 1, h.wz), 1.5);
  });
});
// the church burns too (accounts describe churches and schools destroyed)
{ const ch = LAM.outside[2]; const p = gpos(ch.x, ch.z, ch.h); set.addFire(p, 1.6, 211.8, 400); fx.smokeColumn(212.2, 320, () => p.clone().add(V(0, 3, 0)), 2); }
// MNA: look up, take casualties, fall back
MNA.forEach((a) => { if (a.td) return; const s = a.track.k[a.track.k.length - 1]; jump(a, 199.5, a.px, a.pz, 'crouch', a.ry); at(a, 201.5 + R() * 0.6, a.px, a.pz, 'look', a.ry); });
[[MNA[4], 206.6], [MNA[9], 207.3], [MNA[15], 212.4], [MNA[22], 211.7]].forEach(([a, t]) => { if (!a.td) killMNA(a, t); });
const retreatTo = (a) => { const r = LAM.retreat.reduce((best, rr) => (Math.hypot(rr.from[0] - a.px, rr.from[1] - a.pz) < Math.hypot(best.from[0] - a.px, best.from[1] - a.pz) ? rr : best)); return r.to; };
MNA.forEach((a, i) => {
  if (a.td || a === zama || a === mapuia || a === bearer) return;
  const [tx, tz] = retreatTo(a), t0 = 213.2 + R() * 1.6;
  at(a, t0, a.px, a.pz, 'run').at(a, t0 + 7, tx + (R() - 0.5) * 10, tz + (R() - 0.5) * 10, 'crouch');
});
at(cmdr, 213.0, cmdr.px, cmdr.pz, 'point', cmdr.ry + PI);
// the flag-bearer stays by his flag; the strafing run gets him and the pole
bearer.track.at(216.9, bearer.track.k[bearer.track.k.length - 1].x, bearer.track.k[bearer.track.k.length - 1].z, 'fall'); bearer.td = 216.9;
blood(216.9, b1.x + 0.35, b1.z, 2.2, V(0, 0.6, -1), 1.4);
const T_POLE = 217.3;
// Zama and Mapuia: the house they shelter behind
const zx = zama.px - 6, zz = zama.pz + 2;
const shelter = set.houses.map((h) => ({ h, d: Math.hypot(h.wx - (CEN.x + zx), h.wz - (CEN.z + zz)) })).sort((a, b) => a.d - b.d)[0].h;
const hx = shelter.wx - CEN.x, hz = shelter.wz - CEN.z;
const toC = Math.atan2(-hx, -hz); // the wall facing the compound
const wallX = hx + Math.sin(toC) * 3.5, wallZ = hz + Math.cos(toC) * 3.5;
at(zama, 214.0, zama.px, zama.pz, 'run').at(zama, 216.75, wallX + Math.sin(toC) * 3, wallZ + Math.cos(toC) * 3, 'fallFwd');
blood(216.8, wallX + Math.sin(toC) * 3, wallZ + Math.cos(toC) * 3, 0.9, V(0, 0.5, 1), 1.6);
at(zama, 218.6, wallX + Math.sin(toC) * 3, wallZ + Math.cos(toC) * 3, 'dead').at(zama, 220.0, wallX, wallZ, 'dying', toC);
zama.vis = [-1, 219.9];
const zamaHurt = add('mna', 'hurt'); zamaHurt.vis = [219.9, 999]; zamaHurt.dieAfter = 14.6;
at(zamaHurt, 0, wallX, wallZ, 'idle', toC).at(zamaHurt, 219.9, wallX, wallZ, 'dying', toC);
at(mapuia, 214.2, mapuia.px, mapuia.pz, 'run').at(mapuia, 217.6, wallX + Math.sin(toC) * 3.8, wallZ + Math.cos(toC) * 3.8, 'cradle', toC + PI)
  .at(mapuia, 218.6, wallX + Math.sin(toC) * 3.4, wallZ + Math.cos(toC) * 3.4, 'run').at(mapuia, 220.0, wallX + Math.sin(toC) * 0.35 + Math.cos(toC) * 0.95, wallZ + Math.cos(toC) * 0.35 - Math.sin(toC) * 0.95, 'cradle', toC - PI / 2 - 0.35);
// civilians flee the burning town
const civ = [];
for (let i = 0; i < 8; i++) {
  const a = add('civil', ['woman', 'man', 'elder', 'boy'][i % 4] === 'man' ? 'sad' : ['woman', 'man', 'elder', 'boy'][i % 4]);
  const x = 26 + (i % 4) * 3, z = -26 + Math.floor(i / 4) * 5;
  at(a, 0, x, z, 'idle', PI).at(a, 210.6 + R(), x, z, 'flee').at(a, 222, x + 18 + R() * 6, z - 22, 'flee');
  a.vis = [200, 300]; civ.push(a);
}
// ---- 7 March: aftermath, the relief column on the road
const trucks = [makeTruck(), makeTruck()];
trucks.forEach((t) => scene.add(t.root));
const roadPt = (u) => { const pts = LAM.road.slice().reverse(); const f = Math.min(pts.length - 1.001, Math.max(0, u * (pts.length - 1))); const i = Math.floor(f), k = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; };

// ------------------------------------------------------------ gunfire derived from the choreography
actors.forEach((a) => { if (!a.track.k.length) at(a, 0, 400, 400, 'idle'); a.track.finalize(); });
const FIRE = { kneelFire: 'single', kneelBurst: 'burst', proneFire: 'single', proneBurst: 'burst', crouchAim: 'single', autoFire: 'burst' };
const liveAt = (list, T) => list.filter((a) => !(a.td && T >= a.td));
const apos = (a, T) => { const s = a.track.sample(T); return V(s.x, heightAt(s.x, s.z) + 0.9, s.z); };
const blocks = [[9.3, 34], [99.6, 121], [199.6, 205]];
for (const a of [...AR, ...MNA]) {
  let next = 0, burst = 0;
  for (const [b0, b1_] of blocks) for (let T = b0; T < b1_; T += 0.04) {
    const s = a.track.sample(T); const kind = FIRE[s.mode];
    if (!kind || s.mt < 0.3 || (a.td && T >= a.td) || T < next) continue;
    const foes = liveAt(a.kind === 'jawan' ? MNA : AR, T); if (!foes.length) continue;
    const prone = s.mode.startsWith('prone'), kneel = s.mode.startsWith('kneel') || s.mode === 'crouchAim';
    const base = V(s.x, heightAt(s.x, s.z) + (prone ? 0.32 : kneel ? 0.75 : 1.05), s.z);
    const tgt = apos(foes[Math.floor(R() * foes.length)], T).add(V((R() - 0.5) * 2.5, (R() - 0.5) * 1.4, (R() - 0.5) * 2.5));
    const dir = tgt.clone().sub(base).normalize(), muzzle = base.clone().addScaledVector(dir, prone ? 1.5 : 1.2);
    const heavy = a.weaponKind === 'bren';
    fx.shot(T, muzzle, dir, heavy);
    if (heavy && (burst % 3 === 0)) fx.tracer(T, muzzle, tgt, a.kind === 'jawan' ? 0xffa040 : 0xffe080);
    const gy = heightAt(tgt.x, tgt.z); if (tgt.y < gy + 0.8 || R() < 0.6) fx.dust(T + 0.06, V(tgt.x, gy, tgt.z)); else fx.spark(T + 0.06, tgt);
    SND.push({ T, type: heavy ? 'bren' : a.weaponKind === 'sten' ? 'sten' : 'rifle', pos: muzzle });
    const bursty = kind === 'burst' || heavy || a.weaponKind === 'sten';
    const slow = b0 > 99 && b0 < 150 ? 1.8 : 1.0; // siege: slower, sniping
    if (bursty) { if (burst <= 0) burst = 3 + Math.floor(R() * 4); burst--; next = T + (burst > 0 ? 0.11 : (0.9 + R() * 1.2) * slow); }
    else next = T + (1.1 + R() * 1.6) * slow;
  }
}
const FLARES = [9.25, 18.8, 28.4];
FLARES.forEach((t) => SND.push({ T: t, type: 'flare', pos: gpos(0, 0, 10) }));
fx.build(scene);

// ------------------------------------------------------------ the cut
const C_ = (pos, look, fov = 42) => ({ pos, look, fov });
const L = (a, b, k) => ({ pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: a.fov + (b.fov - a.fov) * k });
const G = (x, z, y) => gpos(x, z, y);
const AP = (a, T, dy = 1) => { const s = a.track.sample(T); return V(s.x, heightAt(s.x, s.z) + dy, s.z); };
const zW = gpos(wallX, wallZ, 0), zDir = V(Math.sin(toC), 0, Math.cos(toC)), zSide = V(Math.cos(toC), 0, -Math.sin(toC));
const SHOTS = [
  { name: 'Cold Open', dur: 3, card: 'black' },
  { name: 'Title', s: [0, 5.5], dur: 5.5, mood: 'night66', loc: 'AIZAWL · 28 FEBRUARY 1966 · 22:30 HRS', title: 'OPERATION JERICHO',
    cam: (T, k) => L(C_(G(-46, -64, 34), G(0, 2, 2), 44), C_(G(-34, -52, 22), G(0, 0, 3), 40), ease.inOut(k)) },
  { name: 'Map', dur: 7, card: 'map', lines: ['The 1st Battalion, Assam Rifles holds Lammual — the garrison on Aizawl’s ridge.', 'Tonight the Mizo National Army moves in from every side.'] },
  { name: 'Zama', s: [2.2, 6.4], dur: 4.5, mood: 'night66', handheld: 1, freeze: { at: 2.0, dur: 1.4, name: 'ZAMA', role: 'MNA volunteer, 19', who: () => zama },
    cam: (T, k) => { const p = AP(zama, T, 0.9); return C_(G(-40, -5.5, 2.0), p, 46); } },
  { name: 'Sentry', s: [6.4, 9.6], dur: 4, mood: 'night66', freeze: { at: 0.9, dur: 1.3, name: 'RFN. GURUNG', role: '1st Bn Assam Rifles', who: () => sentry },
    cam: (T, k) => L(C_(G(0.8, -10.6, 1.5), G(-5.0, -13.0, 1.05), 40), C_(G(0.2, -11.0, 1.4), G(-5.6, -12.9, 0.95), 36), k) },
  { name: 'First Fire', s: [9.6, 15.6], dur: 6, mood: 'night66', handheld: 1, sub: [[0.8, 3.4, 'Captain (in Hindi)', 'Stand to! Stand to! Light them up!']],
    cam: (T, k) => L(C_(G(-15.2, 0.6, 1.9), G(-40, -3, 2.5), 52), C_(G(-15.6, 1.6, 1.8), G(-40, 6, 3.5), 54), k) },
  { name: 'Treasury', s: [15.4, 20.0], dur: 4, mood: 'night66', caption: 'The treasury and the telephone exchange fall the same night.',
    cam: (T, k) => L(C_(G(-17, -45, 2.6), G(tre.x, tre.z - 2.5, 1.4), 46), C_(G(-16.5, -43.5, 2.3), G(tre.x, tre.z - 2.5, 1.5), 40), k) },
  { name: 'Bunker', s: [20.0, 24.4], dur: 4, mood: 'night66', handheld: 1.2, sub: [[0.4, 3.6, 'Havildar (in Hindi)', 'Hold the line! Nobody falls back!']],
    cam: (T, k) => { const b = LAM.bunkers.find((x) => x.id === 'B5'); return C_(G(b.x + 2.4, b.z + 1.6, 1.25), G(b.x - 8, b.z - 1, 0.8), 48); } },
  { name: 'Split', s: [26, 31.5], dur: 5, mood: 'night66', split: true,
    sub: [[0.4, 4.7, 'MNA commander (in Mizo) | Radio operator', 'Keep them pinned. They cannot hold forever.  |  Lammual calling — we are surrounded. Send help!']],
    camA: (T) => { const p = AP(cmdr, T, 0); return C_(p.clone().add(V(1.6, 1.4, 1.2)), p.clone().add(V(0, 1.1, 0)), 40); },
    camB: (T) => C_(G(8.4, 10.6, 1.6), G(9.4, 12.4, 1.2), 40) },
  { name: 'Siege', s: [100, 104.5], dur: 4.5, mood: 'siege', loc: '1 – 4 MARCH 1966 · THE SIEGE',
    cam: (T, k) => L(C_(G(44, -52, 40), G(0, 0, 2), 44), C_(G(38, -46, 34), G(0, 2, 2), 42), ease.inOut(k)) },
  { name: 'Chopper', s: [103.4, 110.4], dur: 5.5, mood: 'siege', caption: 'Supply helicopters are driven off by MNA snipers.',
    cam: (T, k) => { const c = chopAt(T); return C_(G(LAM.helipad.x - 6, LAM.helipad.z - 6, 1.6), V(CEN.x + c.x, heightAt(CEN.x, CEN.z) + c.y + 1, CEN.z + c.z), 52); } },
  { name: 'The Flag', s: [117.0, 127.0], dur: 8, mood: 'siege', loc: '4 MARCH · LAMMUAL NEARLY FALLS', slowFrom: [121.0, 124.4],
    sub: [[4.4, 7.6, 'MNA volunteers (in Mizo)', 'For Mizoram!']],
    cam: (T, k) => L(C_(G(b1.x + 7, b1.z - 7, 1.4), G(b1.x, b1.z, 2.6), 42), C_(G(b1.x + 5.2, b1.z - 5.6, 0.9), G(b1.x, b1.z, 4.2), 40), ease.inOut(k)) },
  { name: 'Request Air', s: [127.6, 132.2], dur: 4.5, mood: 'siege', sub: [[0.3, 4.3, 'Company commander', 'We cannot hold another day. Request air support — I say again, request air!']],
    cam: (T, k) => L(C_(G(8.0, 10.2, 1.55), G(9.6, 12.2, 1.45), 38), C_(G(8.6, 10.7, 1.5), G(9.6, 12.2, 1.45), 32), k) },
  { name: 'Jets', s: [200, 205], dur: 5, mood: 'strike', loc: '5 MARCH 1966 · 10:00 HRS',
    cam: (T, k) => C_(G(0.6, -26.5, 1.5), jetPos(PASSES[0], Math.min(Math.max(T, 200.8), 203.4)).pos.clone().lerp(G(0, 10, 40), 0.4 * (1 - k)), 60) },
  { name: 'Strafe', s: [205.0, 209.0], dur: 4.5, mood: 'strike', handheld: 1,
    cam: (T, k) => C_(G(-5, -8, 1.7), jetPos(PASSES[2], Math.min(Math.max(T, 205.2), 207.4)).pos, 56) },
  { name: 'Bombs', s: [209.8, 214.0], dur: 5.5, mood: 'strike', slowFrom: [210.9, 212.6], caption: 'Incendiary bombs fall on Aizawl. Houses, churches and schools burn.',
    cam: (T, k) => L(C_(G(-23.5, -8, 7.5), G(-40, 15, 1), 54), C_(G(-24, -7, 7), G(-38, 14, 3), 56), k) },
  { name: 'Retreat', s: [213.2, 217.0], dur: 4.5, mood: 'strike', handheld: 1.2, sub: [[0.4, 3.6, 'MNA commander (in Mizo)', 'Fall back! Into the jungle — go!']],
    cam: (T, k) => L(C_(G(-62, 4, 4.2), G(-34, 1, 1.4), 50), C_(G(-60, 5, 3.4), G(-38, 2, 1.2), 46), k) },
  { name: 'Flag Falls', s: [216.7, 218.6], dur: 3.2, mood: 'strike',
    cam: (T, k) => C_(G(b1.x + 6, b1.z - 4, 1.0), G(b1.x, b1.z, 3.6), 40) },
  { name: 'Zama', s: [219.6, 236.0], dur: 16, mood: 'memory', dying: true,
    sub: [[0.4, 2.8, 'Mapuia (in Mizo)', 'Zama! Stay with me — look at me!'],
      [3.2, 7.2, 'Zama (in Mizo)', 'I hope my sacrifice for Mizoram will not be in vain…'],
      [7.5, 11.5, 'Zama (in Mizo)', '…I hope it brings a better future for the youth of Mizoram…'],
      [11.8, 15.4, 'Zama (in Mizo)', '…even though one day, many of our leaders will abuse their power.']],
    cam: (T, k) => {
      const head = zW.clone().add(V(0, 0.95, 0)).addScaledVector(zDir, 0.35);
      const wide = C_(zW.clone().addScaledVector(zDir, 4.4).addScaledVector(zSide, -2.0).add(V(0, 1.45, 0)), head.clone().addScaledVector(zSide, 0.45), 40);
      const close = C_(zW.clone().addScaledVector(zDir, 1.5).addScaledVector(zSide, -0.55).add(V(0, 0.95, 0)), head, 30);
      return L(wide, close, ease.inOut(Math.min(1, k * 1.6)));
    } },
  { name: 'Aftermath', s: [300, 307.5], dur: 6.5, mood: 'ember', caption: '7 March: an Army column relieves Lammual. No official record of the bombing’s casualties was ever made.',
    cam: (T, k) => L(C_(G(-40, -70, 26), G(0, 0, 4), 44), C_(G(-30, -62, 32), G(0, 0, 6), 46), ease.inOut(k)) },
  { name: 'Remember', dur: 5, card: 'text', text: ['We do not glorify war.', 'But we must never forget the price of our freedom.'] },
  { name: 'For All', dur: 7.5, card: 'text', small: true, text: ['This film belongs to no political party.', 'It honours the Mizo people, who suffered on every side of the struggle,', 'and the churches, NGOs and community leaders who worked for peace.', 'Peace was not won by politics — but by the endurance and hard work of the Mizo people.'] },
  { name: 'Accord', dur: 4.5, card: 'text', small: true, text: ['Twenty years later, on 30 June 1986, the Mizo Peace Accord was signed.', 'Characters are fictional; the events are dramatised from historical accounts.'] },
];
let acc = 0; for (const s of SHOTS) { s.start = acc; acc += s.dur; }
const TOTAL = acc;
const clamp = (x) => Math.max(0, Math.min(1, x));
function storyOf(t) {
  let i = 0; for (let j = SHOTS.length - 1; j >= 0; j--) if (t >= SHOTS[j].start) { i = j; break; }
  const shot = SHOTS[i]; let lt = t - shot.start; const k = clamp(lt / shot.dur);
  if (!shot.s) return { i, shot, lt, k, T: 0 };
  let tl = lt, frozen = false;
  if (shot.freeze && lt > shot.freeze.at) { if (lt < shot.freeze.at + shot.freeze.dur) { tl = shot.freeze.at; frozen = true; } else tl = lt - shot.freeze.dur; }
  const D = shot.dur - (shot.freeze ? shot.freeze.dur : 0), [s0, s1] = shot.s;
  let T = s0 + (s1 - s0) * clamp(tl / D);
  if (shot.slowFrom) { const [a, b] = shot.slowFrom, n1 = a - s0, n3 = s1 - b, sd = D - n1 - n3; T = tl < n1 ? s0 + tl : tl < n1 + sd ? a + (b - a) * ((tl - n1) / sd) : b + (tl - n1 - sd); }
  return { i, shot, lt, k, T, frozen };
}

// ------------------------------------------------------------ per frame
const q = new THREE.Quaternion(), e = new THREE.Euler();
function updateScene(T, shot) {
  world.applyMood(MOODS[shot.mood]);
  qgLamp.visible = shot.mood === 'night66';
  animateSet(set, T, FLARES);
  // MNF flag: hoisted on 4 March, shot down on 5 March
  set.mnfPole.visible = T >= T_FLAG0 && T < 300;
  set.mnf.position.y = 0.9 + 3.3 * clamp((T - T_FLAG0) / (T_FLAG1 - T_FLAG0));
  set.mnfPole.rotation.set(T > T_POLE ? -1.45 * ease.out(clamp((T - T_POLE) / 1.0)) : 0, 0.9, 0);
  // helicopter
  const showChop = T > 99 && T < 113; chopper.root.visible = showChop;
  if (showChop) { const c = chopAt(T); chopper.root.position.copy(gpos(c.x, c.z)).setY(heightAt(CEN.x, CEN.z) + c.y); chopper.root.rotation.set(0, Math.atan2(c.vx, c.vz), 0); chopper.body.rotation.set(0.15, 0, T > 106.5 && T < 109 ? 0.45 : 0.05 * Math.sin(T)); chopper.rotor.rotation.y = T * 31; chopper.tr.rotation.x = T * 47; }
  // jets
  jets.forEach((j, i) => { j.root.visible = false; });
  PASSES.forEach((p) => { if (T >= p.t0 && T <= p.t1) { const jp = jetPos(p, T), j = jets[p.j]; j.root.visible = true; j.root.position.copy(jp.pos); j.root.rotation.set(-0.12 * Math.cos(PI * jp.u), jp.ry, 0.25 * Math.sin(PI * jp.u)); } });
  bombs.forEach((b) => { const u = (T - b.t0) / (b.t1 - b.t0); b.m.visible = u >= 0 && u < 1; if (b.m.visible) { b.m.position.lerpVectors(b.from, b.to, u); b.m.position.y = b.from.y + (b.to.y - b.from.y) * u * u; } });
  // relief column
  trucks.forEach((tr, i) => { const u = clamp((T - 300 - i * 1.6) / 7) * 0.62; tr.root.visible = T >= 300; const [x, z] = roadPt(u), [x2, z2] = roadPt(u + 0.01); tr.root.position.copy(gpos(x, z)); tr.root.rotation.set(0, Math.atan2(x2 - x, z2 - z), 0); animateVehicle(tr, T, u * 60); });
  // actors
  for (const a of actors) {
    if (a.vis && (T < a.vis[0] || T >= a.vis[1])) { a.root.visible = false; continue; }
    const s = a.track.sample(T);
    const near = Math.hypot(s.x - camera.position.x, s.z - camera.position.z) < 170;
    a.root.visible = near; if (!near) continue;
    const lift = a.liftWin && T >= a.liftWin[0] && T < a.liftWin[1] ? a.liftWin[2] : 0;
    a.root.position.set(s.x, heightAt(s.x, s.z) + lift, s.z); a.root.rotation.set(0, s.ry, 0);
    pose(a, s.mode, s.mt, T + a.phase);
  }
  fx.update(T);
}
function placeCamera(c, tScreen, hh, T) {
  camera.position.copy(c.pos);
  camera.position.x += (Math.sin(tScreen * 1.7) * 0.04 + Math.sin(tScreen * 5.3) * 0.015) * hh * 2;
  camera.position.y += (Math.sin(tScreen * 2.3) * 0.03 + Math.sin(tScreen * 7.1) * 0.012) * hh * 2;
  const sh = fx.shake(T); if (sh > 0) { camera.position.x += Math.sin(T * 91) * sh; camera.position.y += Math.cos(T * 77) * sh; }
  camera.lookAt(c.look); camera.fov = c.fov; camera.updateProjectionMatrix();
  world.update(T, camera);
}

// ------------------------------------------------------------ the edit: grade, freeze tags, split screen, whips, cards
const Wd = 1280, Hd = 720, BAR = 92;
const wide = Object.assign(document.createElement('canvas'), { width: Wd, height: Hd });
const half = Object.assign(document.createElement('canvas'), { width: Wd, height: Hd });
const half2 = Object.assign(document.createElement('canvas'), { width: Wd, height: Hd });
const grain = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
{ const gg = grain.getContext('2d'), id = gg.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gg.putImageData(id, 0, 0); }
const FILTER = { night66: 'contrast(1.15) saturate(0.72) brightness(1.4)', siege: 'contrast(1.12) saturate(0.6) sepia(0.18)', strike: 'contrast(1.35) saturate(0.45) sepia(0.12)', memory: 'contrast(1.05) saturate(0.35) sepia(0.25) brightness(1.05)', ember: 'contrast(1.12) saturate(0.8) sepia(0.2)' };
const TINT = { night66: 'rgba(30,60,120,0.32)', siege: 'rgba(160,120,60,0.18)', strike: 'rgba(120,90,50,0.22)', memory: 'rgba(200,150,90,0.22)', ember: 'rgba(255,120,40,0.25)' };
function grade(g, shot, t, lt, frozen) {
  g.save(); g.filter = frozen ? 'grayscale(1) contrast(1.3) brightness(1.05)' : FILTER[shot.mood] ?? 'none';
  g.drawImage(renderer.domElement, 0, 0, Wd, Hd); g.restore();
  if (!frozen) { g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = TINT[shot.mood] ?? 'rgba(0,0,0,0)'; g.fillRect(0, 0, Wd, Hd); g.restore(); }
}
function finish(g, shot, T, t, lt) {
  // dying: the colour drains away
  if (shot.dying) { const k = clamp((lt - 11) / 4.5); if (k > 0) { g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = `rgba(128,128,128,${k})`; g.fillRect(0, 0, Wd, Hd); g.restore(); } }
  const v = g.createRadialGradient(Wd / 2, Hd / 2, Hd * (shot.dying ? 0.22 : 0.35), Wd / 2, Hd / 2, Hd * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, shot.dying ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.55)'); g.fillStyle = v; g.fillRect(0, 0, Wd, Hd);
  // explosion flashes
  let flash = 0; for (const [tt, s] of fx.shakes) { const d = Math.abs(T - tt); if (d < 0.12) flash = Math.max(flash, (1 - d / 0.12) * Math.min(1, s * 0.5)); }
  if (flash > 0) { g.fillStyle = `rgba(255,240,210,${0.6 * flash})`; g.fillRect(0, 0, Wd, Hd); }
  g.save(); g.globalAlpha = 0.08; g.globalCompositeOperation = 'overlay';
  const ox = (Math.floor(t * 24) * 97) % 256, oy = (Math.floor(t * 24) * 57) % 256;
  for (let x = -ox; x < Wd; x += 256) for (let y = -oy; y < Hd; y += 256) g.drawImage(grain, x, y);
  g.restore();
}
function whip(g, lt, dur) { // whip-pan smear at the cut
  const w = Math.max(clamp(1 - lt / 0.14), clamp(1 - (dur - lt) / 0.1));
  if (w <= 0) return;
  g.save(); g.globalAlpha = 0.18 * w; for (let i = 1; i <= 6; i++) g.drawImage(wide, i * 22 * w, 0); g.restore();
}
function typewriter(g, text, lt, x, y, delay = 0.8) {
  const n = Math.floor(clamp((lt - delay) / 1.3) * text.length); if (n <= 0) return;
  g.save(); g.font = '600 24px "DejaVu Sans Mono", monospace'; g.fillStyle = '#efe9dc'; g.textBaseline = 'middle'; g.fillText(text.slice(0, n) + (Math.floor(lt * 3) % 2 ? '▌' : ''), x, y); g.restore();
}
function subtitle(g, shot, lt, x, y, size, maxW) {
  for (const [a, b, who, line] of shot.sub ?? []) {
    const al = Math.min(clamp((lt - a) / 0.35), clamp((b - lt) / 0.35)); if (al <= 0) continue;
    g.save(); g.globalAlpha = al; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 600 ${size}px "DejaVu Serif", Georgia, serif`; g.lineWidth = size * 0.18; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.fillStyle = shot.dying ? '#fff3dc' : '#f3efe6';
    const txt = who.includes('|') ? line : `${who}: “${line}”`;
    g.strokeText(txt, x, y, maxW); g.fillText(txt, x, y, maxW); g.restore();
  }
}
function caption(g, shot, lt) {
  if (!shot.caption) return; const a = Math.min(clamp((lt - 0.6) / 0.4), clamp((shot.dur - 0.4 - lt) / 0.4)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = '600 21px "DejaVu Sans", sans-serif'; g.fillStyle = '#efe9dc'; g.textAlign = 'center'; g.fillText(shot.caption, Wd / 2, Hd - BAR / 2 + 2, Wd - 80); g.restore();
}
function freezeTag(g, shot, lt) {
  const f = shot.freeze; if (!f || lt < f.at || lt > f.at + f.dur) return;
  const u = (lt - f.at) / f.dur;
  if (u < 0.08) { g.fillStyle = `rgba(255,255,255,${0.7 * (1 - u / 0.08)})`; g.fillRect(0, 0, Wd, Hd); }
  g.save(); const x = 110, y = Hd - BAR - 140;
  g.fillStyle = '#c8202a'; g.fillRect(x - 14, y - 46, 8, 92);
  g.fillStyle = '#ffffff'; g.font = '900 64px "DejaVu Sans", sans-serif'; g.fillText(f.name, x, y);
  g.font = '600 26px "DejaVu Sans", sans-serif'; g.fillStyle = '#e8e2d2'; g.fillText(f.role, x + 2, y + 38); g.restore();
}
function card(g, shot, lt) {
  g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Hd);
  if (shot.card === 'black') return;
  if (shot.card === 'map') {
    g.save(); g.globalAlpha = clamp(lt / 0.5); drawLammualMap(g, Wd, Hd, { progress: 0.08 + 0.5 * clamp((lt - 0.4) / (shot.dur - 1.2)), layers: { axes: true, air: false, retreat: false, legend: true } }); g.restore();
    shot.lines.forEach((l, i) => { const a = clamp((lt - 1.0 - i * 2.4) / 0.6); if (a <= 0) return; g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(20,14,8,0.82)'; g.fillRect(0, Hd - 120 + i * 0, Wd, 120); g.fillStyle = '#f3ead6'; g.font = 'italic 600 26px "DejaVu Serif", Georgia, serif'; g.textAlign = 'center'; g.fillText(l, Wd / 2, Hd - 60, Wd - 80); g.restore(); });
    return;
  }
  const a = Math.min(clamp((lt - 0.4) / 0.7), clamp((shot.dur - 0.3 - lt) / 0.6));
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#efe9dc';
  const size = shot.small ? 25 : 40;
  shot.text.forEach((l, i) => { g.font = `${i === 0 && !shot.small ? 800 : 500} ${size}px "DejaVu Serif", Georgia, serif`; g.fillText(l, Wd / 2, Hd / 2 + (i - (shot.text.length - 1) / 2) * size * 1.7, Wd - 120); });
  g.restore();
}
function compose(t) {
  const { i, shot, lt, k, T, frozen } = storyOf(t);
  const g = wide.getContext('2d');
  if (shot.card) card(g, shot, lt);
  else if (shot.split) {
    updateScene(T, shot);
    placeCamera(shot.camA(T), t, 0.6, T); renderer.render(scene, camera); grade(g, shot, t, lt);
    const hg = half.getContext('2d'); hg.drawImage(wide, 0, 0);
    placeCamera(shot.camB(T), t + 3, 0.4, T); renderer.render(scene, camera); grade(g, shot, t, lt);
    half2.getContext('2d').drawImage(wide, 0, 0);
    g.drawImage(half, Wd * 0.25, 0, Wd * 0.5, Hd, 0, 0, Wd * 0.5, Hd);           // left: MNA
    g.drawImage(half2, Wd * 0.25, 0, Wd * 0.5, Hd, Wd * 0.5, 0, Wd * 0.5, Hd);   // right: radio operator
    g.fillStyle = '#000'; g.fillRect(Wd / 2 - 3, 0, 6, Hd);
    finish(g, shot, T, t, lt);
    g.save(); g.font = '700 18px "DejaVu Sans Mono", monospace'; g.fillStyle = '#efe9dc'; g.fillText('MNA POSITION · WEST SLOPE', 40, BAR + 30); g.fillText('LAMMUAL · SIGNAL OFFICE', Wd / 2 + 30, BAR + 30); g.restore();
  } else {
    updateScene(T, shot);
    placeCamera(shot.cam(T, k), t, shot.handheld ?? 0.25, T);
    renderer.render(scene, camera);
    grade(g, shot, t, lt, frozen);
    finish(g, shot, T, t, lt);
    if (!frozen) whip(g, lt, shot.dur);
    freezeTag(g, shot, lt);
  }
  // fades
  const fadeIn = i === 1 ? 1 - lt / 1.2 : shot.name === 'Zama' && shot.dying ? 1 - lt / 0.8 : 0;
  const fadeOut = shot.dying ? (lt - shot.dur + 1.4) / 1.4 : shot.name === 'Aftermath' ? (lt - shot.dur + 0.8) / 0.8 : 0;
  const fa = clamp(Math.max(fadeIn, fadeOut)); if (fa > 0 && !shot.card) { g.fillStyle = `rgba(0,0,0,${fa})`; g.fillRect(0, 0, Wd, Hd); }
  if (!shot.card || shot.card === 'map') { g.fillStyle = '#000'; g.fillRect(0, 0, Wd, BAR); if (shot.card !== 'map') g.fillRect(0, Hd - BAR, Wd, BAR); }
  if (shot.loc) typewriter(g, shot.loc, lt, 70, Hd - BAR - 40);
  if (shot.title) { const ta = Math.min(clamp((lt - 2.2) / 0.8), clamp((shot.dur - 0.3 - lt) / 0.5)); if (ta > 0) { g.save(); g.globalAlpha = ta; g.textAlign = 'center'; g.fillStyle = '#efe9dc'; g.font = '800 86px "DejaVu Serif", Georgia, serif'; g.fillText(shot.title, Wd / 2, Hd / 2); g.font = '600 20px "DejaVu Sans", sans-serif'; g.fillText('THE MNF UPRISING · AIZAWL · 1966', Wd / 2, Hd / 2 + 44); g.restore(); } }
  if (!shot.card) { subtitle(g, shot, lt, Wd / 2, Hd - BAR / 2, shot.dying ? 26 : 23, Wd - 70); caption(g, shot, lt); }
  return wide.toDataURL('image/jpeg', 0.92);
}
window.__compWide = compose;
window.__compBoth = (t) => { const w = compose(t); return [w, w]; };
window.__film = { TOTAL, SHOTS, storyOf };

// ------------------------------------------------------------ sound cue sheet (see scripts/make-sfx-jericho.py)
window.__audioPlan = (rate = 24) => {
  const outp = { total: TOTAL, rate, frames: [], events: [], shots: SHOTS.map((s) => ({ name: s.name, start: s.start, dur: s.dur, card: s.card ?? null, dying: !!s.dying, subs: (s.sub ?? []).map(([a, , who]) => ({ t: s.start + a, who })), loc: s.loc ? s.loc.length : 0, freeze: s.freeze ? s.start + s.freeze.at : null, title: !!s.title })) };
  const dir = new THREE.Vector3(), right = new THREE.Vector3();
  const rel = (p) => { const d = p.clone().sub(camera.position); const dist = d.length(); camera.getWorldDirection(dir); right.crossVectors(dir, camera.up).normalize(); return { d: +dist.toFixed(1), pan: +Math.max(-1, Math.min(1, d.normalize().dot(right))).toFixed(2) }; };
  const setCam = (t) => { const o = storyOf(t); if (!o.shot.card) { const c = o.shot.split ? o.shot.camA(o.T) : o.shot.cam(o.T, o.k); camera.position.copy(c.pos); camera.lookAt(c.look); camera.updateMatrixWorld(); } return o; };
  for (let f = 0; f < TOTAL * rate; f++) {
    const t = f / rate, o = setCam(t), T = o.T, o2 = storyOf(t + 1 / rate);
    const slow = o.shot.card ? 1 : o2.i === o.i ? (o2.T - T) * rate : 1;
    let jet = 9999; PASSES.forEach((p) => { if (T >= p.t0 - 1 && T <= p.t1 + 1) jet = Math.min(jet, jetPos(p, Math.min(p.t1, Math.max(p.t0, T))).pos.distanceTo(camera.position)); });
    let chop = 9999; if (T > 99 && T < 113) { const c = chopAt(T); chop = gpos(c.x, c.z).setY(heightAt(CEN.x, CEN.z) + c.y).distanceTo(camera.position); }
    const fires = set.fires.filter((fg) => fg.userData.burnAt >= 0 && T >= fg.userData.burnAt).reduce((m, fg) => Math.min(m, fg.position.distanceTo(camera.position)), 9999);
    outp.frames.push({ shot: o.shot.name, card: o.shot.card ?? null, mood: o.shot.mood ?? null, dying: !!o.shot.dying, frozen: !!o.frozen, slow: +slow.toFixed(3), jet: +jet.toFixed(1), chop: +chop.toFixed(1), fire: +fires.toFixed(1) });
  }
  const step = 1 / 240; let prev = null;
  for (let t = 0; t < TOTAL; t += step) {
    const o = storyOf(t);
    if (o.shot.card || o.frozen) { prev = null; continue; }
    if (!prev || prev.i !== o.i) prev = { i: o.i, T: o.T - 1e-6 };
    const slow = (o.T - prev.T) / step;
    for (const ev of SND) if (ev.T > prev.T && ev.T <= o.T) { setCam(t); outp.events.push({ t: +t.toFixed(4), type: ev.type, slow: +Math.min(1.5, slow).toFixed(3), dur: ev.dur ?? 0, ...rel(ev.pos) }); }
    prev = { i: o.i, T: o.T };
  }
  return outp;
};
if (!new URLSearchParams(location.search).has('still')) {
  const view = document.createElement('canvas'); view.width = Wd; view.height = Hd; stageEl.appendChild(view); renderer.domElement.style.display = 'none';
  const t0 = performance.now();
  (function loop() { const t = ((performance.now() - t0) / 1000) % TOTAL; compose(t); view.getContext('2d').drawImage(wide, 0, 0); requestAnimationFrame(loop); })();
}
