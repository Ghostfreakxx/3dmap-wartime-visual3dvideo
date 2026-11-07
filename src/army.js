// Thousands of chibi soldiers drawn with InstancedMesh (one draw call per body part).
import * as THREE from 'three';
import { toon, vcToon, part, merge, outlineMaterial, ensureOutlineNormals, rng } from './toon.js';
import { tabard, blob, banner } from './textures.js';
import { COL } from './characters.js';

const OL = 0.03;
const C = THREE;

// ---- part geometry (each in its pivot's local frame) -------------------------------------
function legGeo(color, footColor) {
  return merge([
    part(new C.CylinderGeometry(0.075, 0.068, 0.3, 8), color, { pos: [0, -0.15, 0] }),
    part(new C.BoxGeometry(0.13, 0.07, 0.22), footColor, { pos: [0, -0.32, 0.04] }),
  ]);
}
function bodyGeo() {
  // torso pivot at hips; tabard cylinder (front at u=0.5)
  const g = new C.CylinderGeometry(0.2, 0.25, 0.5, 12, 1, false, Math.PI);
  g.translate(0, 0.25, 0);
  return ensureOutlineNormals(g);
}
function headGeo(kind, plume) {
  const y = 0.5 + 0.32; // neck height + head centre, in torso frame
  const p = [];
  if (kind === 'kettle' || kind === 'bare') p.push(part(new C.SphereGeometry(0.36, 14, 10), COL.skin, { pos: [0, y, 0] }));
  if (kind === 'kettle') {
    p.push(part(new C.SphereGeometry(0.385, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), COL.steel, { pos: [0, y + 0.08, 0] }));
    p.push(part(new C.CylinderGeometry(0.52, 0.54, 0.035, 18), COL.steel, { pos: [0, y + 0.1, 0] }));
  }
  if (kind === 'kettle' || kind === 'bare') {
    for (const s of [-1, 1]) {
      p.push(part(new C.SphereGeometry(0.045, 6, 5), COL.ink, { pos: [s * 0.12, y + 0.02, 0.33], scale: [1, 1.35, 0.6] }));
      p.push(part(new C.BoxGeometry(0.14, 0.035, 0.03), COL.ink, { pos: [s * 0.125, y + 0.13, 0.315], rot: [0, 0, s * 0.38] }));
    }
  }
  if (kind === 'bare') p.push(part(new C.SphereGeometry(0.375, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), COL.hair, { pos: [0, y + 0.02, -0.04], rot: [-0.25, 0, 0] }));
  if (kind === 'great') {
    p.push(part(new C.CylinderGeometry(0.4, 0.38, 0.6, 16), COL.steel, { pos: [0, y, 0] }));
    p.push(part(new C.SphereGeometry(0.4, 16, 5, 0, Math.PI * 2, 0, Math.PI / 2), COL.steel, { pos: [0, y + 0.3, 0], scale: [1, 0.32, 1] }));
    p.push(part(new C.BoxGeometry(0.46, 0.05, 0.1), COL.ink, { pos: [0, y + 0.04, 0.36] }));
    p.push(part(new C.BoxGeometry(0.05, 0.5, 0.06), COL.steelDark, { pos: [0, y - 0.02, 0.39] }));
  }
  if (plume) {
    for (let i = 0; i < 4; i++) p.push(part(new C.SphereGeometry(0.075, 8, 6), plume, { pos: [0.02, y + 0.42 + i * 0.07, -0.05 - i * 0.08], rot: [0.6, 0, 0], scale: [0.8, 1.8, 0.8] }));
  }
  return merge(p);
}
function armsGeo(limb, hand, weapon) {
  // arms pivot at shoulder height (torso frame y = 0.44)
  const p = [];
  for (const s of [-1, 1]) {
    p.push(part(new C.CylinderGeometry(0.06, 0.055, 0.34, 8), limb, { pos: [s * 0.27, -0.17, 0.02], rot: [0, 0, s * 0.12] }));
    p.push(part(new C.SphereGeometry(0.072, 8, 6), hand, { pos: [s * 0.29, -0.36, 0.02] }));
  }
  if (weapon === 'bow') {
    const R = 1.6, arc = 0.95;
    const t = new C.TorusGeometry(R, 0.03, 5, 16, arc);
    t.rotateZ(-arc / 2); t.translate(-R, 0, 0); t.rotateY(-Math.PI / 2);
    p.push(part(t, COL.wood, { pos: [0.29, -0.36, 0.05] }));
  } else if (weapon === 'spear') {
    p.push(part(new C.CylinderGeometry(0.03, 0.035, 2.6, 6), COL.wood, { pos: [-0.29, 0.4, 0.04] }));
    p.push(part(new C.ConeGeometry(0.06, 0.22, 6), COL.steel, { pos: [-0.29, 1.8, 0.04] }));
  } else if (weapon === 'axe') {
    p.push(part(new C.CylinderGeometry(0.03, 0.035, 1.7, 6), COL.wood, { pos: [-0.29, 0.1, 0.04] }));
    p.push(part(new C.BoxGeometry(0.04, 0.25, 0.22), COL.steel, { pos: [-0.29, 0.85, 0.12] }));
  } else if (weapon === 'lance') {
    p.push(part(new C.CylinderGeometry(0.035, 0.045, 3.4, 6), COL.wood, { pos: [-0.29, 1.0, 0.1], rot: [0.25, 0, 0] }));
    p.push(part(new C.ConeGeometry(0.06, 0.22, 6), COL.steel, { pos: [-0.29, 2.66, 0.52], rot: [0.25, 0, 0] }));
  }
  return merge(p);
}
function horseGeo(coat) {
  const p = [
    part(new C.CapsuleGeometry(0.36, 0.8, 4, 10), coat, { pos: [0, 1.0, 0], rot: [Math.PI / 2, 0, 0] }),
    part(new C.CylinderGeometry(0.18, 0.26, 0.75, 10), coat, { pos: [0, 1.45, 0.67], rot: [0.55, 0, 0] }),
    part(new C.CapsuleGeometry(0.17, 0.4, 4, 8), coat, { pos: [0, 1.8, 0.95], rot: [Math.PI / 2 - 0.35, 0, 0] }),
    part(new C.SphereGeometry(0.075, 8, 6), 0xffffff, { pos: [0.13, 1.88, 0.92] }),
    part(new C.SphereGeometry(0.075, 8, 6), 0xffffff, { pos: [-0.13, 1.88, 0.92] }),
    part(new C.ConeGeometry(0.1, 0.6, 8), 0x3b2a20, { pos: [0, 0.85, -0.85], rot: [Math.PI - 0.4, 0, 0] }),
  ];
  for (const [x, z] of [[-0.2, 0.42], [0.2, 0.42], [-0.2, -0.42], [0.2, -0.42]]) {
    p.push(part(new C.CylinderGeometry(0.08, 0.07, 0.8, 6), coat, { pos: [x, 0.43, z] }));
    p.push(part(new C.CylinderGeometry(0.09, 0.1, 0.1, 6), 0x2d2420, { pos: [x, 0.03, z] }));
  }
  return merge(p);
}
function caparisonGeo() {
  const g = new C.CylinderGeometry(0.42, 0.55, 0.6, 16, 1, true, Math.PI);
  g.scale(1, 1, 1.75); g.translate(0, 0.88, 0);
  return ensureOutlineNormals(g);
}
function riderLegsGeo(color) {
  const p = [];
  for (const s of [-1, 1]) p.push(part(new C.CylinderGeometry(0.075, 0.068, 0.34, 8), color, { pos: [s * 0.32, -0.12, 0.08], rot: [-0.5, 0, s * 0.75] }));
  return merge(p);
}

