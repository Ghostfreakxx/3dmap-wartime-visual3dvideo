// The film: cast, choreography (keyframed tracks in global time), effects events and shots.
import * as THREE from 'three';
import { makeActor, makeHeadPole, makeTrophyHead } from './rig.js';
import { heightAt, pathY, VILLAGE, villageY } from './terrain.js';
import { CLEAR, SAHLAM } from './world.js';
import { rng } from '../toon.js';

const C = THREE;
const V = (x, y, z) => new C.Vector3(x, y, z);
const PI = Math.PI;
const R = rng(2024);

// ------------------------------------------------------------------ timing
export const T_VOLLEY1 = 43.0, T_REDFIRE = 45.2, T_VOLLEY2 = 47.0, T_CHARGE = 51.0;
export const T_CHOP = 68.35, T_HANG = 77.6;

// ------------------------------------------------------------------ actor tracks
/** keyframes: { t, x, z, ry?, mode?, jump? } (global time). Missing ry => face the direction of travel. */
class Track {
  constructor(actor) { this.a = actor; this.k = []; }
  at(t, x, z, mode, ry) { this.k.push({ t, x, z, mode, ry }); return this; }
  /** teleport (scene cut): hold the previous spot until t, then appear at x,z */
  jump(t, x, z, mode, ry) { this.k.push({ t, x, z, mode, ry, jump: true }); return this; }
  finalize() {
    this.k.sort((a, b) => a.t - b.t);
    for (let i = this.k.length - 1; i > 0; i--) {
      const k = this.k[i];
      if (k.jump) { const p = this.k[i - 1]; this.k.splice(i, 0, { t: k.t - 0.001, x: p.x, z: p.z, mode: p.mode, ry: p.ry }); k.jump = false; }
    }
    let mode = 'idle', mt = 0, ry = 0;
    for (let i = 0; i < this.k.length; i++) {
      const k = this.k[i], n = this.k[i + 1];
      if (k.mode) { if (k.mode !== mode) mt = k.t; mode = k.mode; }
      k.mode = mode; k.mt = mt;
      if (k.ry === undefined) {
        if (n && Math.hypot(n.x - k.x, n.z - k.z) > 0.05 && n.t - k.t > 0.01) ry = Math.atan2(n.x - k.x, n.z - k.z);
        k.ry = ry;
      } else ry = k.ry;
    }
    return this;
  }
  sample(T) {
    const K = this.k;
    let i = 0;
    while (i < K.length - 1 && K[i + 1].t <= T) i++;
    const a = K[i], b = K[i + 1];
    let x = a.x, z = a.z, ry = a.ry;
    if (b && T > a.t) {
      const u = Math.min(1, (T - a.t) / (b.t - a.t));
      x = a.x + (b.x - a.x) * u; z = a.z + (b.z - a.z) * u;
      // turn toward the next facing quickly
      let d = b.ry - a.ry; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI;
      ry = a.ry + d * Math.min(1, (T - a.t) / 0.35);
    }
    return { x, z, ry, mode: a.mode, mt: Math.max(0, T - a.mt) };
  }
}

