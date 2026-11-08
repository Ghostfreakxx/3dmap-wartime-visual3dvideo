// The (fictional) detention compound: walls with razor wire, four guard towers with
// searchlights, a two-storey house with an interior set for the rescue scene.
import * as THREE from 'three';
import { toon, inked } from '../toon.js';
import { heightAt, POSTP } from '../mnf/terrain.js';

const C = THREE;
export const CPD = { x: POSTP.x, z: POSTP.z, half: 14 };
export const cy = () => heightAt(CPD.x, CPD.z);
export const BLD = { x: CPD.x, z: CPD.z + 5, w: 10, d: 8, h: 7 }; // front wall at z = CPD.z + 1

export function makeCompound(scene) {
  const g = new C.Group(); const y0 = cy(); g.position.set(CPD.x, y0, CPD.z); scene.add(g);
  const wall = toon(0xb9b0a0), dark = toon(0x2a2724), wood = toon(0x6b4f34), roof = toon(0x7a7f86);
  const H = CPD.half;
  // perimeter wall (gate gap on the south side)
  const seg = (x, z, w, d) => { const m = inked(new C.BoxGeometry(w, 3, d), wall, 0.04); m.position.set(x, 1.5, z); g.add(m); };
  seg(0, H, 2 * H, 0.6); seg(-H, 0, 0.6, 2 * H); seg(H, 0, 0.6, 2 * H); seg(-H / 2 - 2, -H, H - 4, 0.6); seg(H / 2 + 2, -H, H - 4, 0.6);
  // razor wire coils
  const wireMat = toon(0x3a3a3a);
  for (const [x0, z0, x1, z1] of [[-H, H, H, H], [-H, -H, -H, H], [H, -H, H, H], [-H, -H, -4, -H], [4, -H, H, -H]]) {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.7);
    for (let i = 0; i < n; i++) { const t = new C.Mesh(new C.TorusGeometry(0.3, 0.025, 4, 10), wireMat); t.position.set(x0 + (x1 - x0) * (i / n), 3.3, z0 + (z1 - z0) * (i / n)); t.rotation.y = Math.atan2(x1 - x0, z1 - z0); g.add(t); }
  }
  // guard towers with searchlights
  const towers = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const t = new C.Group(); t.position.set(sx * (H - 1), 0, sz * (H - 1)); g.add(t);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = inked(new C.CylinderGeometry(0.1, 0.12, 4.6, 6), wood, 0.03); l.position.set(a * 0.9, 2.3, b * 0.9); t.add(l); }
    const plat = inked(new C.BoxGeometry(2.4, 0.2, 2.4), wood, 0.03); plat.position.y = 4.6; t.add(plat);
    const rail = inked(new C.BoxGeometry(2.4, 0.9, 2.4), wood, 0.03); rail.position.y = 5.1; rail.scale.set(1, 1, 1); t.add(rail);
    const rf = inked(new C.ConeGeometry(2.0, 1.0, 4), roof, 0.03); rf.position.y = 7.4; rf.rotation.y = Math.PI / 4; t.add(rf);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = inked(new C.CylinderGeometry(0.06, 0.06, 1.8, 5), wood, 0.02); p.position.set(a * 1.05, 6.0, b * 1.05); t.add(p); }
    const beam = new C.Mesh(new C.ConeGeometry(2.4, 18, 20, 1, true), new C.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.08, depthWrite: false, side: C.DoubleSide, fog: false }));
    const pivot = new C.Group(); pivot.position.set(0, 5.6, 0); t.add(pivot);
    beam.position.set(0, -9, 0); pivot.add(beam); pivot.userData.beam = beam;
    const fire = new C.Group(); fire.visible = false; t.add(fire);
    for (let i = 0; i < 6; i++) {
      const mat = new C.MeshBasicMaterial({ color: [0xf06a22, 0xff9a2a, 0xffd060][i % 3], fog: false });
      const f = new C.Group(); const r = 0.35 + (i % 3) * 0.15, hh = 1.1 + (i % 2) * 0.6;
      f.add(new C.Mesh(new C.SphereGeometry(r, 8, 6), mat)); const tip = new C.Mesh(new C.ConeGeometry(r, hh, 8), mat); tip.position.y = hh / 2; f.add(tip);
      f.position.set(((i * 37) % 10) / 10 * 1.8 - 0.9, 5.0, ((i * 53) % 10) / 10 * 1.8 - 0.9); fire.add(f);
    }
    towers.push({ g: t, pivot, fire, sx, sz, burnAt: -1, top: new C.Vector3(CPD.x + sx * (H - 1), y0 + 4.7, CPD.z + sz * (H - 1)) });
  }
  // the house — exterior
  const ext = new C.Group(); ext.position.set(BLD.x - CPD.x, 0, BLD.z - CPD.z); g.add(ext);
  const shell = inked(new C.BoxGeometry(BLD.w, BLD.h, BLD.d), toon(0xd8cfb8), 0.05); shell.position.y = BLD.h / 2; ext.add(shell);
  const rf = inked(new C.BoxGeometry(BLD.w + 0.6, 0.3, BLD.d + 0.6), roof, 0.04); rf.position.y = BLD.h + 0.15; ext.add(rf);
  const lit = new C.MeshBasicMaterial({ color: 0xffd98a });
  for (const [x, yy] of [[-3, 5], [0, 5], [3, 5], [-3, 1.8], [3, 1.8]]) { const w = new C.Mesh(new C.BoxGeometry(1.2, 1.1, 0.05), lit); w.position.set(x, yy, -BLD.d / 2 - 0.03); ext.add(w); for (const k of [-1, 1]) { const bar = new C.Mesh(new C.BoxGeometry(0.06, 1.1, 0.06), dark); bar.position.set(x + k * 0.25, yy, -BLD.d / 2 - 0.06); ext.add(bar); } }
  const door = inked(new C.BoxGeometry(1.4, 2.4, 0.15), wood, 0.03); door.position.set(0, 1.2, -BLD.d / 2 - 0.06); ext.add(door);
  const doorHole = new C.Mesh(new C.BoxGeometry(1.4, 2.4, 0.05), dark); doorHole.position.set(0, 1.2, -BLD.d / 2 - 0.02); ext.add(doorHole);
  const bulb = new C.Mesh(new C.SphereGeometry(0.15, 8, 6), new C.MeshBasicMaterial({ color: 0xfff0c0, fog: false })); bulb.position.set(0, 2.9, -BLD.d / 2 - 0.2); ext.add(bulb);
  const yard = new C.PointLight(0xffd9a0, 28, 30, 1.3); yard.position.set(0, 3.2, -BLD.d / 2 - 3); ext.add(yard);
  const gateL = new C.PointLight(0xffe2b0, 22, 26, 1.3); gateL.position.set(0, 4, -H + 2); g.add(gateL);
  // the house — interior set (no outlines; seen from inside)
  const int = new C.Group(); int.position.copy(ext.position); int.visible = false; g.add(int);
  const im = (c) => new C.MeshToonMaterial({ color: c, side: C.DoubleSide, gradientMap: shell.material.gradientMap });
  const wallM = im(0xcfc3a6), floorM = im(0x7a6248);
  const plane = (w, h, m, pos, rot) => { const p = new C.Mesh(new C.PlaneGeometry(w, h), m); p.position.set(...pos); p.rotation.set(...rot); int.add(p); return p; };
  plane(BLD.w, BLD.d, floorM, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
  plane(BLD.w, BLD.d, im(0xbdb39a), [0, 3.2, 0], [Math.PI / 2, 0, 0]);
  plane(BLD.w, 3.2, wallM, [0, 1.6, BLD.d / 2], [0, Math.PI, 0]);
  plane(BLD.d, 3.2, wallM, [-BLD.w / 2, 1.6, 0], [0, Math.PI / 2, 0]);
  plane(BLD.d, 3.2, wallM, [BLD.w / 2, 1.6, 0], [0, -Math.PI / 2, 0]);
  plane((BLD.w - 1.4) / 2, 3.2, wallM, [-(BLD.w + 1.4) / 4, 1.6, -BLD.d / 2], [0, 0, 0]);
  plane((BLD.w - 1.4) / 2, 3.2, wallM, [(BLD.w + 1.4) / 4, 1.6, -BLD.d / 2], [0, 0, 0]);
  plane(1.4, 0.8, wallM, [0, 2.8, -BLD.d / 2], [0, 0, 0]);
  const furn = (geo, c, pos) => { const m = inked(geo, toon(c), 0.02); m.position.set(...pos); int.add(m); return m; };
  furn(new C.BoxGeometry(0.6, 0.08, 0.6), 0x6b4f34, [2, 0.45, 2.4]); furn(new C.BoxGeometry(0.6, 0.7, 0.08), 0x6b4f34, [2, 0.8, 2.72]);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) furn(new C.BoxGeometry(0.06, 0.45, 0.06), 0x5a4028, [2 + a * 0.25, 0.22, 2.4 + b * 0.25]);
  furn(new C.BoxGeometry(1.2, 0.08, 0.7), 0x6b4f34, [3.6, 0.75, 2.6]); furn(new C.BoxGeometry(0.1, 0.75, 0.1), 0x5a4028, [3.1, 0.37, 2.4]); furn(new C.BoxGeometry(0.1, 0.75, 0.1), 0x5a4028, [4.1, 0.37, 2.8]);
  furn(new C.BoxGeometry(2.2, 0.5, 1.2), 0xe8e2d4, [-3.4, 0.25, 2.8]);
  furn(new C.CylinderGeometry(0.12, 0.2, 0.45, 10), 0xd8b84a, [3.6, 1.0, 2.6]);
  const books = furn(new C.BoxGeometry(0.4, 0.12, 0.3), 0x8a2a2a, [3.9, 0.85, 2.5]);
  const vase = furn(new C.CylinderGeometry(0.08, 0.1, 0.25, 8), 0x3a6aa8, [3.3, 0.92, 2.7]);
  [0xffffff, 0xf2c23a, 0xf08aa0].forEach((c, i) => furn(new C.SphereGeometry(0.07, 8, 6), c, [3.3 + (i - 1) * 0.06, 1.12, 2.7]));
  const lamp = new C.PointLight(0xffd090, 10, 12, 1.6); lamp.position.set(3.4, 1.6, 2.4); int.add(lamp);
  const bulbIn = new C.Mesh(new C.SphereGeometry(0.12, 8, 6), new C.MeshBasicMaterial({ color: 0xfff0c0 })); bulbIn.position.set(3.6, 1.35, 2.6); int.add(bulbIn);
  return { g, towers, ext, int, door, y0 };
}

export function animateCompound(c, T) {
  c.towers.forEach((t, i) => {
    t.pivot.rotation.set(0.9, Math.sin(T * 0.5 + i * 1.7) * 1.1 + (t.sz > 0 ? Math.PI : 0), 0);
    t.pivot.userData.beam.visible = t.burnAt < 0 || T < t.burnAt;
    t.fire.visible = t.burnAt >= 0 && T >= t.burnAt;
    if (t.fire.visible) t.fire.children.forEach((f, k) => f.scale.set(1 + 0.15 * Math.sin(T * 12 + k), 1 + 0.3 * Math.sin(T * 9 + k), 1 + 0.15 * Math.cos(T * 11 + k)));
  });
}
