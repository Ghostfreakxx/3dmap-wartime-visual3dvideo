// OPERATION FREEDOM — a work of fiction. A fictional "Mizo Rangers" unit rescues a detained
// leader from a compound across the border. War-movie cut: letterbox, grade, grain, slow motion.
import * as THREE from 'three';
import { buildWorld, MOODS } from '../mnf/world.js';
import { Track } from '../mnf/script.js';
import { makeActor } from '../lushai/rig.js';
import './rig3.js';
import { emblemCanvas } from './rig3.js';
import { pose } from '../lushai/moves.js';
import { FX2 } from '../mnf/fx2.js';
import { heightAt, pathY, RIVER_Z } from '../mnf/terrain.js';
import { makeHeli, Flight } from './heli.js';
import { makeCompound, animateCompound, CPD, cy, BLD } from './compound.js';
import { CLEAR } from '../mnf/world.js';
import { ease, rng } from '../toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI, R = rng(2026);
const X = CPD.x, Z = CPD.z;

// ------------------------------------------------------------ scene
const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setSize(1280, 720);
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1280 / 720, 0.1, 4000);
const fx = new FX2();
// tracers for the door gun
fx.tracer = function (t, from, to) {
  const d = to.clone().sub(from);
  this.p.push({ t0: t, life: 0.14, pos: from.clone(), vel: d.multiplyScalar(1 / 0.14), g: 0, r0: 0.07, r1: 0.07, col: 0xffb040, a0: 1, a1: 1 });
};
for (let x = X - 30; x <= X + 30; x += 4) for (let z = Z - 34; z <= Z + 24; z += 4) CLEAR.push([x, z, 3]); // no bamboo inside / around the compound
CLEAR.push([-28, RIVER_Z - 3, 9], [-24, RIVER_Z - 10, 8]);
const world = buildWorld(scene);
world.town.post.visible = false;
MOODS.dawn = { ...MOODS.sunset, top: 0x48598c, horizon: 0xf3a46a, sunDir: [0.9, 0.12, -0.35], sun: 0xffd8a0, fog: 0xb58a7c };
MOODS.nightOps = { ...MOODS.night, top: 0x16204a, horizon: 0x34447a, bottom: 0x1c2444, fog: 0x26305a, fogDensity: 0.004, hemiSky: 0x8090c8, hemiGround: 0x1a2030, hemiI: 1.55, sunLight: 0xb8c8f4, sunI: 1.25, sunDir: [-0.4, 0.7, -0.5], sun: 0xe8eeff };
const cpd = makeCompound(scene);
const yc = cpd.y0;

// ------------------------------------------------------------ helicopters
const H1 = makeHeli(), H2 = makeHeli();
scene.add(H1.root, H2.root);
const T_LAND = 48.0, T_LIFT = 55.4;
const along = (x0, z0, x1, z1, n = 24, pad = 14) => { let m = -1e9; for (let i = 0; i <= n; i++) { const u = i / n; m = Math.max(m, heightAt(x0 + (x1 - x0) * u, z0 + (z1 - z0) * u)); } return m + pad; };
function flightKeys(dx, lag, hoverKey) {
  const pts = [[0, -4, -300], [10, -10, -170], [16, -18, -95], [20, -24, RIVER_Z], [24, -30, 20], [28.6, X, Z - 40]].map(([t, x, z]) => [t + lag, x + dx, z]);
  const keys = pts.map(([t, x, z], i) => {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    const low = i === 3 ? 8 : 14;
    return [t, x, Math.max(along(prev[1], prev[2], x, z, 20, low), along(x, z, next[1], next[2], 20, low), heightAt(x, z) + low), z];
  });
  return keys.concat(hoverKey);
}
const f1 = new Flight(flightKeys(0, 0, [[30.6, X, yc + 9.5, Z - 6, 0], [46.0, X, yc + 9.5, Z - 6, 0], [T_LAND, X, yc + 0.05, Z - 6, 0], [T_LIFT, X, yc + 0.05, Z - 6, 0],
  [58.0, X, yc + 14, Z - 12, 0], [61, X + 2, along(X, Z - 12, X + 2, Z - 50, 20, 22), Z - 50], [66, -20, along(X + 2, Z - 50, -20, -60, 20, 24), -60], [72, -12, along(-20, -60, -12, -180, 20, 24), -180], [80, -6, along(-12, -180, -6, -320, 20, 26), -320]]));
const f2 = new Flight(flightKeys(-14, 0.8, [[31.4, X - 15, yc + 15, Z - 10, -0.59], [58.4, X - 15, yc + 15, Z - 10, -0.59],
  [61.5, X - 12, along(X - 15, Z - 10, X - 12, Z - 55, 20, 24), Z - 55], [66.5, -34, along(X - 12, Z - 55, -34, -62, 20, 26), -62], [72.5, -26, along(-34, -62, -26, -185, 20, 26), -185], [80.5, -20, along(-26, -185, -20, -320, 20, 28), -320]]));