export function buildCast(scene, fx) {
  const actors = [];
  const add = (kind, variant, weapon) => {
    const a = makeActor(kind, variant, weapon);
    a.phase = R() * 10; a.phaseSign = R() < 0.5 ? -1 : 1;
    a.track = new Track(a);
    scene.add(a.root); actors.push(a);
    return a;
  };

  // ---------------- the redcoat column
  const N = 26;
  const reds = [];
  const xStop = (k) => 18 - k * 1.7;
  for (let k = 0; k < N; k++) {
    const a = add('redcoat', k === 2 ? 'officer' : 'soldier');
    a.k = k;
    a.z0 = (k % 2 ? 0.45 : -0.45) + (R() - 0.5) * 0.2;
    a.xs = xStop(k);
    a.track.at(0, a.xs - 43, a.z0, k % 3 ? 'walk' : 'walkTired', PI / 2).at(43, a.xs, a.z0, 'look', PI / 2);
    reds.push(a);
  }
  const red = (k) => reds[k];
  const redPos = (a, y = 0) => V(a.xs, heightAt(a.xs, a.z0) + y, a.z0);
  const V1 = [4, 8, 12, 17, 21], V2 = [1, 6, 10, 14, 19, 24];
  const FLEE = [22, 23, 25];
  const killedBy = new Map(); // redcoat -> time of death

  V1.forEach((k, j) => { const t = T_VOLLEY1 + 0.15 + j * 0.06; red(k).track.at(t, red(k).xs, red(k).z0, j % 2 ? 'fall' : 'fallFwd'); killedBy.set(k, t); fx.blood(t, redPos(red(k), 1.0), V(0, 0, -1), 0.6); });
  for (const a of reds) if (!V1.includes(a.k)) {
    a.track.at(T_VOLLEY1 + 0.9, a.xs, a.z0, a.k === 2 ? 'pointSword' : 'aim', 0.12 * (R() - 0.5));
    if (a.k !== 2) a.track.at(T_REDFIRE, a.xs, a.z0, 'fire').at(T_REDFIRE + 0.9, a.xs, a.z0, 'reload');
  }
  for (const a of reds) if (!V1.includes(a.k) && a.k !== 2) fx.musket(T_REDFIRE + 0.01, redPos(a, 1.15).add(V(0, 0, 1.25)), V(0, 0.15, 1).normalize());
  V2.forEach((k, j) => { const t = T_VOLLEY2 + 0.15 + j * 0.07; red(k).track.at(t, red(k).xs, red(k).z0, j % 2 ? 'fallFwd' : 'fall'); killedBy.set(k, t); fx.blood(t, redPos(red(k), 1.0), V(0, 0, -1), 0.6); });

  // ---------------- the warriors
  const warriors = [];
  const hide = [];
  // musketeers low on the slope, dao men further up
  for (let i = 0; i < 12; i++) hide.push([-19 + i * 3.5 + (R() - 0.5), 6.2 + R() * 1.6]);
  for (let i = 0; i < 18; i++) hide.push([-22 + i * 2.6 + (R() - 0.5), 8.5 + R() * 2.2]);
  for (let i = 0; i < 4; i++) hide.push([-30 + i * 2.2, 7 + R()]);
  hide[12] = [3.0, 9.6]; // the chief
  hide.forEach(([x, z]) => CLEAR.push([x, z, 1.1]));
  CLEAR.push([3.0, 9.6, 2.6], [4.5, 8, 2.2], [5.5, 11.5, 2.4]); // S5 camera move

  for (let i = 0; i < 34; i++) {
    const musket = i < 12, spear = i >= 30;
    const variant = i === 12 ? 'chief' : (i % 3 === 0 ? 'veteran' : 'brave');
    const a = add('warrior', variant, musket ? 'musket' : spear ? 'spear' : 'dao');
    a.i = i;
    const [x, z] = hide[i];
    a.hx = x; a.hz = z;
    a.track.at(0, x, z, 'crouch', PI + (R() - 0.5) * 0.3);
    warriors.push(a);
  }
  const W = (i) => warriors[i];
  const wPos = (a, y = 0) => V(a.hx, heightAt(a.hx, a.hz) + y, a.hz);

  // S2: three men plant panji spikes by the path, then slip back into cover
  [[15, 9.5, 2.75], [16, 12.0, -2.75], [17, 14.3, 2.8]].forEach(([i, x, z]) => {
    W(i).track.k = [];
    W(i).track.at(0, x, z, 'plant', z > 0 ? PI : 0).jump(16.0, W(i).hx, W(i).hz, 'crouch', PI);
  });
  // chief gives the signal
  W(12).track.at(41.2, W(12).hx, W(12).hz, 'signal', PI);
  // musket volleys from cover
  for (let i = 0; i < 12; i++) {
    const a = W(i);
    a.track.at(T_VOLLEY1 - 0.02, a.hx, a.hz, 'crouchAim', PI);
    const dir = V(0, -0.35, -1).normalize();
    fx.musket(T_VOLLEY1 + (R() - 0.5) * 0.12, wPos(a, 0.85).add(V(0, 0, -1.2)), dir);
    if (i !== 5 && i !== 9) fx.musket(T_VOLLEY2 + (R() - 0.5) * 0.12, wPos(a, 0.85).add(V(0, 0, -1.2)), dir);
  }
  // two warriors hit by the British volley
  [5, 9].forEach((i, j) => { const t = T_REDFIRE + 0.25 + j * 0.1; W(i).track.at(t, W(i).hx, W(i).hz, 'fall'); fx.blood(t, wPos(W(i), 0.8), V(0, 0, 1), 0.5); });

  // ---------------- the charge: dao men fall on the survivors
  const alive = reds.filter((a) => !V1.includes(a.k) && !V2.includes(a.k) && !FLEE.includes(a.k));
  const attackers = [];
  for (let i = 12; i < 30; i++) attackers.push(W(i));
  const victimTime = new Map();
  attackers.forEach((w, j) => {
    const v = alive[j % alive.length];
    const side = j >= alive.length ? -1 : 1;
    const tx = v.xs + side * 0.55, tz = v.z0 + 1.05;
    const start = T_CHARGE + j * 0.06 + R() * 0.3;
    const dist = Math.hypot(tx - w.hx, tz - w.hz);
    const arrive = start + dist / 4.2;
    w.track.at(start, w.hx, w.hz, 'charge').at(arrive, tx, tz, 'strike', Math.atan2(v.xs - tx, v.z0 - tz));
    w.target = v; w.arrive = arrive; w.tx = tx; w.tz = tz;
    if (!victimTime.has(v.k) || arrive < victimTime.get(v.k)) victimTime.set(v.k, arrive);
  });
  // survivors brace with bayonets, then die
  alive.forEach((v, j) => {
    const first = victimTime.get(v.k);
    if (v.k === 2) { // the officer fights longest
      v.track.at(first - 0.8, v.xs, v.z0, 'sword', 0);
      const td = 59.6;
      v.track.at(td, v.xs, v.z0, 'fall', 0); killedBy.set(v.k, td); fx.blood(td, redPos(v, 1.0), V(0, 0.2, -1), 1.3);
      return;
    }
    v.track.at(first - 1.2, v.xs, v.z0, 'bayonet', 0.1 * (R() - 0.5));
    const td = first + 0.45 + R() * 1.6;
    v.track.at(td, v.xs, v.z0, R() < 0.5 ? 'fall' : 'fallFwd'); killedBy.set(v.k, td);
    fx.blood(td, redPos(v, 1.0), V((R() - 0.5), 0.2, -1).normalize(), 1.1);
    fx.blood(td + 0.25, redPos(v, 0.6), V(0, 0, -1), 0.6);
  });
  // attackers stop striking once their man is down, then cheer over the dead
  attackers.forEach((w, j) => {
    const td = killedBy.get(w.target.k);
    w.track.at(Math.max(td + 0.45, w.arrive + 0.6), w.tx, w.tz, 'idle').at(61 + R() * 0.8, w.tx, w.tz, 'cheer');
  });
  // the runners: three redcoats break and are hunted down by spearmen
  FLEE.forEach((k, j) => {
    const a = red(k);
    const t0 = 53.4 + j * 0.3, tc = 57.6 + j * 0.45;
    const x1 = a.xs - 3.0 * (tc - t0);
    a.track.at(t0, a.xs, a.z0, 'flee', -PI / 2).at(tc, x1, a.z0 * 0.5, 'fallFwd', -PI / 2);
    killedBy.set(k, tc); a.xs = x1; a.z0 *= 0.5;
    fx.blood(tc, redPos(a, 1.0), V(-1, 0.3, 0).normalize(), 1.0);
    const s = W(30 + j);
    s.track.at(T_CHARGE + 0.4 + j * 0.2, s.hx, s.hz, 'charge').at(tc - 0.35, x1 + 0.9, a.z0 + 0.3, 'strike', -PI / 2).at(tc + 0.5, x1 + 0.9, a.z0 + 0.3, 'idle').at(61.5, x1 + 0.9, a.z0 + 0.3, 'cheer');
  });
  W(33).track.at(T_CHARGE + 0.8, W(33).hx, W(33).hz, 'charge').at(T_CHARGE + 4, -14, 1.2, 'idle').at(61.3, -14, 1.2, 'cheer');
  // musketeers rise and cheer
  for (let i = 0; i < 12; i++) if (i !== 5 && i !== 9) W(i).track.at(61 + R(), W(i).hx, W(i).hz, 'cheer', PI);

  // ---------------- S8: the head-taking, silhouetted at sunset
  const victim = red(0);
  const exe = W(14);
  victim.track.jump(63.9, victim.xs - 1.0, -0.6, 'deadFwd', PI / 2);
  exe.track.jump(63.9, victim.xs + 0.3, -1.55, 'idle', 0).at(65.3, victim.xs + 0.3, -1.55, 'raiseDao', 0).at(T_CHOP, victim.xs + 0.3, -1.55, 'chop', 0);
  fx.blood(T_CHOP + 0.08, V(victim.xs + 0.3, heightAt(victim.xs, -0.6) + 0.15, -0.6), V(0, 0.6, 1).normalize(), 1.6);
  CLEAR.push([victim.xs, -7, 7], [victim.xs + 0.5, 3.2, 4.2]);
  for (let x = -36; x <= -12; x += 2.5) CLEAR.push([x, -6.2, 2.4]); // S3 camera dolly
  for (let x = 5; x <= 11; x += 2) CLEAR.push([x, -3.6, 2.0]); // S6 camera

  // ---------------- S9: the return to the village with the heads
  const vy = villageY();
  const d = new C.Vector2(SAHLAM.x - VILLAGE.x, SAHLAM.z - VILLAGE.z).normalize(); // outward along the gate path
  const n = new C.Vector2(-d.y, d.x);
  const gate = (along, side) => [SAHLAM.x + d.x * along + n.x * side, SAHLAM.z + d.y * along + n.y * side];
  const carriers = [12, 13, 15, 16, 18, 19, 20, 22].map((i) => W(i));
  carriers.forEach((w, j) => {
    const row = Math.floor(j / 2), side = j % 2 ? 0.9 : -0.9;
    const [sx, sz] = gate(10.5 + row * 1.7, side), [ex, ez] = gate(2.6 + row * 1.7, side + (j % 2 ? 0.4 : -0.4));
    const faceIn = Math.atan2(-d.x, -d.y);
    w.track.jump(71.9, sx, sz, 'carry', faceIn).at(72.0, sx, sz, 'carry', faceIn).at(76.6 + row * 0.2, ex, ez, 'carryStand', faceIn).at(T_HANG, ex, ez, 'cheer', faceIn);
    w.pole = makeHeadPole(); w.pole.visible = false;
    w.pole.position.set(-0.26, 0.56, 0.05); w.pole.rotation.set(-PI / 2 + 0.12, 0, 0);
    w.torso.add(w.pole);
  });
  // heads that appear on the sahlam
  const hung = [];
  return {
    actors, reds, warriors, carriers, victim, exe, gate, d, n, hung, vy,
    attachHung(sahlam) {
      const spots = [[-1.25, 3.7], [-0.45, 3.7], [0.35, 3.7], [1.15, 3.7], [-1.45, 5.5], [1.45, 5.5], [-0.9, 2.2], [0.9, 2.2]];
      spots.forEach(([x, y], i) => {
        const h = makeTrophyHead(); h.position.set(x, y - 0.5, 0.15); h.scale.setScalar(0.85); h.rotation.y = (i % 3 - 1) * 0.25;
        sahlam.add(h); hung.push(h);
      });
    },
    villagers: null,
  };
}

