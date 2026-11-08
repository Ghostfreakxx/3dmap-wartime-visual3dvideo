// Cartoon vehicles: Shaktiman truck, jeep, IAF jet. Each vehicle has a "burnt" twin mesh
// and a fire group that the film switches on when it is hit.
import * as THREE from 'three';
import { part, merge, vcToon, outlineMaterial } from '../toon.js';

const C = THREE;
const P = (geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => part(geo, color, { pos, rot, scale });
const Bx = (x, y, z) => new C.BoxGeometry(x, y, z);
const OG = 0x55633a, OGD = 0x44502e, TYRE = 0x1d1b1a, GLASS = 0x3a5a78, CANVAS = 0x6f7450;

let _mat, _ol;
function inkMesh(geo) {
  _mat ??= vcToon(); _ol ??= outlineMaterial(0.035);
  const m = new C.Mesh(geo, _mat); m.add(new C.Mesh(geo, _ol)); return m;
}
function charred(geo) {
  const g = geo.clone(), c = g.attributes.color;
  for (let i = 0; i < c.count; i++) { const k = 0.18 + 0.12 * ((i * 13) % 7) / 7; c.setXYZ(i, c.getX(i) * k + 0.04, c.getY(i) * k + 0.03, c.getZ(i) * k + 0.03); }
  return g;
}
function wheel(r, w) {
  return merge([P(new C.CylinderGeometry(r, r, w, 16), TYRE, [0, 0, 0], [0, 0, Math.PI / 2]), P(new C.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 10), OGD, [0, 0, 0], [0, 0, Math.PI / 2])]);
}
function flames(n, spread) {
  const g = new C.Group();
  const list = [];
  for (let i = 0; i < n; i++) {
    const t = new C.Group();
    const c = [0xf06a22, 0xff9a2a, 0xffd060][i % 3];
    const mat = new C.MeshBasicMaterial({ color: c, fog: false });
    const r = 0.3 + ((i * 37) % 10) / 25, h = 1.0 + ((i * 53) % 10) / 8;
    t.add(new C.Mesh(new C.SphereGeometry(r, 8, 6), mat));
    const tip = new C.Mesh(new C.ConeGeometry(r, h, 8), mat); tip.position.y = h / 2; t.add(tip);
    t.position.set(((i * 71) % 10 / 10 - 0.5) * spread[0], 0, ((i * 29) % 10 / 10 - 0.5) * spread[1]);
    g.add(t); list.push(t);
  }
  g.userData.list = list; g.visible = false;
  return g;
}

function build(geo, wheels, fire) {
  const root = new C.Group();
  const body = new C.Group(); root.add(body);
  const ok = inkMesh(geo), burnt = inkMesh(charred(geo)); burnt.visible = false;
  body.add(ok, burnt);
  const ws = wheels.map(([x, y, z, r, w]) => { const m = inkMesh(wheel(r, w)); m.position.set(x, y, z); body.add(m); return m; });
  body.add(fire);
  return { root, body, ok, burnt, wheels: ws, fire, burning: -1, wheelR: wheels[0][3] };
}