const heliWorld = (h, f, T, local) => { f.apply(h, T); h.body.updateMatrixWorld(true); return V(...local).applyMatrix4(h.body.matrixWorld); };

// ------------------------------------------------------------ cast
const actors = [];
const add = (kind, variant, weapon) => { const a = makeActor(kind, variant, weapon); a.phase = R() * 10; a.phaseSign = R() < 0.5 ? -1 : 1; a.track = new Track(); a.rides = []; scene.add(a.root); actors.push(a); return a; };
const blood = (t, p, dir = V(0, 0.2, -1), amt = 1.2) => { fx.blood(t, p.clone(), dir.clone().normalize(), amt); fx.blood(t + 0.15, p.clone().add(V(0, -0.3, 0)), dir.clone().normalize(), amt * 0.6); };
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// shoulder patch with the fictional emblem
const patchTex = new THREE.CanvasTexture(emblemCanvas(128)); patchTex.colorSpace = THREE.SRGBColorSpace;
const patchMat = new THREE.MeshBasicMaterial({ map: patchTex, transparent: true });
const addPatch = (a) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), patchMat); p.position.set(0.075, -0.1, 0); p.rotation.y = PI / 2; a.armL.add(p); };

// rangers: ride H1, fast-rope in, fight, rescue, exfil
const rangers = [];
for (let i = 0; i < 8; i++) { const a = add('ranger', i === 0 ? 'leader' : 'soldier'); addPatch(a); a.rides.push({ h: H1, f: f1, seat: H1.seats[i], from: -1, to: 31.0 + i * 0.45, mode: 'sitEdge' }); rangers.push(a); }
const gunner = add('ranger', 'gunner'); addPatch(gunner);
gunner.rides.push({ h: H2, f: f2, seat: [0.95, 0.66, 0.4, PI / 2], from: -1, to: 999, mode: 'sitEdge', fireMode: [[32.0, 58.4, 'gunnerFire']] });
const vip = add('vip', 'vip');

const hoverAnchor = (side) => V(X + side * 1.25, yc + 9.5 + 2.6, Z - 6 + 0.6);
const ROPE = 1.35;
const cover = [
  [X - 1.3, Z - 0.6, X, Z + 8], [X + 1.4, Z - 0.8, X, Z + 8], [X - 6, Z - 3.5, X - 13, Z - 13], [X + 6, Z - 3.5, X + 13, Z + 13],
  [X - 9, Z - 8.5, X - 13, Z + 13], [X + 9, Z - 9, X + 13, Z - 13], [X, Z - 11, X, Z - 20], [X - 4, Z - 10, X - 2, Z - 20],
];
rangers.forEach((a, i) => {
  const side = H1.seats[i][0] > 0 ? 1 : -1, t0 = a.rides[0].to, t1 = t0 + ROPE;
  const top = hoverAnchor(side);
  a.rope = { t0, t1, x: top.x, z: top.z, yTop: top.y - 1.4 };
  const [cx, cz, fx_, fz] = cover[i];
  a.track.at(t1, top.x, top.z, 'run').at(t1 + 0.9, cx, cz, 'kneelBurst', face(cx, cz, fx_, fz));
  a.cx = cx; a.cz = cz;
});
// breach team
const [R0, R1, R2] = rangers;
R0.track.at(40.0, X - 1.0, Z + 0.55, 'aim', 0).at(40.4, X - 0.35, Z + 0.55, 'plant', 0).at(41.0, X - 1.8, Z + 0.1, 'crouch', 0.4)
  .at(42.0, X - 0.2, Z + 1.2, 'run').at(43.0, X + 3.0, Z + 6.3, 'crouch', face(X + 3.0, Z + 6.3, X + 2, Z + 7.4))
  .at(46.4, X + 3.0, Z + 6.3, 'walk').at(47.6, X - 0.3, Z + 0.6, 'run').at(50.6, X - 1.6, Z - 6.4, 'run').at(51.0, X - 1.6, Z - 6.4, 'idle');
R1.track.at(40.2, X + 1.1, Z + 0.55, 'aim', 0).at(42.2, X + 0.3, Z + 1.2, 'run').at(43.1, X - 3.9, Z + 6.6, 'aim', 0.9)
  .at(46.6, X - 3.9, Z + 6.6, 'walk').at(47.9, X + 0.4, Z + 0.4, 'run').at(51.0, X - 1.0, Z - 6.8, 'run').at(51.2, X - 1.0, Z - 6.8, 'idle');