// ---- unit types -----------------------------------------------------------------------------
const TYPES = {
  archer: { head: 'kettle', limb: COL.cloth, hand: COL.skin, leg: COL.red, foot: COL.leather, weapon: 'bow' },
  billman: { head: 'bare', limb: COL.cloth, hand: COL.skin, leg: 0x4a5a7a, foot: COL.leather, weapon: 'axe' },
  knight: { head: 'great', limb: COL.steel, hand: COL.steelDark, leg: COL.steel, foot: COL.steelDark, weapon: 'spear' },
  cavalry: { head: 'great', limb: COL.steel, hand: COL.steelDark, leg: COL.steel, foot: COL.steelDark, weapon: 'lance', horse: true },
};

const _geoCache = new Map();
function geos(type, plume) {
  const k = type + plume;
  if (_geoCache.has(k)) return _geoCache.get(k);
  const T = TYPES[type];
  const g = {
    body: bodyGeo(), head: headGeo(T.head, plume), arms: armsGeo(T.limb, T.hand, T.weapon),
    leg: T.horse ? null : legGeo(T.leg, T.foot), riderLegs: T.horse ? riderLegsGeo(T.leg) : null,
    horse: T.horse ? horseGeo(0x8b5a3c) : null, cap: T.horse ? caparisonGeo() : null,
  };
  _geoCache.set(k, g);
  return g;
}