export function makeTruck() {
  const p = [
    P(Bx(2.2, 0.3, 6.8), 0x2a2a26, [0, 0.95, -0.3]),
    P(Bx(2.5, 1.4, 1.8), OG, [0, 1.95, 2.3]), P(Bx(2.52, 0.12, 1.85), OGD, [0, 2.7, 2.3]),
    P(Bx(2.2, 0.75, 0.05), GLASS, [0, 2.25, 3.22]), P(Bx(0.05, 0.6, 1.1), GLASS, [1.27, 2.25, 2.4]), P(Bx(0.05, 0.6, 1.1), GLASS, [-1.27, 2.25, 2.4]),
    P(Bx(2.2, 0.95, 0.75), OG, [0, 1.55, 3.55]), P(Bx(1.5, 0.6, 0.04), 0x2a2a26, [0, 1.55, 3.93]),
    P(new C.SphereGeometry(0.16, 10, 8), 0xf4f0d8, [0.85, 1.75, 3.92]), P(new C.SphereGeometry(0.16, 10, 8), 0xf4f0d8, [-0.85, 1.75, 3.92]),
    P(Bx(2.6, 0.18, 0.2), 0x2a2a26, [0, 1.05, 4.0]), P(Bx(0.7, 0.22, 0.03), 0xf4f0e8, [0, 1.05, 4.11]),
    P(Bx(2.6, 0.18, 1.4), OGD, [0, 1.25, 3.3]),
    // cargo bed with benches
    P(Bx(2.6, 0.2, 4.6), OG, [0, 1.3, -1.05]),
    P(Bx(0.1, 0.6, 4.6), OG, [1.27, 1.7, -1.05]), P(Bx(0.1, 0.6, 4.6), OG, [-1.27, 1.7, -1.05]), P(Bx(2.6, 0.6, 0.1), OG, [0, 1.7, -3.3]),
    P(Bx(0.32, 0.1, 4.2), 0x6e5236, [0.98, 1.72, -1.05]), P(Bx(0.32, 0.1, 4.2), 0x6e5236, [-0.98, 1.72, -1.05]),
    // canopy rolled up at the front + hoops
    P(new C.CylinderGeometry(1.3, 1.3, 0.7, 16, 1, true, -Math.PI / 2, Math.PI), CANVAS, [0, 2.0, 0.85], [Math.PI / 2, 0, 0]),
    P(new C.TorusGeometry(1.3, 0.04, 4, 16, Math.PI), OGD, [0, 2.0, -1.2]), P(new C.TorusGeometry(1.3, 0.04, 4, 16, Math.PI), OGD, [0, 2.0, -2.9]),
    P(Bx(0.4, 0.3, 0.02), 0xf4f0e8, [0.7, 1.65, -3.36]), // tactical sign
  ];
  const wheels = [[1.15, 0.55, 2.6, 0.55, 0.4], [-1.15, 0.55, 2.6, 0.55, 0.4], [1.15, 0.55, -1.6, 0.55, 0.4], [-1.15, 0.55, -1.6, 0.55, 0.4], [1.15, 0.55, -2.75, 0.55, 0.4], [-1.15, 0.55, -2.75, 0.55, 0.4]];
  const f = flames(9, [2.2, 5]); f.position.set(0, 1.5, 0);
  const v = build(merge(p), wheels, f);
  // seats: [x, y, z, facing]  (root of a seated actor)
  v.seats = [];
  for (let i = 0; i < 4; i++) { v.seats.push([0.88, 1.42, -2.6 + i * 1.05, -Math.PI / 2]); v.seats.push([-0.88, 1.42, -2.6 + i * 1.05, Math.PI / 2]); }
  v.cab = [[-0.55, 1.75, 2.3, 0], [0.55, 1.75, 2.3, 0]];
  v.length = 7;
  return v;
}

export function makeJeep() {
  const p = [
    P(Bx(1.7, 0.7, 3.3), OG, [0, 0.95, 0]), P(Bx(1.6, 0.4, 1.2), OG, [0, 1.35, 1.0]),
    P(Bx(1.3, 0.35, 0.05), 0x2a2a26, [0, 1.15, 1.66]),
    P(new C.SphereGeometry(0.13, 10, 8), 0xf4f0d8, [0.55, 1.3, 1.62]), P(new C.SphereGeometry(0.13, 10, 8), 0xf4f0d8, [-0.55, 1.3, 1.62]),
    P(Bx(1.7, 0.7, 0.05), GLASS, [0, 1.85, 0.35]), P(Bx(1.75, 0.06, 0.08), OGD, [0, 2.2, 0.35]),
    P(Bx(0.5, 0.15, 0.5), 0x3a3020, [0.4, 1.38, -0.2]), P(Bx(0.5, 0.15, 0.5), 0x3a3020, [-0.4, 1.38, -0.2]), P(Bx(1.4, 0.15, 0.5), 0x3a3020, [0, 1.38, -1.1]),
    P(new C.TorusGeometry(0.35, 0.12, 6, 12), 0x1d1b1a, [0, 1.15, -1.75]),
    P(Bx(0.6, 0.2, 0.03), 0xf4f0e8, [0, 1.05, 1.67]),
    P(new C.CylinderGeometry(0.02, 0.02, 2.4, 4), 0x2a2a26, [-0.75, 2.4, -1.4]), // radio aerial
  ];
  const wheels = [[0.85, 0.42, 1.15, 0.42, 0.3], [-0.85, 0.42, 1.15, 0.42, 0.3], [0.85, 0.42, -1.1, 0.42, 0.3], [-0.85, 0.42, -1.1, 0.42, 0.3]];
  const f = flames(6, [1.4, 2.6]); f.position.set(0, 1.2, 0);
  const v = build(merge(p), wheels, f);
  v.seats = [[-0.4, 1.05, -0.2, 0], [0.4, 1.05, -0.2, 0], [-0.4, 1.05, -1.1, 0], [0.4, 1.05, -1.1, 0]];
  v.length = 3.6;
  return v;
}