R2.track.at(41.9, R2.cx, R2.cz, 'run').at(42.6, X + 0.2, Z - 0.3, 'kneelBurst', PI * 0.9);
// boarding (back onto the sills of H1, which is on the ground)
const boardAt = [51.0, 51.2, 52.2, 53.0, 53.4, 54.6, 53.6, 54.0];
rangers.forEach((a, i) => {
  if (i > 1) { const s = H1.seats[i]; const dx = X + s[0] * 1.6, dz = Z - 6 + s[2]; a.track.at(boardAt[i] - 1.1, a.track.k[a.track.k.length - 1].x, a.track.k[a.track.k.length - 1].z, 'run').at(boardAt[i], dx, dz, 'idle'); }
  a.rides.push({ h: H1, f: f1, seat: H1.seats[i], from: boardAt[i], to: 999, mode: 'sitEdge' });
});
// R5 is hit crossing the yard, gets up and limps to the helicopter
const R5 = rangers[5];
R5.track.k = R5.track.k.filter((k) => k.t < 50.5);
R5.track.at(50.6, R5.cx, R5.cz, 'run').at(51.0, R5.cx - 1.2, R5.cz + 1.0, 'fallFwd', face(R5.cx, R5.cz, X, Z - 6)).at(52.3, R5.cx - 1.4, R5.cz + 1.2, 'walkTired').at(54.6, X + 1.5, Z - 5.2, 'idle');
blood(51.0, V(R5.cx - 1.2, yc + 0.9, R5.cz + 1.0), V(-1, 0.3, 0), 0.8);

// the VIP
vip.lift = 0.12;
vip.track.at(0, X + 2, Z + 7.4, 'sitChair', PI).at(44.9, X + 2, Z + 7.4, 'idle', PI).at(46.2, X + 2, Z + 7.0, 'walk').at(47.7, X, Z + 0.6, 'walk').at(51.0, X - 0.4, Z - 6.2, 'walk');
vip.rides.push({ h: H1, f: f1, seat: [0, 0.68, 0.6, PI], from: 51.0, to: 999, mode: 'sitFloor' });
vip.liftUntil = 44.9;

// ------------------------------------------------------------ the junta guards
const junta = [];
const H = CPD.half - 1;
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
  const a = add('junta', 'soldier'); a.lift = 4.7;
  const x = X + sx * H, z = Z + sz * H;
  a.track.at(0, x, z, 'look', face(x, z, X, Z)).at(31.6 + i * 0.3, x, z, 'autoFire', face(x, z, X, Z - 6));
  junta.push(a);
});
const patrol = [[X - 8, Z - 8, X + 8, Z - 8], [X + 8, Z - 3, X - 8, Z - 3]];
patrol.forEach(([x0, z0, x1, z1], i) => {
  const a = add('junta', i ? 'scared' : 'soldier');
  for (let t = 0, k = 0; t < 31; t += 7, k++) a.track.at(t, k % 2 ? x1 : x0, z0, 'walk');
  a.track.at(31.0, a.track.k[a.track.k.length - 1].x, z0, 'look').at(32.2 + i * 0.4, a.track.k[a.track.k.length - 1].x, z0, 'autoFire', face(0, 0, 0, -1) + (i ? 0.4 : -0.4));
  junta.push(a);
});
[[X - 2.2, Z - 12.4], [X + 2.2, Z - 12.4], [X - 1.6, Z + 0.2], [X + 1.6, Z + 0.2]].forEach(([x, z], i) => {
  const a = add('junta', i === 3 ? 'officer' : 'soldier');
  a.track.at(0, x, z, i < 2 ? 'idle' : 'look', i < 2 ? PI : PI).at(31.8 + i * 0.25, x, z, 'autoFire', face(x, z, X + (i % 2 ? 3 : -3), Z - 6));
  junta.push(a);
});
const deaths = [[0, 33.2], [1, 34.2], [4, 34.0], [5, 34.9], [6, 35.6], [2, 36.4], [7, 36.9], [3, 38.7], [8, 38.95], [9, 39.5]];
const posAt = (a, T) => { const s = a.track.sample(T); return V(s.x, heightAt(s.x, s.z) + (a.lift ?? 0), s.z); };
deaths.forEach(([i, t]) => { const a = junta[i]; a.track.finalize(); const s = a.track.sample(t); a.track.at(t, s.x, s.z, R() < 0.5 ? 'fall' : 'fallFwd'); a.td = t; blood(t, posAt(a, t).add(V(0, 0.9, 0)), V(Math.sin(s.ry + PI), 0.2, Math.cos(s.ry + PI))); });
cpd.towers[3].burnAt = 38.8; fx.explosion(38.75, cpd.towers[3].top.clone().add(V(0, 0.6, 0)), 0.7);
fx.smokeColumn(39.2, 90, () => cpd.towers[3].top.clone().add(V(0, 2.5, 0)), 2);
// reinforcements through the gate
for (let i = 0; i < 3; i++) {
  const a = add('junta', 'soldier');
  const x = X - 2 + i * 2, tx = X - 3 + i * 3, tz = Z - 11.5 - (i % 2);
  a.track.at(0, x, Z - 26, 'idle', 0).at(53.0, x, Z - 26, 'run').at(54.4, tx, tz, 'autoFire', face(tx, tz, X, Z - 6));
  const td = 55.2 + i * 0.4; a.track.at(td, tx, tz, 'fall'); a.td = td; blood(td, V(tx, yc + 0.9, tz), V(0, 0.2, -1));
  a.vis = [52.5, 999];
  junta.push(a);
}
// the breach
fx.explosion(41.6, V(X, yc + 1.2, Z + 0.9), 0.55);

