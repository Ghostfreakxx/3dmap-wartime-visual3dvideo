// RAMBUAI — an MNA convoy ambush (composite, inspired by the Mizo insurgency 1966–86).
// Cast, vehicles, choreography, gunfire and the 15 shots.
import * as THREE from 'three';
import { makeActor } from '../lushai/rig.js';
import './rig2.js';
import { makeTruck, makeJeep, makeJet } from './vehicles.js';
import { heightAt, pathY, VILLAGE, villageY, TOWN, townY } from './terrain.js';
import { CLEAR, POST } from './world.js';
import { rng } from '../toon.js';

const C = THREE, PI = Math.PI;
const V = (x, y, z) => new C.Vector3(x, y, z);
const R = rng(1966);
const py = (x) => pathY(x);

export const T_MINE = 55.2;
const ROAD_Z = -0.9;            // convoy keeps to the left of the road
const SPEED = 5;

// ------------------------------------------------------------------ keyframe tracks
export class Track {
  constructor() { this.k = []; }
  at(t, x, z, mode, ry) { this.k.push({ t, x, z, mode, ry }); return this; }
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
    if (!K.length) return { x: 0, z: -400, ry: 0, mode: 'idle', mt: 0 };
    let i = 0;
    while (i < K.length - 1 && K[i + 1].t <= T) i++;
    const a = K[i], b = K[i + 1];
    let x = a.x, z = a.z, ry = a.ry;
    if (b && T > a.t) {
      const u = Math.min(1, (T - a.t) / (b.t - a.t));
      x = a.x + (b.x - a.x) * u; z = a.z + (b.z - a.z) * u;
      let d = b.ry - a.ry; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI;
      ry = a.ry + d * Math.min(1, (T - a.t) / 0.35);
    }
    return { x, z, ry, mode: a.mode, mt: Math.max(0, T - a.mt) };
  }
  modeAt(T) { return this.sample(T).mode; }
}

const DEAD = (m) => m.startsWith('fall') || m.startsWith('dead');
const FIRING = { kneelFire: 'single', kneelBurst: 'burst', proneFire: 'single', proneBurst: 'burst', crouchAim: 'single', autoFire: 'burst', fire: 'single' };