// ---- Squad ----------------------------------------------------------------------------------
const _m = new C.Matrix4(), _b = new C.Matrix4(), _t = new C.Matrix4(), _r = new C.Matrix4(), _q = new C.Quaternion(), _e = new C.Euler(), _v = new C.Vector3(), _s = new C.Vector3(1, 1, 1);

export class Squad {
  /**
   * cfg: { name, type, tabard, plume, center:[x,z], rows, cols, spacing:[sx,sz], yaw, jitter, exclude(x,z),
   *        schedule:[[t0,t1,speed]], banners:n, bannerKind, seed }
   */
  constructor(cfg, scene) {
    this.cfg = cfg;
    this.type = TYPES[cfg.type];
    const R = rng(cfg.seed ?? 7);
    const [sx, sz] = cfg.spacing ?? [1.0, 1.1];
    const yaw = cfg.yaw ?? 0;
    this.dir = new C.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new C.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    this.units = [];
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const lx = (c - (cfg.cols - 1) / 2) * sx + (r % 2) * sx * 0.5;
        const lz = -r * sz; // row 0 is the front
        const j = cfg.jitter ?? 0.15;
        const x = cfg.center[0] + right.x * lx + this.dir.x * lz + (R() - 0.5) * j * 2;
        const z = cfg.center[1] + right.z * lx + this.dir.z * lz + (R() - 0.5) * j * 2;
        if (cfg.exclude && cfg.exclude(x, z)) continue;
        this.units.push({ x, z, yaw: yaw + (R() - 0.5) * 0.25, phase: R() * 10, row: r, col: c, lag: R() * 0.6 });
      }
    }
    const n = this.units.length;
    const g = geos(cfg.type, cfg.plume ?? null);
    const tabMat = toon(0xffffff, { map: tabard(cfg.tabard) });
    const vc = vcToon();
    const mk = (geo, mat, outline = true) => {
      const m = new C.InstancedMesh(geo, mat, n);
      m.frustumCulled = false;
      scene.add(m);
      if (outline) {
        const o = new C.InstancedMesh(geo, outlineMaterial(OL), n);
        o.instanceMatrix = m.instanceMatrix; // share the same buffer
        o.frustumCulled = false;
        scene.add(o);
      }
      return m;
    };
    this.meshes = {
      body: mk(g.body, tabMat), head: mk(g.head, vc), arms: mk(g.arms, vc),
      legL: g.leg ? mk(g.leg, vc) : null, legR: g.leg ? mk(g.leg, vc) : null,
      riderLegs: g.riderLegs ? mk(g.riderLegs, vc) : null,
      horse: g.horse ? mk(g.horse, vc) : null,
      cap: g.cap ? mk(g.cap, toon(0xffffff, { map: tabard(cfg.capTabard ?? cfg.tabard), side: C.DoubleSide })) : null,
    };
    const sg = new C.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    this.shadow = new C.InstancedMesh(sg, new C.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false }), n);
    this.shadow.frustumCulled = false; this.shadow.renderOrder = -1;
    scene.add(this.shadow);

    // banners carried in the front rank
    this.banners = [];
    const nb = cfg.banners ?? 0;
    for (let i = 0; i < nb; i++) {
      const u = this.units[Math.floor(((i + 0.5) / nb) * Math.min(cfg.cols, n))];
      if (!u) continue;
      const grp = new C.Group();
      const pole = new C.Mesh(ensureOutlineNormals(new C.CylinderGeometry(0.04, 0.04, 4.2, 6)), toon(COL.darkWood));
      pole.position.y = 2.1; grp.add(pole);
      pole.add(new C.Mesh(pole.geometry, outlineMaterial(OL)));
      const flagGeo = new C.PlaneGeometry(1.6, 1.1, 10, 4);
      flagGeo.translate(0.8, 0, 0);
      const flag = new C.Mesh(flagGeo, toon(0xffffff, { map: banner(cfg.bannerKind ?? 'fleur'), side: C.DoubleSide }));
      flag.position.y = 3.6; grp.add(flag);
      flag.userData.base = flagGeo.attributes.position.array.slice();
      scene.add(grp);
      this.banners.push({ grp, flag, unit: u });
    }
    this.speedAt = this.speedAt.bind(this);
  }

  /** distance advanced at time T (integral of the schedule) */
  advance(T) {
    let d = 0;
    for (const [t0, t1, v] of this.cfg.schedule ?? []) {
      if (T > t0) d += (Math.min(T, t1) - t0) * v;
    }
    return d;
  }
  speedAt(T) {
    for (const [t0, t1, v] of this.cfg.schedule ?? []) if (T >= t0 && T < t1) return v;
    return 0;
  }
  /** world position of unit i at time T */
  unitPos(u, T, out = new C.Vector3()) {
    const d = this.advance(Math.max(0, T - u.lag));
    return out.set(u.x + this.dir.x * d, 0, u.z + this.dir.z * d);
  }

  update(T, { aim = 0, visible = true } = {}) {
    for (const k in this.meshes) if (this.meshes[k]) this.meshes[k].visible = visible;
    this.shadow.visible = visible;
    for (const b of this.banners) b.grp.visible = visible;
    if (!visible) return;
    const { meshes } = this;
    const horse = !!meshes.horse;
    const isArcher = this.cfg.type === 'archer';
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const moving = this.speedAt(T - u.lag) > 0;
      const p = T + u.phase;
      const w = moving ? Math.sin(p * (horse ? 4 : 5)) : 0;
      const bob = moving ? 0.04 * Math.abs(Math.cos(p * (horse ? 4 : 5))) : 0.01 * Math.sin(p * 1.7);
      this.unitPos(u, T, _v);
      _q.setFromEuler(_e.set(0, u.yaw, 0));
      _b.compose(_v.setY(bob), _q, _s);

      // shadow
      _m.compose(_v.set(_v.x, 0.03, _v.z), _q, _s.set(horse ? 1.4 : 0.9, 1, horse ? 2.2 : 0.9));
      this.shadow.setMatrixAt(i, _m); _s.set(1, 1, 1);

      // horse: rider sits at y ~1.12
      let riderY = 0.36;
      if (horse) {
        meshes.horse.setMatrixAt(i, _b);
        meshes.cap.setMatrixAt(i, _b);
        riderY = 1.42;
      }
      // torso frame
      const lean = moving && !horse ? 0.12 : 0.02 * Math.sin(p * 1.3);
      _t.makeTranslation(0, riderY, horse ? -0.05 : 0);
      _r.makeRotationX(lean);
      const torso = _m.multiplyMatrices(_b, _t).multiply(_r);
      meshes.body.setMatrixAt(i, torso);
      meshes.head.setMatrixAt(i, torso);
      // arms: aim raises both arms (with the bow) skyward
      const a = isArcher ? aim : 0;
      const armRot = a > 0 ? -1.9 * a : (moving ? 0.25 * w : 0.04 * Math.sin(p * 1.8));
      const arms = _t.copy(torso).multiply(_r.makeTranslation(0, 0.44, 0)).multiply(_r.makeRotationX(armRot));
      meshes.arms.setMatrixAt(i, arms);
      if (horse) {
        meshes.riderLegs.setMatrixAt(i, _t.multiplyMatrices(_b, _r.makeTranslation(0, riderY, -0.05)));
      } else {
        for (const [mesh, s] of [[meshes.legL, 1], [meshes.legR, -1]]) {
          _t.multiplyMatrices(_b, _r.makeTranslation(s * 0.1, 0.36, 0));
          _t.multiply(_r.makeRotationX(0.5 * w * s));
          mesh.setMatrixAt(i, _t);
        }
      }
    }
    for (const k in meshes) if (meshes[k]) meshes[k].instanceMatrix.needsUpdate = true;
    this.shadow.instanceMatrix.needsUpdate = true;

    // banners
    for (const b of this.banners) {
      this.unitPos(b.unit, T, _v);
      b.grp.position.set(_v.x + 0.35, 0, _v.z);
      const pos = b.flag.geometry.attributes.position, base = b.flag.userData.base;
      for (let k = 0; k < pos.count; k++) {
        const x = base[k * 3];
        pos.setZ(k, Math.sin(x * 3 - T * 5 + b.unit.phase) * 0.12 * x);
        pos.setY(k, base[k * 3 + 1] - x * 0.06 * (1 + Math.sin(T * 2)));
      }
      pos.needsUpdate = true;
      b.flag.geometry.computeVertexNormals();
    }
  }

  /** world positions of every unit at time T (used to aim/launch arrows) */
  positions(T) { return this.units.map((u) => this.unitPos(u, T)); }
}
