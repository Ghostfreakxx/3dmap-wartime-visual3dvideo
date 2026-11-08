// Generic utility helicopter in the style of a Black Hawk: open cabin doors, spinning rotors,
// motion-blur disc, searchlight, fictional "MIZO RANGERS" tail art.
import * as THREE from 'three';
import { part, merge, vcToon, outlineMaterial } from '../toon.js';
import { emblemCanvas } from './rig3.js';

const C = THREE;
const P = (geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => part(geo, color, { pos, rot, scale });
const Bx = (x, y, z) => new C.BoxGeometry(x, y, z);
const BODY = 0x2f3528, DARK = 0x1a1d17, GLASS = 0x2c4a5e;

let _m, _o;
const ink = (geo, w = 0.04) => { _m ??= vcToon(); _o ??= outlineMaterial(w); const m = new C.Mesh(geo, _m); m.add(new C.Mesh(geo, _o)); return m; };

export function makeHeli() {
  const root = new C.Group();
  const body = new C.Group(); root.add(body);
  // fuselage built in pieces so the cabin is open on both sides (doors slid back)
  const g = merge([
    P(Bx(2.3, 0.25, 4.2), BODY, [0, 0.9, 0.4]),                                     // cabin floor
    P(Bx(2.3, 0.3, 4.2), BODY, [0, 2.75, 0.4]),                                     // cabin roof
    P(Bx(0.2, 1.9, 0.3), BODY, [1.05, 1.85, -1.55]), P(Bx(0.2, 1.9, 0.3), BODY, [-1.05, 1.85, -1.55]), // rear pillars
    P(Bx(0.2, 1.9, 0.3), BODY, [1.05, 1.85, 2.35]), P(Bx(0.2, 1.9, 0.3), BODY, [-1.05, 1.85, 2.35]),
    P(new C.SphereGeometry(1.15, 18, 12), BODY, [0, 1.8, 3.1], [0, 0, 0], [1, 0.95, 1.25]), // nose
    P(Bx(1.9, 0.9, 1.1), GLASS, [0, 2.15, 3.55], [0.35, 0, 0]),                       // windscreen
    P(Bx(2.25, 1.6, 2.6), BODY, [0, 1.85, -2.9]),                                   // rear cabin
    P(new C.CylinderGeometry(0.28, 0.6, 6.2, 12), BODY, [0, 2.15, -7.2], [Math.PI / 2, 0, 0]), // tail boom
    P(Bx(0.18, 2.0, 1.1), BODY, [0, 3.2, -10.0], [-0.35, 0, 0]),                    // fin
    P(Bx(2.6, 0.1, 0.8), BODY, [0, 2.1, -9.7]),                                     // stabilator
    P(Bx(1.5, 0.65, 3.4), BODY, [0, 3.2, -0.2]),                                    // engine hump
    P(new C.CylinderGeometry(0.22, 0.22, 0.5, 10), DARK, [0.55, 3.2, 1.55], [Math.PI / 2, 0, 0]), P(new C.CylinderGeometry(0.22, 0.22, 0.5, 10), DARK, [-0.55, 3.2, 1.55], [Math.PI / 2, 0, 0]),
    P(Bx(0.12, 0.12, 1.2), DARK, [1.1, 0.35, 2.4]), P(Bx(0.12, 0.12, 1.2), DARK, [-1.1, 0.35, 2.4]),         // gear struts
    P(new C.CylinderGeometry(0.3, 0.3, 0.2, 12), 0x111111, [1.15, 0.3, 2.4], [0, 0, Math.PI / 2]), P(new C.CylinderGeometry(0.3, 0.3, 0.2, 12), 0x111111, [-1.15, 0.3, 2.4], [0, 0, Math.PI / 2]),
    P(new C.CylinderGeometry(0.18, 0.18, 0.12, 10), 0x111111, [0, 1.3, -9.4], [0, 0, Math.PI / 2]),
    P(Bx(2.1, 1.6, 0.05), 0x0f1110, [0, 1.85, 2.2]), P(Bx(2.1, 1.6, 0.05), 0x0f1110, [0, 1.85, -1.5]),        // cabin bulkheads (dark)
  ]);
  body.add(ink(g));
  // tail art
  const tex = new C.CanvasTexture(emblemCanvas(256)); tex.colorSpace = C.SRGBColorSpace;
  for (const s of [-1, 1]) {
    const decal = new C.Mesh(new C.PlaneGeometry(1.5, 1.5), new C.MeshBasicMaterial({ map: tex, transparent: true }));
    decal.position.set(s * 1.14, 1.95, -3.0); decal.rotation.y = s * Math.PI / 2; body.add(decal);
  }
  // rotors
  const mast = new C.Group(); mast.position.set(0, 3.75, 0.2); body.add(mast);
  mast.add(ink(merge([P(new C.CylinderGeometry(0.22, 0.25, 0.4, 10), DARK)]), 0.02));
  const blades = new C.Group(); mast.add(blades);
  for (let i = 0; i < 4; i++) { const b = ink(merge([P(Bx(0.42, 0.06, 7.6), DARK, [0, 0.12, 3.9])]), 0.02); b.rotation.y = (i * Math.PI) / 2; blades.add(b); }
  const disc = new C.Mesh(new C.CircleGeometry(7.8, 40).rotateX(-Math.PI / 2), new C.MeshBasicMaterial({ color: 0x0c0d0b, transparent: true, opacity: 0.18, depthWrite: false, side: C.DoubleSide }));
  disc.position.y = 0.14; mast.add(disc);
  const tail = new C.Group(); tail.position.set(0.3, 3.2, -10.3); body.add(tail);
  for (let i = 0; i < 4; i++) { const b = ink(merge([P(Bx(0.05, 1.4, 0.18), DARK, [0, 0.7, 0])]), 0.015); b.rotation.x = (i * Math.PI) / 2; tail.add(b); }
  // searchlight beam (switched on per shot)
  const beam = new C.Mesh(new C.ConeGeometry(4, 22, 24, 1, true), new C.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.09, depthWrite: false, side: C.DoubleSide, fog: false }));
  beam.position.set(0, -9.5, 4.8); beam.rotation.x = 0.25; beam.visible = false; body.add(beam);
  // nav lights
  const red = new C.Mesh(new C.SphereGeometry(0.09, 8, 6), new C.MeshBasicMaterial({ color: 0xff3030, fog: false })); red.position.set(-1.2, 2.8, 0.4); body.add(red);
  const grn = new C.Mesh(new C.SphereGeometry(0.09, 8, 6), new C.MeshBasicMaterial({ color: 0x30ff60, fog: false })); grn.position.set(1.2, 2.8, 0.4); body.add(grn);
  // seats: [x, y, z, facing] — on the door sills, facing out
  const seats = [];
  for (let i = 0; i < 4; i++) { seats.push([0.95, 0.66, -0.9 + i * 0.95, Math.PI / 2]); seats.push([-0.95, 0.66, -0.9 + i * 0.95, -Math.PI / 2]); }
  return { root, body, blades, tail, beam, red, seats, ropeAnchors: [[1.25, 2.6, 0.6], [-1.25, 2.6, 0.6]] };
}