export function buildFilm(scene, fx) {
  const actors = [], vehicles = [];
  const add = (kind, variant, weapon) => {
    const a = makeActor(kind, variant, weapon);
    a.phase = R() * 10; a.phaseSign = R() < 0.5 ? -1 : 1;
    a.track = new Track(); scene.add(a.root); actors.push(a);
    return a;
  };
  const blood = (t, x, z, y = 0.9, dir = V(0, 0.2, -1), amt = 1.3) => { fx.blood(t, V(x, heightAt(x, z) + y, z), dir.clone().normalize(), amt); fx.blood(t + 0.18, V(x, heightAt(x, z) + y * 0.7, z), dir.clone().normalize(), amt * 0.6); };

  // ================================================================== the convoy
  const vdefs = [['jeep', 22], ['truck', 10], ['truck', -3], ['truck', -16], ['truck', -29]];
  vdefs.forEach(([type, X], i) => {
    const v = type === 'jeep' ? makeJeep() : makeTruck();
    v.i = i; v.X = X; v.track = new Track();
    const x0 = X - SPEED * T_MINE;
    v.track.at(0, x0, ROAD_Z, null, PI / 2).at(T_MINE, X, ROAD_Z, null, PI / 2);
    if (type === 'truck') {
      v.track.at(T_MINE + 0.55, X + 2.06, ROAD_Z, null, PI / 2).at(T_MINE + 1.1, X + 2.75, ROAD_Z, null, PI / 2);
      v.stopX = X + 2.75;
    } else { v.flip = T_MINE; v.stopX = X; v.track.at(T_MINE + 1.0, X + 1.5, ROAD_Z - 1.6, null, PI / 2 + 0.3); }
    v.x0 = x0;
    scene.add(v.root); vehicles.push(v);
  });
  const [jeep, K1, K2, K3, K4] = vehicles;
  // the rear truck tries to reverse out of the killing zone
  K4.track.at(57.4, K4.stopX, ROAD_Z, null, PI / 2).at(59.2, K4.stopX - 6.5, ROAD_Z - 0.4, null, PI / 2 + 0.15);
  K4.stopX -= 6.5;
  vehicles.forEach((v) => v.track.finalize());
  jeep.burning = T_MINE + 0.05;
  fx.explosion(T_MINE, V(jeep.X, py(jeep.X), ROAD_Z), 1.7);
  fx.smokeColumn(T_MINE + 0.5, 120, () => V(jeep.X + 1.5, py(jeep.X) + 1, ROAD_Z - 1.6), 3);
  const vpos = (v, T) => { const s = v.track.sample(T); return V(s.x, heightAt(s.x, s.z), s.z); };

  // ================================================================== jawans
  const jawans = [];
  const seat = (a, v, idx, cab = false) => { a.ride = { v, seat: (cab ? v.cab : v.seats)[idx], until: 999, dieAt: 999, dieMode: 'fall' }; };
  // jeep: officer, driver, radio operator, rifleman
  const officer = add('jawan', 'officer'); seat(officer, jeep, 0);
  const jd = add('jawan', 'young'); seat(jd, jeep, 1);
  const jr = add('jawan', 'soldier'); seat(jr, jeep, 2);
  const js = add('jawan', 'old'); seat(js, jeep, 3);
  [officer, jd, jr, js].forEach((a) => (a.ride.until = T_MINE));
  // thrown out by the blast
  const jx = jeep.X;
  officer.track.at(T_MINE, jx - 2.6, -2.6, 'fall', PI / 2).at(T_MINE + 3.2, jx - 2.6, -2.6, 'wounded', 0).at(60.5, jx - 2.9, -2.7, 'kneelFire', 0.2).at(68.4, jx - 2.9, -2.7, 'fall', 0.2);
  blood(T_MINE + 0.2, jx - 2.6, -2.6, 0.5, V(0, 1, -0.3), 0.8); blood(68.4, jx - 2.9, -2.7);
  jd.track.at(T_MINE, jx + 2.5, -2.9, 'fallFwd', 2.4); blood(T_MINE + 0.1, jx + 2.5, -2.9, 0.4, V(0, 1, 0), 1.5);
  jr.track.at(T_MINE, jx - 0.5, 1.6, 'fall', -1); blood(T_MINE + 0.1, jx - 0.5, 1.6, 0.4, V(0, 1, 0), 1.5);
  js.track.at(T_MINE, jx - 4.2, -1.2, 'fallFwd', -PI / 2); js.track.at(T_MINE + 2.6, jx - 4.2, -1.2, 'dead', -PI / 2);
  blood(T_MINE + 0.15, jx - 4.2, -1.2, 0.4, V(0, 1, 0), 1.2);
  jawans.push(officer, jd, jr, js);

  // trucks: 8 on the benches + driver
  const trucks = [K1, K2, K3, K4];
  const fate = []; // [truck, seatIdx, actor]
  trucks.forEach((v, ti) => {
    const drv = add('jawan', 'young'); seat(drv, v, 0, true); drv.isDriver = true; jawans.push(drv);
    for (let s = 0; s < 8; s++) {
      const variant = s === 3 ? 'bren' : s % 3 === 0 ? 'old' : s % 2 ? 'soldier' : 'young';
      const a = add('jawan', variant); seat(a, v, s); a.truck = v; a.seatIdx = s; jawans.push(a); fate.push(a);
    }
  });
  // drivers: K1, K2, K4 killed at the wheel
  [[0, T_MINE + 0.9], [1, T_MINE + 1.6], [3, 59.3]].forEach(([ti, t]) => {
    const d = jawans.find((a) => a.isDriver && a.ride.v === trucks[ti]);
    d.ride.dieAt = t; d.ride.dieMode = 'fallFwd';
    const p = vpos(trucks[ti], t); blood(t, p.x + 2.3, p.z, 2.2, V(0, 0.3, -1), 0.9);
  });
  const k3drv = jawans.find((a) => a.isDriver && a.ride.v === K3);
  k3drv.ride.until = 57.6; k3drv.track.at(57.6, K3.stopX + 2.5, -2.4, 'kneelFire', 0.1).at(66.2, K3.stopX + 2.5, -2.4, 'fall', 0.1); blood(66.2, K3.stopX + 2.5, -2.4);

  // bench men: some die in the truck, others jump and fight from behind the trucks
  let n = 0;
  for (const a of fate) {
    const v = a.truck, s = a.seatIdx, side = a.ride.seat[0] > 0 ? 1 : -1;
    const sx = v.stopX + a.ride.seat[2] * 0.95; // seat x along the road (truck faces +x)
    const roll = R();
    if (n % 4 === 1) { // killed on the bench
      const t = T_MINE + 1.4 + R() * 2.4;
      a.ride.dieAt = t; a.ride.dieMode = R() < 0.5 ? 'fall' : 'fallFwd';
      blood(t, sx, ROAD_Z + side * 0.9, 2.0, V(0, 0.4, -side), 1.1);
    } else {
      const tj = T_MINE + 1.3 + R() * 2.2;
      a.ride.until = tj;
      const cx = sx + (R() - 0.5) * 1.6, cz = -2.45 - R() * 0.6;
      const bren = a.variant === 'bren';
      a.track.at(tj, sx, ROAD_Z - 1.6, 'run').at(tj + 0.7, cx, cz, bren ? 'proneBurst' : 'kneelFire', 0.15 * (R() - 0.5));
      if (n % 4 === 2 && n < 18) { // hit while jumping down
        const t = tj + 0.35;
        a.track.k = []; a.track.at(tj, sx, ROAD_Z - 1.6, 'run').at(t, sx - 0.3, ROAD_Z - 2.0, 'fallFwd', -PI / 2 + 0.3);
        blood(t, sx - 0.3, ROAD_Z - 2.0);
      } else {
        // fight, then die (most of them) — spread through the battle
        a.cover = [cx, cz];
        const td = n === 7 || n === 22 ? 999 : 60 + ((n * 7.3) % 27) + R() * 1.5;
        if (td < 999) { a.track.at(td, cx, cz, R() < 0.5 ? 'fall' : 'fallFwd'); blood(td, cx, cz, a.track.k[1].mode === 'proneBurst' ? 0.3 : 0.75, V((R() - 0.5), 0.3, -1)); a.td = td; }
        else { a.survivor = true; a.track.at(82.5, cx, cz, 'fall').at(84.8, cx - 0.4, cz + 0.2, 'wounded', PI); }
      }
    }
    n++;
  }
  // grenades land in the beds of K2 and K3: anyone still seated dies, trucks catch fire
  const grenade = (t, v) => {
    const p = vpos(v, t);
    fx.explosion(t, V(p.x, p.y + 1.4, p.z), 1.15);
    v.burning = t + 0.1;
    fx.smokeColumn(t + 0.4, 120, () => V(p.x, p.y + 2.2, p.z), 3);
    for (const a of jawans) if (a.ride && a.ride.v === v && a.ride.until > t && a.ride.dieAt > t) { a.ride.dieAt = t + 0.05; a.ride.dieMode = 'fall'; blood(t + 0.05, p.x, p.z, 2.0, V(0, 1, 0), 1.0); }
  };
  grenade(61.3, K2); grenade(62.9, K3);
  K1.burning = 67.0; fx.explosion(66.9, V(K1.stopX + 2.8, py(K1.stopX) + 1.2, ROAD_Z), 0.9); fx.smokeColumn(67.3, 120, () => V(K1.stopX + 2, py(K1.stopX) + 2.5, ROAD_Z), 3);

  // ================================================================== MNA
  const mna = [];
  const CMD = [-2, 9.4];
  const slots = [];
  for (let i = 0; i < 30; i++) slots.push([-33 + i * 1.95 + (R() - 0.5) * 0.8, 6.2 + (i % 3) * 1.5 + R() * 0.8]);
  slots[0] = CMD; slots[1] = [24, 6.4];
  // keep the S6 camera's path clear of fighters
  for (let i = 2; i < slots.length; i++) if (Math.hypot(slots[i][0] + 1, slots[i][1] - 7.5) < 2.6 || Math.hypot(slots[i][0] + 0.5, slots[i][1] - 10.6) < 2.2) slots[i][0] += 3.6;
  slots.forEach(([x, z]) => CLEAR.push([x, z, 1.15]));
  // clearings for the close-ups of the war-movie cut (convoy.js)
  CLEAR.push([slots[13][0] + 1.4, slots[13][1] - 1.7, 2.6], [slots[1][0] - 0.9, slots[1][1] - 1.8, 2.4], [-2, 4.6, 2.6], [slots[5][0] + 1.6, slots[5][1] - 1.2, 2.4],
    [19, -5.6, 3.4], [slots[1][0] - 1.6, slots[1][1] - 2.6, 2.4], [slots[13][0] + 2.8, slots[13][1] - 0.5, 2.4], [13, 2.4, 2.0], [-6.5, -4.8, 2.6]);
  CLEAR.push([CMD[0] + 1, CMD[1] - 2, 3.4], [CMD[0] + 1.6, CMD[1] + 1.6, 3.4], [26.6, 8.6, 3.6], [-8.5, 9.2, 3.4], [-5.5, 9.8, 3.4], [-2.5, 10.4, 3.4]);
  for (let x = -14; x <= 10; x += 2.2) CLEAR.push([x, -5.0, 2.8]);            // crossfire / overrun cameras
  for (let x = -50; x <= -4; x += 2.5) CLEAR.push([x, 4.4, 2.8]);             // tracking shot beside the trucks
  const brenIdx = [5, 13, 21], throwers = [9, 17], stens = [3, 11, 19, 25];
  slots.forEach(([x, z], i) => {
    const variant = i === 0 ? 'commander' : brenIdx.includes(i) ? 'gunner' : stens.includes(i) ? 'cap' : i % 4 === 0 ? 'civvy' : i % 3 === 0 ? 'khaki' : 'fighter';
    const a = add('mna', variant); a.i = i; a.hx = x; a.hz = z;
    const face = PI + (R() - 0.5) * 0.3 - (x > 15 ? 0.3 : 0);
    a.track.at(0, x, z, 'crouch', face);
    const bren = brenIdx.includes(i);
    if (i === 0) a.track.at(39, x, z, 'binocs', face).at(T_MINE + 0.6, x, z, 'kneelBurst', face);
    else if (i === 1) a.track.at(T_MINE - 1.0, x, z, 'plunge', face).at(T_MINE + 1.2, x, z, 'kneelFire', face);
    else if (throwers.includes(i)) a.track.at(T_MINE + 0.9, x, z, 'crouchAim', face);
    else a.track.at(T_MINE + 0.5 + R() * 0.6, x, z, bren ? 'proneBurst' : stens.includes(i) ? 'kneelBurst' : R() < 0.4 ? 'proneFire' : 'crouchAim', face);
    mna.push(a);
  });
  // grenade throws (stand up, throw)
  [[9, 60.4, K2], [17, 62.0, K3]].forEach(([i, t, v]) => { const a = mna[i]; a.track.at(t, a.hx, a.hz, 'throw').at(t + 0.6, a.hx, a.hz, 'crouchAim'); });
  // MNA losses
  const mnaDead = [[7, 63.4], [14, 66.8], [22, 70.6], [12, 74.2], [27, 77.3], [4, 79.9]];
  mnaDead.forEach(([i, t]) => { const a = mna[i]; a.track.at(t, a.hx, a.hz, 'fall'); blood(t, a.hx, a.hz, 0.7, V(0, 0.3, 1)); a.td = t; });
  // the rush to the road, looting, and the vanishing
  const alive = mna.filter((a) => !a.td && a.i !== 1);
  const bodies = fate.filter((a) => a.td).slice();
  alive.forEach((a, j) => {
    const b = bodies[j % bodies.length];
    const tx = (b.cover ? b.cover[0] : a.hx) + (R() - 0.5) * 1.2, tz = -1.6 + (R() - 0.5) * 1.2;
    const t0 = 81.3 + R() * 0.8, t1 = t0 + Math.hypot(tx - a.hx, tz - a.hz) / 4.5;
    a.track.at(t0, a.hx, a.hz, 'run').at(t1, tx, tz, j % 3 === 0 ? 'autoFire' : 'loot', PI + 0.4).at(85.2 + R() * 0.6, tx, tz, 'loot');
    const back = [a.hx + (R() - 0.5) * 3, a.hz + 7];
    a.track.at(87.1 + R() * 0.7, tx, tz, 'run').at(90.5, back[0], back[1], 'crouch');
  });
  // the last two jawans who were still fighting die in the rush
  fate.filter((a) => a.td && a.td > 81).forEach((a) => { a.track.k = a.track.k.filter((k) => k.t < 81.5); const t = 82 + R(); a.track.at(t, a.cover[0], a.cover[1], 'fallFwd'); blood(t, a.cover[0], a.cover[1]); });

  // ================================================================== gunfire (derived from the tracks)
  [...actors].forEach((a) => a.track.finalize());
  const muzzle = (a, s) => {
    const m = s.mode, prone = m.startsWith('prone'), kneel = m.startsWith('kneel') || m === 'crouchAim';
    const h = prone ? 0.32 : kneel ? 0.75 : 1.05, f = prone ? 1.6 : 1.25;
    const dx = Math.sin(s.ry), dz = Math.cos(s.ry);
    return V(s.x + dx * f - dz * 0.2, heightAt(s.x, s.z) + h, s.z + dz * f + dx * 0.2);
  };
  const shooters = [...jawans, ...mna];
  for (const a of shooters) {
    let next = 0, burstLeft = 0;
    for (let T = 54; T < 90; T += 0.04) {
      const s = a.track.sample(T);
      if (a.ride && T < a.ride.until) continue;
      const kind = FIRING[s.mode];
      if (!kind || DEAD(s.mode) || s.mt < 0.4) continue;
      if (T < next) continue;
      const heavy = a.weaponKind === 'bren';
      const isMna = a.kind === 'mna';
      const pos = muzzle(a, s);
      const dir = V(Math.sin(s.ry), isMna ? -0.35 : 0.35, Math.cos(s.ry)).normalize();
      fx.shot(T, pos, dir, heavy);
      // impact: dust on the road / slope, sparks off the trucks
      if (isMna) {
        const tx = pos.x + (R() - 0.5) * 6, tz = -2.8 + R() * 3.4;
        if (R() < 0.3) fx.spark(T + 0.04, V(tx, heightAt(tx, tz) + 1 + R() * 1.4, ROAD_Z + 1.3)); else fx.dust(T + 0.04, V(tx, heightAt(tx, tz), tz));
      } else {
        const tx = pos.x + (R() - 0.5) * 7, tz = 6 + R() * 6;
        fx.dust(T + 0.05, V(tx, heightAt(tx, tz), tz));
      }
      const bursty = kind === 'burst' || heavy || a.weaponKind === 'sten';
      if (bursty) { if (burstLeft <= 0) burstLeft = 4 + Math.floor(R() * 3); burstLeft--; next = T + (burstLeft > 0 ? 0.11 : 0.9 + R() * 0.8); }
      else next = T + (a.weaponKind === 'pistol' ? 0.8 : 1.3) + R() * 1.0;
    }
  }

  // ================================================================== history scenes
  const vy = villageY(), ty = townY();
  // S1/S2: the village (famine, then the MNF rally)
  const vill = [];
  for (let i = 0; i < 16; i++) {
    const variant = i % 5 === 0 ? 'woman' : i % 7 === 0 ? 'elder' : i % 3 === 0 ? 'boy' : i < 3 ? 'sad' : 'man';
    const a = add('civil', variant === 'man' ? 'sad' : variant, i % 6 === 2 ? 'banner' : null);
    const ang = (i / 16) * PI * 1.1 - PI * 0.55, r = 6 + (i % 3) * 1.4;
    const sx = VILLAGE.x + 2 + Math.sin(ang) * r, sz = VILLAGE.z - 6 - Math.cos(ang) * r * 0.5 - 2;
    const fx0 = VILLAGE.x + 2 + (i % 6) * 1.6, fz0 = VILLAGE.z - 12 + Math.floor(i / 6) * 1.6;
    a.track.at(0, fx0, fz0, i % 2 ? 'look' : 'idle', 0.6 + R()).jump(8, sx, sz, i % 3 === 0 ? 'clap' : i % 3 === 1 ? 'wave' : 'cheer', Math.atan2(VILLAGE.x + 2 - sx, VILLAGE.z - 2.2 - sz));
    vill.push(a);
  }
  const speaker = add('civil', 'leader');
  speaker.track.at(0, VILLAGE.x + 2, VILLAGE.z - 2.2, 'speech', PI);
  speaker.lift = 1.0;

  // S3: night raid on the Assam Rifles post
  const raiders = [];
  for (let i = 0; i < 9; i++) {
    const a = add('mna', i % 3 === 0 ? 'cap' : i % 2 ? 'fighter' : 'khaki');
    const x = POST.x - 14 + i * 1.6, z = POST.z - 9 - (i % 2) * 1.4;
    const face = Math.atan2(POST.x - x, POST.z - z);
    a.track.at(0, x, z, 'crouch', face).at(16.2 + R() * 0.5, x, z, i % 3 === 0 ? 'kneelBurst' : 'crouchAim', face);
    if (i === 4) { a.track.at(21.2, x, z, 'fall'); blood(21.2, x, z); }
    raiders.push(a);
  }
  const guards = [];
  for (let i = 0; i < 3; i++) {
    const a = add('jawan', i === 1 ? 'bren' : 'old');
    const ang = -PI / 2 - 0.5 + i * 0.5, x = POST.x + Math.cos(ang) * 6.6, z = POST.z + Math.sin(ang) * 6.6;
    const face = Math.atan2(x - POST.x, z - POST.z);
    a.track.at(0, x, z, i === 1 ? 'proneBurst' : 'kneelFire', face);
    if (i === 2) { a.track.at(19.5, x, z, 'fall', face); blood(19.5, x, z); }
    guards.push(a);
  }
  for (const a of [...raiders, ...guards]) {
    a.track.finalize();
    for (let T = 16.3; T < 24; T += 0.15 + R() * 0.5) {
      const s = a.track.sample(T); if (!FIRING[s.mode] || DEAD(s.mode)) continue;
      fx.shot(T, muzzle(a, s), V(Math.sin(s.ry), 0.05, Math.cos(s.ry)), a.weaponKind === 'bren');
    }
  }

  // S4: jets over Aizawl
  const jets = [makeJet(), makeJet()];
  jets.forEach((j, i) => { scene.add(j.root); j.pass = 25.3 + i * 2.2; j.side = i ? 1 : -1; });
  const townHouses = [];
  const fleers = [];
  for (let i = 0; i < 8; i++) {
    const a = add('civil', i % 2 ? 'woman' : 'man');
    const x = TOWN.x - 6 + i * 1.6, z = TOWN.z - 14 + (i % 3);
    a.track.at(0, x, z, 'idle', PI).at(24.6 + R() * 0.6, x, z, 'flee', PI + (R() - 0.5)).at(32, x - 5 + R() * 4, z - 22, 'flee');
    fleers.push(a);
  }

  // S13: villages "grouped": families walk out under guard, old village burns
  const grouped = [];
  for (let i = 0; i < 12; i++) {
    const a = add('civil', i % 3 === 0 ? 'woman' : i % 4 === 1 ? 'elder' : 'sad', 'bundle');
    const t0 = 96, sx = VILLAGE.x + 1 + (i % 2) * 1.4, sz = VILLAGE.z - 3 - Math.floor(i / 2) * 1.6;
    a.track.jump(t0, sx, sz, 'carryBundle', PI).at(105, sx - 1, sz - 13, 'carryBundle', PI);
    grouped.push(a);
  }
  for (let i = 0; i < 4; i++) {
    const a = add('jawan', i % 2 ? 'old' : 'soldier');
    const sx = VILLAGE.x - 1.5 + (i % 2) * 5.6, sz = VILLAGE.z - 4 - i * 2.4;
    a.track.jump(96, sx, sz, 'walk', PI).at(105, sx - 1, sz - 13, 'walk', PI);
  }

  // S14: the 1986 accord, celebrated
  const off = add('civil', 'official'), ldr = add('civil', 'leader');
  off.track.at(0, TOWN.x - 0.55, TOWN.z - 4, 'idle', PI / 2).at(106.5, TOWN.x - 0.55, TOWN.z - 4, 'handshake', PI / 2);
  ldr.track.at(0, TOWN.x + 0.55, TOWN.z - 4, 'idle', -PI / 2).at(106.5, TOWN.x + 0.55, TOWN.z - 4, 'handshake', -PI / 2);
  off.lift = ldr.lift = 0.8;
  const crowd = [];
  for (let i = 0; i < 18; i++) {
    const a = add('civil', ['man', 'woman', 'boy', 'elder'][i % 4] === 'man' ? 'sad' : ['man', 'woman', 'boy', 'elder'][i % 4], i % 5 === 0 ? 'banner' : null);
    const x = TOWN.x - 7 + (i % 6) * 2.8 + R(), z = TOWN.z - 10 - Math.floor(i / 6) * 2;
    a.track.jump(105, x, z, i % 2 ? 'wave' : 'clap', Math.atan2(TOWN.x - x, TOWN.z - 4 - z));
    crowd.push(a);
  }

  // who is on stage when
  const stage = (list, t0, t1) => list.forEach((a) => (a.vis = [t0, t1]));
  stage(vill, 0, 16); stage([speaker], 8, 16); stage([...raiders, ...guards], 16, 24); stage(fleers, 24, 32);
  stage([...jawans, ...mna], 32, 96); stage(grouped, 96, 105); stage(actors.filter((a) => a.kind === 'jawan' && !jawans.includes(a) && !guards.includes(a)), 96, 105);
  stage([...crowd, off, ldr], 105, 999);
  actors.forEach((a) => { if (!a.track.k.length) a.track.at(0, 0, -400, 'idle'); a.track.finalize(); });
  return { actors, vehicles, jawans, mna, jets, vill, officer, fate, grouped, crowd, speaker, off, ldr, vpos, fleers };
}