// ------------------------------------------------------------ gunfire, derived from the choreography
actors.forEach((a) => { if (!a.track.k.length) a.track.at(0, 0, -900, 'idle'); a.track.finalize(); });
const FIRE = { kneelBurst: 1, autoFire: 1 };
const aliveAt = (list, T) => list.filter((a) => !(a.td && T >= a.td) && !(a.vis && T < a.vis[0]));
for (const a of [...rangers, ...junta]) {
  let next = 0, burst = 0;
  for (let T = 31; T < 57; T += 0.03) {
    if (a.rides.some((r) => T >= r.from && T < r.to)) continue;
    const s = a.track.sample(T);
    if (!FIRE[s.mode] || s.mt < 0.35 || (a.td && T >= a.td) || T < next) continue;
    const foes = a.kind === 'ranger' ? aliveAt(junta, T) : [...rangers];
    if (!foes.length) continue;
    const target = posAt(foes[Math.floor(R() * foes.length)], T).add(V(0, 0.9, 0));
    const kneel = s.mode.startsWith('kneel');
    const base = V(s.x, heightAt(s.x, s.z) + (a.lift ?? 0) + (kneel ? 0.75 : 1.05), s.z);
    const dir = target.clone().sub(base).normalize();
    const muzzle = base.clone().addScaledVector(dir, 1.2);
    fx.shot(T, muzzle, dir, false);
    if (a.kind === 'ranger') { // suppressed: small flash
      fx.p[fx.p.length - 2].r0 = 0.1; fx.p[fx.p.length - 2].r1 = 0.14;
    }
    const miss = target.clone().add(V((R() - 0.5) * 2, (R() - 0.5) * 1.2, (R() - 0.5) * 2));
    if (miss.y < heightAt(miss.x, miss.z) + 0.5) fx.dust(T + 0.05, V(miss.x, heightAt(miss.x, miss.z), miss.z)); else fx.spark(T + 0.05, miss);
    if (burst <= 0) burst = 2 + Math.floor(R() * 3); burst--;
    next = T + (burst > 0 ? 0.12 : 0.6 + R() * 0.9);
  }
}
// door gun: bursts at the towers, then the reinforcements
const gunTargets = [[32.4, 33.3, () => posAt(junta[0], 33)], [33.6, 34.3, () => posAt(junta[1], 34)], [37.8, 38.8, () => cpd.towers[3].top], [54.6, 56.4, () => V(X, yc + 0.8, Z - 12)]];
for (const [t0, t1, tgt] of gunTargets) {
  for (let T = t0; T < t1; T += 0.04) {
    const from = heliWorld(H2, f2, T, [1.6, 1.75, 0.4]);
    const to = tgt().clone().add(V((R() - 0.5) * 2.2, (R() - 0.5) * 1.2, (R() - 0.5) * 2.2));
    fx.tracer(T, from, to); fx.shot(T, from, to.clone().sub(from).normalize(), true);
    if (R() < 0.4) fx.dust(T + 0.12, V(to.x, heightAt(to.x, to.z), to.z));
  }
}
fx.build(scene);