/** keyframed flight: keys = [[t, x, y, z, yaw?]] ; pitch/roll derived from motion */
export class Flight {
  constructor(keys) { this.k = keys; }
  pos(T) {
    const K = this.k; let i = 0;
    while (i < K.length - 1 && K[i + 1][0] <= T) i++;
    const a = K[i], b = K[i + 1];
    if (!b || T <= a[0]) return new C.Vector3(a[1], a[2], a[3]);
    let u = (T - a[0]) / (b[0] - a[0]); u = u * u * (3 - 2 * u); // ease between keys
    return new C.Vector3(a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u);
  }
  apply(h, T) {
    const p = this.pos(T), p2 = this.pos(T + 0.25), v = p2.clone().sub(p).multiplyScalar(4);
    const speed = Math.hypot(v.x, v.z);
    const K = this.k; let i = 0; while (i < K.length - 1 && K[i + 1][0] <= T) i++;
    const yaw = K[i][4] ?? (speed > 1 ? Math.atan2(v.x, v.z) : (h._yaw ?? 0));
    h._yaw = yaw;
    h.root.position.copy(p);
    h.root.rotation.set(0, yaw, 0);
    h.body.rotation.set(Math.min(0.3, speed * 0.012) + 0.02 * Math.sin(T * 1.3), 0, 0.03 * Math.sin(T * 0.9));
    h.blades.rotation.y = T * 29; h.tail.rotation.x = T * 47;
    h.red.visible = Math.sin(T * 6) > 0;
    h.root.updateMatrixWorld(true);
    return p;
  }
}