// ------------------------------------------------------------------ shots
export function buildShots(film) {
  const vy = villageY(), ty = townY();
  const K2 = film.vehicles[2];
  const h = (x, z) => heightAt(x, z);
  const S = [
    { name: 'Mautam', dur: 8, mood: 'mist', title: 'RAMBUAI',
      caption: '1959. The bamboo flowers — the dreaded Mautam. Rats swarm the Mizo Hills, devour the harvest, and famine follows.',
      from: { pos: V(VILLAGE.x + 1, vy + 2.2, VILLAGE.z - 17), look: V(VILLAGE.x + 7, vy + 0.6, VILLAGE.z - 6), fov: 44 },
      to: { pos: V(VILLAGE.x + 0, vy + 3.4, VILLAGE.z - 18), look: V(VILLAGE.x + 7, vy + 0.6, VILLAGE.z - 5), fov: 44 } },
    { name: 'The Front', dur: 8, mood: 'jungle',
      caption: 'Angry at slow famine relief, the Mizo National Famine Front becomes the Mizo National Front (1961), demanding independence.',
      from: { pos: V(VILLAGE.x + 2, vy + 2.4, VILLAGE.z - 21), look: V(VILLAGE.x + 2, vy + 1.6, VILLAGE.z - 2), fov: 40 },
      to: { pos: V(VILLAGE.x + 2, vy + 2.2, VILLAGE.z - 12.5), look: V(VILLAGE.x + 2, vy + 1.9, VILLAGE.z - 2), fov: 38 } },
    { name: 'Operation Jericho', dur: 8, mood: 'night',
      caption: '1 March 1966 — “Operation Jericho”. The MNF declares independence and attacks government posts across the hills.',
      from: { pos: V(POST.x - 7, h(POST.x, POST.z) + 2.0, POST.z - 15), look: V(POST.x, h(POST.x, POST.z) + 1.6, POST.z), fov: 46 },
      to: { pos: V(POST.x - 2, h(POST.x, POST.z) + 1.6, POST.z - 13.5), look: V(POST.x, h(POST.x, POST.z) + 1.4, POST.z), fov: 44 } },
    { name: 'Air Strikes', dur: 8, mood: 'smoke',
      caption: 'March 1966 — Indian Air Force jets strike Aizawl: the only air raid India has ever carried out on its own soil.',
      from: { pos: V(TOWN.x - 6, ty + 5, TOWN.z - 46), look: V(TOWN.x, ty + 10, TOWN.z), fov: 50 },
      to: { pos: V(TOWN.x - 8, ty + 6, TOWN.z - 50), look: V(TOWN.x, ty + 5, TOWN.z), fov: 48 } },
    { name: 'Convoys', dur: 7, mood: 'jungle',
      caption: 'The Army rushes in troops. Long convoys grind up narrow hill roads — the perfect target.',
      from: { pos: V(-120, py(-120) + 22, -30), look: V(-100, py(-100), -1), fov: 44 },
      to: { pos: V(-82, py(-82) + 17, -28), look: V(-66, py(-66), -1), fov: 44 } },
    { name: 'The Ambush Party', dur: 8, mood: 'jungle', hold: 3.4,
      caption: 'Above a bend, an MNA ambush party waits in the bamboo: .303 rifles, Sten guns, Bren guns and home-made bombs.',
      from: { pos: V(-1.0, h(-1, 7.2) + 1.0, 7.2), look: V(-2, h(-2, 9.4) + 0.95, 9.4), fov: 40 },
      to: { pos: V(-0.4, h(-0.4, 11.2) + 2.4, 11.2), look: V(2, py(2) + 0.8, -1), fov: 46 } },
    { name: 'The Jawans', dur: 7, mood: 'jungle',
      cam: (T) => { const s = K2.track.sample(T), x = s.x; return { pos: V(x - 0.6, py(x) + 4.6, 3.6), look: V(x - 1.4, py(x) + 1.7, -1.9), fov: 44 }; },
      caption: 'In the trucks: young jawans of the Indian Army, rifles between their knees, far from home.' },
    { name: 'The Bomb', dur: 5, mood: 'jungle',
      caption: 'A home-made bomb under the lead jeep.',
      from: { pos: V(26.6, h(26.6, 8.6) + 2.0, 8.6), look: V(18, py(18) + 0.6, -0.9), fov: 48 },
      to: { pos: V(26.9, h(26.9, 8.9) + 2.3, 8.9), look: V(18, py(18) + 0.9, -0.9), fov: 50 } },
    { name: 'Crossfire', dur: 12, mood: 'battle',
      caption: 'Fire pours down from the hillside. Many jawans die before they can climb out of the trucks.',
      from: { pos: V(-5.5, py(-5.5) + 1.6, -6.2), look: V(-1, py(-1) + 2.0, 5), fov: 50 },
      to: { pos: V(-10, py(-10) + 2.0, -6.4), look: V(-5, py(-5) + 2.0, 5), fov: 50 } },
    { name: 'Fighting Back', dur: 10, mood: 'battle',
      caption: 'The survivors fight back from behind the burning trucks. The MNA takes losses too.',
      from: { pos: V(-8.5, h(-8.5, 9.2) + 1.3, 9.2), look: V(-6, py(-6) + 0.8, -1.5), fov: 46 },
      to: { pos: V(-2.5, h(-2.5, 10.4) + 2.4, 10.4), look: V(-1, py(-1) + 0.5, -1.5), fov: 48 } },
    { name: 'Overrun', dur: 8, mood: 'battle',
      caption: 'Then the MNA rushes the road, finishes the fight and strips the dead of rifles and ammunition.',
      from: { pos: V(7.5, py(7.5) + 1.6, -5.6), look: V(2, py(2) + 1.6, 4), fov: 50 },
      to: { pos: V(6, py(6) + 3.0, -6.0), look: V(-1, py(-1) + 0.6, 0), fov: 52 } },
    { name: 'Silence', dur: 7, mood: 'sunset',
      caption: 'In minutes they are gone into the jungle. Burning trucks — and silence.',
      from: { pos: V(-24, py(-24) + 4.5, -6.5), look: V(-10, py(-10) + 1.2, -1), fov: 44 },
      to: { pos: V(8, py(8) + 6.5, -8), look: V(16, py(16) + 1, -1), fov: 46 } },
    { name: 'Grouping', dur: 9, mood: 'smoke',
      caption: 'The Army struck back hard. From 1967 most rural Mizos were forced into guarded “grouped” villages, and old villages burned.',
      from: { pos: V(VILLAGE.x + 12, vy + 5, VILLAGE.z - 28), look: V(VILLAGE.x + 1, vy + 1.5, VILLAGE.z - 6), fov: 46 },
      to: { pos: V(VILLAGE.x + 10, vy + 3.5, VILLAGE.z - 26), look: V(VILLAGE.x + 1, vy + 1.2, VILLAGE.z - 12), fov: 44 } },
    { name: 'Peace', dur: 10, mood: 'clear',
      caption: 'Twenty years of Rambuai end with the Mizo Peace Accord, signed on 30 June 1986. Mizoram becomes a state in 1987.',
      from: { pos: V(TOWN.x, ty + 1.6, TOWN.z - 15), look: V(TOWN.x, ty + 1.6, TOWN.z - 4), fov: 40 },
      to: { pos: V(TOWN.x + 1.5, ty + 2.0, TOWN.z - 10), look: V(TOWN.x, ty + 1.5, TOWN.z - 4), fov: 36 } },
    { name: 'Remember', dur: 5, mood: 'dusk',
      caption: 'A composite inspired by MNA ambushes of the insurgency. Remembering the dead on both sides.',
      from: { pos: V(TOWN.x + 30, ty + 18, TOWN.z - 40), look: V(TOWN.x, ty, TOWN.z), fov: 44 },
      to: { pos: V(TOWN.x + 44, ty + 30, TOWN.z - 56), look: V(TOWN.x, ty, TOWN.z), fov: 44 } },
  ];
  let acc = 0;
  for (const s of S) { s.start = acc; acc += s.dur; }
  return { shots: S, total: acc };
}