// ------------------------------------------------------------ the cut (screen time -> story time)
const C_ = (pos, look, fov = 42) => ({ pos, look, fov });
const L = (a, b, k) => ({ pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: a.fov + (b.fov - a.fov) * k });
const hpos = (f, T) => f.pos(T);
const SHOTS = [
  { name: 'Disclaimer', s: [0, 0.01], dur: 4.5, card: 'disclaimer', mood: 'nightOps', cam: () => C_(V(0, 200, -300), V(0, 0, 0)) },
  { name: 'Flight', s: [0, 10], dur: 9, mood: 'nightOps', loc: 'CHAMPHAI, MIZORAM — 0200 HRS', title: true,
    cam: (T, k) => { const p = hpos(f1, T); return C_(p.clone().add(V(-10 + 3 * k, 3.5, -15 + 4 * k)), p.clone().add(V(0, 0.5, 12)), 46); } },
  { name: 'Cabin', s: [10, 16], dur: 6, mood: 'nightOps', subs: [[0.6, 5.6, 'Team leader', 'Twelve minutes. In, grab the package, out. Nobody gets left behind.']],
    cam: (T, k) => { f1.apply(H1, T); const m = H1.body.matrixWorld; return C_(V(3.6, 1.9, 0.9 - 0.4 * k).applyMatrix4(m), V(0.6, 1.4, 0.2).applyMatrix4(m), 50); } },
  { name: 'River', s: [17.6, 21.6], dur: 5, mood: 'nightOps', loc: 'TIAU RIVER — INDIA / MYANMAR BORDER',
    cam: (T, k) => { const y = heightAt(-27, RIVER_Z - 4); return C_(V(-27, y + 3.0, RIVER_Z - 6), hpos(f1, Math.min(T, 20.6)).add(V(0, -1, 0)), 64); } },
  { name: 'Target', s: [24, 30], dur: 6, mood: 'nightOps', loc: 'TARGET COMPOUND — 0214 HRS',
    cam: (T, k) => L(C_(V(X + 20, yc + 13, Z - 25), V(X, yc + 2, Z), 46), C_(V(X + 16, yc + 9, Z - 21), V(X, yc + 2.5, Z + 1), 42), ease.inOut(k)) },
  { name: 'Rotor Wash', s: [30.0, 31.7], dur: 3.5, mood: 'nightOps',
    cam: (T, k) => { const g = junta[4], s = g.track.sample(T), x = s.x, z = s.z; return C_(V(x + 1.3, yc + 1.05, z - 2.8), V(x, yc + 1.7, z), 40 - 4 * k); } },
  { name: 'Fast Rope', s: [30.9, 33.4], dur: 6, mood: 'nightOps',
    cam: (T, k) => L(C_(V(X + 7, yc + 2.2, Z - 13), V(X, yc + 6.5, Z - 6), 54), C_(V(X + 6.5, yc + 2.0, Z - 12.5), V(X, yc + 3.5, Z - 6), 52), k) },
  { name: 'NVG', s: [33.4, 37.6], dur: 5, mood: 'nightOps', nvg: true, handheld: 1, subs: [[0.6, 4.4, 'Ranger', 'Tower two down! Moving!']],
    cam: (T, k) => L(C_(V(X - 3, yc + 1.4, Z - 13), V(X - 1, yc + 2.6, Z + 4), 50), C_(V(X - 4, yc + 1.5, Z - 12), V(X - 2, yc + 2.8, Z + 4), 50), k) },
  { name: 'Door Gun', s: [37.6, 39.0], dur: 4, mood: 'nightOps', handheld: 0.6,
    cam: (T, k) => { f2.apply(H2, T); const m = H2.body.matrixWorld; return C_(V(2.4, 2.7, -2.2).applyMatrix4(m), cpd.towers[3].top.clone(), 46); } },
  { name: 'Breach', s: [40.0, 42.3], dur: 5, mood: 'nightOps', slowFrom: [41.3, 41.9],
    cam: (T, k) => C_(V(X + 3.8, yc + 1.5, Z - 1.6), V(X, yc + 1.3, Z + 1), 44) },
  { name: 'The Room', s: [42.3, 46.6], dur: 8.5, mood: 'nightOps', interior: true,
    subs: [[1.2, 4.6, 'Team leader', 'Ma’am — Mizo Rangers. We’re here to take you home.'], [5.0, 8.2, 'She', 'Then let us not keep them waiting.']],
    cam: (T, k) => L(C_(V(X - 3.6, yc + 1.55, Z + 3.0), V(X + 2, yc + 1.0, Z + 7.4), 44), C_(V(X - 2.4, yc + 1.4, Z + 3.6), V(X + 1.8, yc + 1.25, Z + 7.2), 36), ease.inOut(k)) },
  { name: 'Exfil', s: [46.6, 52.6], dur: 7, mood: 'nightOps', handheld: 1, subs: [[3.4, 6.6, 'Ranger', 'Man down! I got him — keep moving!']],
    cam: (T, k) => { const s = vip.track.sample(Math.min(T, 50.9)); return C_(V(X - 6.5 + 1.5 * k, yc + 1.7, Z - 1.5 - 2 * k), V(s.x, yc + 1.0, s.z), 50); } },
  { name: 'Lift Off', s: [53.2, 59.2], dur: 7, mood: 'nightOps', handheld: 0.5, subs: [[1.0, 5.6, 'Pilot', 'Package aboard! Pulling pitch!']],
    cam: (T, k) => C_(V(X + 10, yc + 1.8, Z - 11.5), hpos(f1, T).add(V(0, 1.5, 0)), 52) },
  { name: 'Dawn', s: [64, 76], dur: 9, mood: 'dawn', subs: [[1.5, 7.5, 'Pilot', 'Package secure. Bringing her home.']],
    cam: (T, k) => { const p = hpos(f1, T); return C_(p.clone().add(V(11 - 4 * k, 3, 9)), p.clone().add(V(-3, 0, -8)), 46); } },
  { name: 'End', s: [76, 76.01], dur: 6.5, card: 'end', mood: 'dawn', cam: (T) => { const p = hpos(f1, 76); return C_(p.clone().add(V(7, 3, 9)), p.clone().add(V(-3, 0, -8)), 46); } },
];
let acc = 0; for (const s of SHOTS) { s.start = acc; acc += s.dur; }
const TOTAL = acc;
const clamp = (x) => Math.max(0, Math.min(1, x));
function storyOf(t) {
  let i = 0; for (let j = SHOTS.length - 1; j >= 0; j--) if (t >= SHOTS[j].start) { i = j; break; }
  const shot = SHOTS[i], lt = t - shot.start, k = clamp(lt / shot.dur);
  let T = shot.s[0] + (shot.s[1] - shot.s[0]) * k;
  if (shot.slowFrom) { // piecewise: normal, then slow motion over the marked range
    const [a, b] = shot.slowFrom, [s0, s1] = shot.s, D = shot.dur;
    const n1 = (a - s0), n3 = (s1 - b), slowDur = D - n1 - n3;
    T = lt < n1 ? s0 + lt : lt < n1 + slowDur ? a + (b - a) * ((lt - n1) / slowDur) : b + (lt - n1 - slowDur);
  }
  return { i, shot, lt, k, T };
}

