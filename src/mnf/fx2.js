// Extra effects for the convoy film: rifle shots, bullet dust, explosions, burning smoke.
import * as THREE from 'three';
import { FX } from '../lushai/fx.js';

const C = THREE;
export class FX2 extends FX {
  constructor() { super(); this.shakes = []; }

  shot(t, pos, dir, heavy = false) {
    const R = this.R;
    this.p.push({ t0: t, life: 0.06, pos: pos.clone(), vel: dir.clone().multiplyScalar(1.5), g: 0, r0: heavy ? 0.28 : 0.2, r1: heavy ? 0.4 : 0.3, col: 0xffe27a, a0: 1, a1: 1 });
    this.p.push({ t0: t, life: 0.9, pos: pos.clone(), vel: dir.clone().multiplyScalar(0.6).add(new C.Vector3(0, 0.3, 0)), g: 0, drag: 2, r0: 0.08, r1: heavy ? 0.4 : 0.28, col: 0xd8d8d0, a0: 0.5, a1: 0 });
  }
  dust(t, pos) {
    const R = this.R;
    for (let i = 0; i < 3; i++) this.p.push({ t0: t, life: 0.5 + R() * 0.3, pos: pos.clone(), vel: new C.Vector3((R() - 0.5) * 1.2, 1.2 + R() * 1.4, (R() - 0.5) * 1.2), g: 4, r0: 0.08, r1: 0.22, col: 0xa48a62, a0: 0.9, a1: 0 });
  }
  spark(t, pos) {
    const R = this.R;
    for (let i = 0; i < 3; i++) this.p.push({ t0: t, life: 0.18, pos: pos.clone(), vel: new C.Vector3((R() - 0.5) * 4, R() * 3, (R() - 0.5) * 4), g: 6, r0: 0.05, r1: 0.02, col: 0xfff0a0, a0: 1, a1: 1 });
  }
  explosion(t, pos, size = 1) {
    const R = this.R;
    this.shakes.push([t, size]);
    this.p.push({ t0: t, life: 0.25, pos: pos.clone().add(new C.Vector3(0, 0.5 * size, 0)), vel: new C.Vector3(), g: 0, r0: 0.6 * size, r1: 3.2 * size, col: 0xfff2a0, a0: 1, a1: 0.6 });
    for (let i = 0; i < 14; i++) {
      const v = new C.Vector3((R() - 0.5) * 6, 2 + R() * 5, (R() - 0.5) * 6).multiplyScalar(size);
      this.p.push({ t0: t + 0.02, life: 0.7 + R() * 0.4, pos: pos.clone().add(new C.Vector3(0, 0.6, 0)), vel: v, g: 0.5, drag: 2.2, r0: 0.5 * size, r1: (1.2 + R()) * size, col: [0xff7a20, 0xffb030, 0xf05018][i % 3], a0: 1, a1: 0 });
    }
    for (let i = 0; i < 12; i++) {
      const v = new C.Vector3((R() - 0.5) * 9, 5 + R() * 7, (R() - 0.5) * 9).multiplyScalar(Math.sqrt(size));
      this.p.push({ t0: t, life: 1.3 + R() * 0.6, pos: pos.clone().add(new C.Vector3(0, 0.5, 0)), vel: v, g: 9.8, r0: 0.12, r1: 0.1, col: 0x2a2420, a0: 1, a1: 1 });
    }
    for (let i = 0; i < 10; i++) {
      const v = new C.Vector3((R() - 0.5) * 2, 1.5 + R() * 2, (R() - 0.5) * 2).multiplyScalar(size);
      this.p.push({ t0: t + 0.15 + R() * 0.3, life: 4 + R() * 3, pos: pos.clone().add(new C.Vector3(0, 0.8, 0)), vel: v, g: -0.1, drag: 0.6, r0: 0.6 * size, r1: (2.4 + R() * 1.5) * size, col: R() < 0.5 ? 0x3a3634 : 0x55504c, a0: 0.9, a1: 0 });
    }
    this.splats.push({ t0: t, x: pos.x, z: pos.z, s: 1.8 * size, r: R() * 6, scorch: true });
  }
  /** a burning wreck: a column of black smoke from t0 to t1 */
  smokeColumn(t0, t1, posFn, rate = 4) {
    const R = this.R;
    for (let t = t0; t < t1; t += 1 / rate) {
      const pos = posFn(t);
      this.p.push({ t0: t, life: 5 + R() * 2, pos: pos.clone().add(new C.Vector3((R() - 0.5) * 1.2, 0, (R() - 0.5) * 1.2)), vel: new C.Vector3(0.6 + R() * 0.4, 2.4 + R(), (R() - 0.5) * 0.4), g: -0.05, drag: 0.15, r0: 0.4, r1: 2.6 + R() * 1.2, col: R() < 0.5 ? 0x2c2a28 : 0x46423e, a0: 0.85, a1: 0 });
    }
  }
  shake(T) {
    let a = 0;
    for (const [t, s] of this.shakes) { const d = T - t; if (d > 0 && d < 0.6) a = Math.max(a, 0.18 * s * (1 - d / 0.6)); }
    return a;
  }
  build(scene) {
    super.build(scene);
    // scorch marks render as dark grey instead of blood
    this.scorch = this.splats.map((s) => !!s.scorch);
    const col = new C.InstancedBufferAttribute(new Float32Array(this.splats.length * 3), 3);
    this.splats.forEach((s, i) => new C.Color(s.scorch ? 0x24201e : 0x8a0f18).toArray(col.array, i * 3));
    this.splatMesh.instanceColor = col;
    this.splatMesh.material.color.set(0xffffff);
  }
}