/** village people for the opening and the celebration */
export function buildVillagers(scene, cast) {
  const vy = villageY(), out = [];
  const fire = [VILLAGE.x + 4, VILLAGE.z - 6];
  const ring = (i, n, r) => [fire[0] + Math.cos((i / n) * 2 * PI) * r, fire[1] + Math.sin((i / n) * 2 * PI) * r];
  for (let i = 0; i < 10; i++) {
    const elder = i < 4;
    const a = makeActor('warrior', elder ? 'elder' : (i % 2 ? 'brave' : 'veteran'), elder ? null : 'dao');
    a.phase = R() * 10; a.track = new Track(a);
    scene.add(a.root); cast.actors.push(a); out.push(a);
    if (elder) {
      const [x, z] = ring(i, 4, 6.5);
      a.track.at(0, x, z, 'idle', Math.atan2(fire[0] - x, fire[1] - z)).at(72, x, z, 'idle').at(T_HANG + 0.3, x, z, 'cheer');
    } else {
      // morning: walking out of the gate to war;  night: dancing round the fire
      const j = i - 4, [sx, sz] = cast.gate(-6 - j * 1.8, (j % 2 ? 0.8 : -0.8)), [ex, ez] = cast.gate(9 - j * 1.8, (j % 2 ? 0.8 : -0.8));
      const [fx, fz] = ring(j, 6, 4.2);
      a.track.at(0, sx, sz, 'walk').at(8, ex, ez, 'walk').jump(8.01, fx, fz, 'dance', Math.atan2(fire[0] - fx, fire[1] - fz));
    }
  }
  return out;
}