// ------------------------------------------------------------ per-frame scene
const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), tmp = new THREE.Vector3();
const ropes = [-1, 1].map(() => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), new THREE.MeshToonMaterial({ color: 0x2a2a2a })); scene.add(r); return r; });
function scene3d(T, shot, k, tScreen) {
  world.applyMood(MOODS[shot.mood]);
  f1.apply(H1, T); f2.apply(H2, T);
  H1.beam.visible = T > 28 && T < 46; H2.beam.visible = T > 29 && T < 58;
  animateCompound(cpd, T);
  cpd.door.visible = T < 41.62;
  cpd.int.visible = !!shot.interior; cpd.ext.visible = !shot.interior;
  // ropes hang from H1 while the team slides
  ropes.forEach((r, i) => { const side = i ? 1 : -1, top = hoverAnchor(side); r.visible = T > 30.7 && T < 36.5; r.position.set(top.x, (top.y + yc) / 2, top.z); r.scale.y = top.y - yc; });

  const c = shot.cam(T, k);
  camera.position.copy(c.pos);
  const hh = shot.handheld ?? 0.25;
  camera.position.x += (Math.sin(tScreen * 1.7) * 0.04 + Math.sin(tScreen * 5.3) * 0.015) * hh * 2;
  camera.position.y += (Math.sin(tScreen * 2.3) * 0.03 + Math.sin(tScreen * 7.1) * 0.012) * hh * 2;
  const sh = fx.shake(T); if (sh > 0) { camera.position.x += Math.sin(T * 91) * sh; camera.position.y += Math.cos(T * 77) * sh; }
  camera.lookAt(c.look); camera.fov = c.fov; camera.updateProjectionMatrix();

  for (const a of actors) {
    if (a.vis && T < a.vis[0]) { a.root.visible = false; continue; }
    const ride = a.rides.find((r) => T >= r.from && T < r.to);
    if (ride) {
      const [lx, ly, lz, lr] = ride.seat;
      tmp.set(lx, ly, lz).applyMatrix4(ride.h.body.matrixWorld);
      a.root.position.copy(tmp);
      a.root.quaternion.setFromRotationMatrix(m4.extractRotation(ride.h.body.matrixWorld)).multiply(q.setFromEuler(e.set(0, lr, 0)));
      const fm = ride.fireMode?.find(([t0, t1]) => T >= t0 && T < t1);
      pose(a, fm ? fm[2] : ride.mode, T, T + a.phase);
      a.root.visible = true; continue;
    }
    if (a.rope && T >= a.rope.t0 && T < a.rope.t1) {
      const u = ease.inOut((T - a.rope.t0) / (a.rope.t1 - a.rope.t0));
      a.root.quaternion.identity(); a.root.position.set(a.rope.x, a.rope.yTop + (yc - a.rope.yTop) * u, a.rope.z); a.root.rotation.set(0, PI, 0);
      pose(a, 'rope', T, T + a.phase); a.root.visible = true; continue;
    }
    const s = a.track.sample(T);
    const near = Math.hypot(s.x - camera.position.x, s.z - camera.position.z) < 200;
    a.root.visible = near; if (!near) continue;
    const lift = (a.lift ?? 0) * (a.liftUntil === undefined || T < a.liftUntil ? 1 : 0);
    a.root.quaternion.identity(); a.root.position.set(s.x, heightAt(s.x, s.z) + lift, s.z); a.root.rotation.set(0, s.ry, 0);
    pose(a, s.mode, s.mt, T + a.phase);
  }
  fx.update(T);
  world.update(T, camera);
  renderer.render(scene, camera);
}