export function makeJet() {
  const SIL = 0x9aa3ab, DK = 0x3a4048;
  const wingShape = new C.Shape();
  wingShape.moveTo(0, 0.9); wingShape.lineTo(3.6, -1.2); wingShape.lineTo(3.6, -2.0); wingShape.lineTo(0, -1.2); wingShape.closePath();
  const wing = (s) => { const g = new C.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: false }); g.rotateX(Math.PI / 2); if (s < 0) g.scale(-1, 1, 1); g.translate(0, 0.05, 0); return g.toNonIndexed(); };
  const finShape = new C.Shape(); finShape.moveTo(0, 0); finShape.lineTo(-1.4, 1.8); finShape.lineTo(-2.0, 1.8); finShape.lineTo(-1.6, 0); finShape.closePath();
  const fin = new C.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: false }); fin.rotateY(Math.PI / 2); fin.translate(0, 0.3, -2.4);
  const parts = [
    P(new C.CapsuleGeometry(0.6, 6, 6, 14).toNonIndexed(), SIL, [0, 0, 0], [Math.PI / 2, 0, 0]),
    P(new C.SphereGeometry(0.45, 12, 8).toNonIndexed(), 0x6fa8d8, [0, 0.45, 1.6], [0, 0, 0], [0.8, 0.7, 1.6]),
    P(new C.CylinderGeometry(0.45, 0.45, 0.2, 12).toNonIndexed(), DK, [0, 0, 3.55], [Math.PI / 2, 0, 0]),
    P(wing(1), SIL), P(wing(-1), SIL), P(fin.toNonIndexed(), SIL),
  ];
  // IAF roundels (saffron / white / green)
  for (const s of [-1, 1]) [[0.55, 0xff9933], [0.36, 0xffffff], [0.18, 0x138808]].forEach(([r, c], i) => parts.push(P(new C.CylinderGeometry(r, r, 0.02, 16).toNonIndexed(), c, [s * 2.4, 0.12 + i * 0.01, -0.8])));
  parts.forEach((g) => { if (g.index) g.toNonIndexed(); });
  const geo = merge(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  const root = new C.Group(); root.add(inkMesh(geo));
  const flame = new C.Mesh(new C.ConeGeometry(0.35, 1.4, 10), new C.MeshBasicMaterial({ color: 0xffa040, fog: false }));
  flame.rotation.x = -Math.PI / 2; flame.position.z = -4.2; root.add(flame);
  return { root };
}

/** per-frame: wheels spin with distance; fire flickers; burnt mesh after ignition */
export function animateVehicle(v, T, dist) {
  v.wheels.forEach((w) => (w.rotation.x = dist / v.wheelR));
  const on = v.burning >= 0 && T >= v.burning;
  v.fire.visible = on; v.ok.visible = !on; v.burnt.visible = on;
  if (on) v.fire.userData.list.forEach((f, i) => f.scale.set(1 + 0.15 * Math.sin(T * 13 + i), 1 + 0.3 * Math.sin(T * 9 + i * 2), 1 + 0.15 * Math.cos(T * 11 + i)));
}