// ------------------------------------------------------------------ shots
const py = (x) => pathY(x);
export function buildShots(cast) {
  const vy = cast.vy, d = cast.d, n = cast.n;
  const G = (along, side, y) => { const [x, z] = cast.gate(along, side); return V(x, heightAt(x, z) + y, z); };
  const vx = cast.victim.xs;
  const anchor = (T) => 18 - 3.4 - (43 - Math.min(T, 43)); // officer's x while marching
  const shots = [
    { name: 'The Hills', dur: 8, mood: 'mist', title: 'THE LUSHAI HILLS, 1890',
      caption: 'The British Empire has pushed into the Lushai Hills — today’s Mizoram.',
      from: { pos: V(VILLAGE.x + 38, vy + 22, VILLAGE.z - 46), look: V(VILLAGE.x - 4, vy + 2, VILLAGE.z - 4), fov: 42 },
      to: { pos: V(VILLAGE.x + 26, vy + 12, VILLAGE.z - 40), look: V(VILLAGE.x - 10, vy + 1, VILLAGE.z - 14), fov: 40 } },
    { name: 'Panji', dur: 8, mood: 'mist',
      caption: 'Mizo warriors know every ridge. They line the path with sharpened bamboo spikes.',
      from: { pos: V(4.0, py(4) + 1.8, -0.6), look: V(12, py(12) + 0.6, 0.6), fov: 40 },
      to: { pos: V(6.0, py(6) + 1.6, -0.4), look: V(13, py(13) + 0.5, 0.6), fov: 36 } },
    { name: 'The Column', dur: 10, mood: 'jungle',
      caption: 'A column of Redcoats climbs the narrow jungle path.',
      from: { pos: V(-33, py(-33) + 2.6, -6.5), look: V(-22, py(-22) + 1.2, 0.5), fov: 42 },
      to: { pos: V(-15, py(-15) + 2.4, -6.0), look: V(-6, py(-6) + 1.2, 0.5), fov: 42 } },
    { name: 'Watched', dur: 8, mood: 'jungle',
      caption: 'Heat. Leeches. And the feeling of being watched.',
      cam: (T, t) => { const x = anchor(T); return { pos: V(x + 2.6 - t * 0.05, py(x + 2.6) + 1.3, -1.75), look: V(x - 0.6, py(x) + 1.15, 0.35), fov: 36 }; } },
    { name: 'In the Bamboo', dur: 8, mood: 'jungle',
      caption: 'Hundreds of warriors wait above them in the bamboo, daos drawn.',
      from: { pos: V(3.9, heightAt(3.9, 6.9) + 1.1, 6.9), look: V(3.0, heightAt(3, 9.6) + 0.85, 9.6), fov: 38 },
      to: { pos: V(5.4, heightAt(5.4, 11.8) + 2.0, 11.8), look: V(6, py(6) + 0.8, 0), fov: 44 }, hold: 3.2 },
    { name: 'Ambush', dur: 9, mood: 'battle', shake: [T_VOLLEY1, T_REDFIRE, T_VOLLEY2],
      caption: 'Then the hillside erupts.',
      from: { pos: V(6.9, py(6.9) + 0.9, -3.6), look: V(3, py(3) + 3.4, 8), fov: 46 },
      to: { pos: V(9.0, py(9) + 1.4, -3.8), look: V(4, py(4) + 2.4, 6), fov: 50 } },
    { name: 'The Charge', dur: 6.5, mood: 'battle',
      caption: 'Dao blades flash out of the gun smoke.',
      from: { pos: V(-3, py(-3) + 3.5, -5.5), look: V(5, py(5) + 1.8, 3.5), fov: 44 },
      to: { pos: V(2, py(2) + 2.6, -5.0), look: V(9, py(9) + 1.2, 1.2), fov: 42 } },
    { name: 'No Quarter', dur: 6.5, mood: 'battle',
      caption: 'The column is cut to pieces on the path.',
      from: { pos: V(11.2, py(11) + 1.35, -1.75), look: V(14.6, py(14.6) + 1.1, 0.5), fov: 38 },
      to: { pos: V(10.2, py(10) + 3.4, -3.1), look: V(13.5, py(13.5) + 0.8, 0.6), fov: 44 } },
    { name: 'Trophy', dur: 8, mood: 'sunset', solo: [cast.exe, cast.victim], blackAfter: T_CHOP - 64 + 0.32,
      caption: 'Among the Mizo, a warrior’s glory was counted in the heads he carried home.',
      from: { pos: V(vx + 2.9, py(vx + 2.9) + 0.8, 1.0), look: V(vx + 0.3, py(vx) + 1.45, -1.55), fov: 46 },
      to: { pos: V(vx + 2.5, py(vx + 2.5) + 0.7, 0.8), look: V(vx + 0.3, py(vx) + 1.55, -1.55), fov: 42 } },
    { name: 'Sahlam', dur: 10, mood: 'dusk', hold: 3.6,
      caption: 'The heads are hung on the sahlam at the village gate.',
      from: { pos: G(1.0, 4.6, 1.7), look: G(9, 0, 1.4), fov: 40 },
      to: { pos: G(5.6, 3.2, 1.8), look: G(0, 0, 3.4), fov: 38 } },
    { name: 'The Hills Remember', dur: 8, mood: 'dusk',
      caption: 'Inspired by real ambushes of 1888–1890. The hills were annexed in 1890, but resistance went on for years.',
      from: { pos: V(VILLAGE.x + 13, vy + 3.2, VILLAGE.z - 17), look: V(VILLAGE.x + 4, vy + 1.2, VILLAGE.z - 6), fov: 44 },
      to: { pos: V(VILLAGE.x + 44, vy + 24, VILLAGE.z - 46), look: V(VILLAGE.x + 2, vy + 2, VILLAGE.z), fov: 44 } },
  ];
  let acc = 0;
  for (const s of shots) { s.start = acc; acc += s.dur; }
  return { shots, total: acc };
}