// ------------------------------------------------------------ grade, letterbox, cards, reel
const W = 1280, Hh = 720, BAR = 92;
const grain = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
{ const gg = grain.getContext('2d'), id = gg.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gg.putImageData(id, 0, 0); }
const emblem = emblemCanvas(512);
const wide = Object.assign(document.createElement('canvas'), { width: W, height: Hh });
const reel = Object.assign(document.createElement('canvas'), { width: 720, height: 1280 });

function grade(g, T, shot, t) {
  g.save();
  g.filter = shot.nvg ? 'grayscale(1) brightness(1.9) contrast(1.25) sepia(1) hue-rotate(58deg) saturate(2.6)'
    : shot.mood === 'dawn' ? 'contrast(1.12) saturate(0.9) sepia(0.12)' : 'contrast(1.15) saturate(0.75) brightness(1.22)';
  g.drawImage(renderer.domElement, 0, 0, W, Hh); g.restore();
  if (!shot.nvg) { g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = shot.mood === 'dawn' ? 'rgba(255,150,70,0.25)' : 'rgba(30,70,110,0.3)'; g.fillRect(0, 0, W, Hh); g.restore(); }
  const v = g.createRadialGradient(W / 2, Hh / 2, Hh * (shot.nvg ? 0.25 : 0.35), W / 2, Hh / 2, Hh * (shot.nvg ? 0.62 : 0.95));
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, shot.nvg ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0.55)'); g.fillStyle = v; g.fillRect(0, 0, W, Hh);
  const flash = Math.max(0, 1 - Math.abs(T - 41.6) / 0.1) * 0.8 + Math.max(0, 1 - Math.abs(T - 38.75) / 0.1) * 0.3;
  if (flash > 0) { g.fillStyle = `rgba(255,245,220,${flash})`; g.fillRect(0, 0, W, Hh); }
  g.save(); g.globalAlpha = shot.nvg ? 0.16 : 0.07; g.globalCompositeOperation = 'overlay';
  const ox = (Math.floor(t * 24) * 97) % 256, oy = (Math.floor(t * 24) * 57) % 256;
  for (let x = -ox; x < W; x += 256) for (let y = -oy; y < Hh; y += 256) g.drawImage(grain, x, y);
  g.restore();
}
function subtitle(g, shot, lt, x, y, size, maxW) {
  for (const [a, b, who, line] of shot.subs ?? []) {
    const al = Math.min(clamp((lt - a) / 0.3), clamp((b - lt) / 0.3)); if (al <= 0) continue;
    g.save(); g.globalAlpha = al; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 600 ${size}px "DejaVu Serif", Georgia, serif`; g.lineWidth = size * 0.18; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.fillStyle = '#f3efe6';
    const txt = `${who}: “${line}”`; g.strokeText(txt, x, y, maxW); g.fillText(txt, x, y, maxW); g.restore();
  }
}
function card(g, kind, lt, dur, cx, cy, size, wrapW) {
  g.fillStyle = '#000'; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  const a = Math.min(clamp((lt - 0.4) / 0.6), clamp((dur - 0.3 - lt) / 0.5));
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#efe9dc';
  const lines = kind === 'disclaimer'
    ? ['THE FOLLOWING IS A WORK OF FICTION', 'made purely for entertainment.', '', '“Operation Freedom”, the “Mizo Rangers” and every event shown', 'are imaginary. No such operation has taken place.']
    : ['FICTION — Operation Freedom never happened.', '', 'Aung San Suu Kyi, Myanmar’s former State Counsellor,', 'was detained by the military after the February 2021 coup.', '', 'All units, insignia and dialogue are invented.'];
  const wrap = (txt) => { const out = []; let l = ''; for (const w of txt.split(' ')) { const s = l ? l + ' ' + w : w; g.font = `600 ${size}px "DejaVu Serif", Georgia, serif`; if (g.measureText(s).width > wrapW && l) { out.push(l); l = w; } else l = s; } out.push(l); return out; };
  const all = lines.flatMap((l) => (l ? wrap(l) : ['']));
  all.forEach((l, i) => { g.font = `${i === 0 ? 800 : 500} ${size}px "DejaVu Serif", Georgia, serif`; g.fillText(l, cx, cy + (i - (all.length - 1) / 2) * size * 1.55); });
  g.restore();
}
function compose(t) {
  const { i, shot, lt, k, T } = storyOf(t);
  const g = wide.getContext('2d');
  if (shot.card) card(g, shot.card, lt, shot.dur, W / 2, Hh / 2, 24, W - 260);
  else {
    scene3d(T, shot, k, t);
    grade(g, T, shot, t);
    const fa = clamp(Math.max(i === 1 ? 1 - lt / 1.5 : 0, lt < 0.05 ? 0 : 0));
    if (fa > 0) { g.fillStyle = `rgba(0,0,0,${fa})`; g.fillRect(0, 0, W, Hh); }
    if (shot.nvg) { g.save(); g.font = '600 18px "DejaVu Sans Mono", monospace'; g.fillStyle = 'rgba(190,255,190,0.8)'; g.fillText('NV  ●REC  02:16:4' + Math.floor(lt % 10), 120, BAR + 40); g.restore(); }
  }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, BAR); g.fillRect(0, Hh - BAR, W, BAR);
  if (shot.loc) {
    const a = Math.min(clamp((lt - 1.0) / 0.5), clamp((shot.dur - 0.5 - lt) / 0.5)), n = Math.floor(clamp((lt - 1.0) / 1.4) * shot.loc.length);
    g.save(); g.globalAlpha = a; g.font = '600 24px "DejaVu Sans Mono", monospace'; g.fillStyle = '#efe9dc'; g.textBaseline = 'middle'; g.fillText(shot.loc.slice(0, n), 70, Hh - BAR - 40); g.restore();
  }
  if (shot.title) {
    const ta = Math.min(clamp((lt - 3.4) / 0.8), clamp((shot.dur - 0.6 - lt) / 0.6));
    if (ta > 0) {
      g.save(); g.globalAlpha = ta; g.drawImage(emblem, W / 2 - 340, Hh / 2 - 100, 170, 170);
      g.textAlign = 'left'; g.fillStyle = '#efe9dc'; g.font = '800 76px "DejaVu Serif", Georgia, serif'; g.fillText('OPERATION', W / 2 - 150, Hh / 2 - 20);
      g.fillText('FREEDOM', W / 2 - 150, Hh / 2 + 56); g.restore();
    }
  }
  subtitle(g, shot, lt, W / 2, Hh - BAR / 2, 24, W - 80);

  // vertical reel
  const r = reel.getContext('2d'), RW = 720, RH = 1280;
  const bg = r.createRadialGradient(RW / 2, RH * 0.6, 40, RW / 2, RH * 0.6, RH * 0.75);
  bg.addColorStop(0, '#7a1e26'); bg.addColorStop(0.55, '#4a1218'); bg.addColorStop(1, '#1e0709');
  r.fillStyle = bg; r.fillRect(0, 0, RW, RH);
  const bandH = Hh - 2 * BAR, ph = Math.round(RW * bandH / W), py0 = 440;
  r.drawImage(wide, 0, BAR, W, bandH, 0, py0, RW, ph);
  r.font = '700 42px "DejaVu Sans", Arial, sans-serif'; r.textAlign = 'center'; r.textBaseline = 'middle';
  const TITLE = ['Operation Freedom | Mizo', 'Rangers Rescue Mission', '(Fiction)'];
  TITLE.forEach((l, j) => { const w = r.measureText(l).width + 40; r.fillStyle = '#fff'; r.beginPath(); r.roundRect(RW / 2 - w / 2, 230 + j * 60 - 32, w, 64, 12); r.fill(); });
  r.fillStyle = '#111'; TITLE.forEach((l, j) => r.fillText(l, RW / 2, 232 + j * 60));
  subtitle(r, shot, lt, RW / 2, py0 + ph + 56, 24, RW - 40);
  return [wide.toDataURL('image/jpeg', 0.92), reel.toDataURL('image/jpeg', 0.92)];
}
window.__compBoth = compose;
window.__film = { TOTAL, SHOTS };
if (!new URLSearchParams(location.search).has('still')) {
  const view = document.createElement('canvas'); view.width = W; view.height = Hh; stageEl.appendChild(view); renderer.domElement.style.display = 'none';
  const t0 = performance.now();
  (function loop() { const t = ((performance.now() - t0) / 1000) % TOTAL; compose(t); view.getContext('2d').drawImage(wide, 0, 0); requestAnimationFrame(loop); })();
}
