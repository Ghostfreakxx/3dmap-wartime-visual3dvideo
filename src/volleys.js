// Arrow storms: deterministic in time, so the film can be scrubbed and recorded identically.
import * as THREE from 'three';
import { part, merge, vcToon, outlineMaterial, rng } from './toon.js';

const C = THREE;

export class Volleys {
  /**
   * volleys: [{ t, from: Squad[], to: Squad[], n }]
   */
  constructor(scene, volleys) {
    const geo = merge([
      part(new C.CylinderGeometry(0.03, 0.03, 1.1, 5), 0x9c6b3e, { pos: [0, 0, 0] }),
      part(new C.ConeGeometry(0.06, 0.18, 5), 0x6d737a, { pos: [0, 0.62, 0] }),
      part(new C.BoxGeometry(0.16, 0.22, 0.02), 0xf4f1ea, { pos: [0, -0.48, 0] }),
      part(new C.BoxGeometry(0.02, 0.22, 0.16), 0xf4f1ea, { pos: [0, -0.48, 0] }),
    ]);
    this.arrows = [];
    const R = rng(42);
    for (const v of volleys) {
      const starts = v.from.flatMap((s) => s.units.map((u) => [s, u]));
      const ends = v.to.flatMap((s) => s.units.map((u) => [s, u]));
      for (let i = 0; i < v.n; i++) {
        const [ss, su] = starts[Math.floor(R() * starts.length)];
        const [es, eu] = ends[Math.floor(R() * ends.length)];
        const launch = v.t + R() * 0.6;
        const dur = 2.6 + R() * 0.5;
        const a = ss.unitPos(su, launch).add(new C.Vector3(0, 2.4, 0));
        const b = es.unitPos(eu, launch + dur).add(new C.Vector3((R() - 0.5) * 2.4, -0.25, (R() - 0.5) * 2.4));
        this.arrows.push({ launch, dur, a, b, apex: 22 + R() * 8 });
      }
    }
    this.mesh = new C.InstancedMesh(geo, vcToon(), this.arrows.length);
    this.outline = new C.InstancedMesh(geo, outlineMaterial(0.02), this.arrows.length);
    this.outline.instanceMatrix = this.mesh.instanceMatrix;
    this.mesh.frustumCulled = this.outline.frustumCulled = false;
    scene.add(this.mesh, this.outline);
    this.volleys = volleys;
  }

  _at(ar, u, out, vel) {
    out.lerpVectors(ar.a, ar.b, u);
    out.y += 4 * ar.apex * u * (1 - u);
    vel.subVectors(ar.b, ar.a);
    vel.y += 4 * ar.apex * (1 - 2 * u);
    return out;
  }

  update(T) {
    const m = new C.Matrix4(), p = new C.Vector3(), v = new C.Vector3(), q = new C.Quaternion(), up = new C.Vector3(0, 1, 0);
    const zero = new C.Vector3(0, 0, 0), one = new C.Vector3(1.7, 1.7, 1.7); // oversized so they read on screen
    this.arrows.forEach((ar, i) => {
      const u = (T - ar.launch) / ar.dur;
      if (u < 0) { m.compose(p.set(0, -50, 0), q.identity(), zero); }
      else {
        this._at(ar, Math.min(u, 1), p, v);
        q.setFromUnitVectors(up, v.normalize());
        m.compose(p, q, one);
      }
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** 0..1: how raised the archers' bows are at time T (draw before each volley) */
  aim(T) {
    let a = 0;
    for (const v of this.volleys) {
      const d = T - v.t;
      if (d > -1.6 && d < 0.8) a = Math.max(a, d < 0 ? Math.min(1, (d + 1.6) / 0.9) : 1 - d / 0.8);
    }
    return a;
  }
}
