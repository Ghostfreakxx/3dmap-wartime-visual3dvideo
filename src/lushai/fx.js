// Deterministic particles: musket smoke, muzzle flashes, cartoon blood. Everything is a
// function of time so the film scrubs and renders frame-exactly.
import * as THREE from 'three';
import { rng } from '../toon.js';
import { heightAt } from './terrain.js';

const C = THREE;

export class FX {
  constructor() { this.p = []; this.splats = []; this.R = rng(1234); }

  musket(t, pos, dir) {
    const R = this.R;
    for (let i = 0; i < 2; i++) this.p.push({ t0: t, life: 0.09, pos: pos.clone(), vel: dir.clone().multiplyScalar(2), g: 0, r0: 0.25, r1: 0.45, col: i ? 0xfff2a0 : 0xffa030, a0: 1, a1: 1 });
    for (let i = 0; i < 9; i++) {
      const v = dir.clone().multiplyScalar(0.8 + R() * 1.6).add(new C.Vector3((R() - 0.5) * 0.6, 0.25 + R() * 0.4, (R() - 0.5) * 0.6));
      this.p.push({ t0: t + R() * 0.08, life: 2.6 + R() * 1.4, pos: pos.clone(), vel: v, g: 0.05, drag: 1.4, r0: 0.1, r1: 0.55 + R() * 0.45, col: R() < 0.5 ? 0xeeeeea : 0xd6d8d4, a0: 0.8, a1: 0 });
    }
  }

  blood(t, pos, dir, amount = 1) {
    const R = this.R;
    const n = Math.round(16 * amount);
    for (let i = 0; i < n; i++) {
      const v = dir.clone().multiplyScalar(1 + R() * 2.2).add(new C.Vector3((R() - 0.5) * 2.4, 1.2 + R() * 2.6, (R() - 0.5) * 2.4));
      this.p.push({ t0: t + R() * 0.05, life: 0.55 + R() * 0.35, pos: pos.clone(), vel: v, g: 9.8, r0: 0.05 + R() * 0.05, r1: 0.03, col: R() < 0.5 ? 0xb0101c : 0xd01a26, a0: 1, a1: 1 });
    }
    const sp = pos.clone().addScaledVector(dir, 0.6 + R() * 0.4);
    this.splats.push({ t0: t + 0.35, x: sp.x + (R() - 0.5) * 0.4, z: sp.z + (R() - 0.5) * 0.4, s: (0.35 + R() * 0.3) * (0.6 + 0.5 * amount), r: R() * 6 });
  }

  build(scene) {
    const geo = new C.IcosahedronGeometry(1, 1);
    const n = this.p.length;
    this.col = new C.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.alpha = new C.InstancedBufferAttribute(new Float32Array(n), 1);
    geo.setAttribute('aColor', this.col);
    geo.setAttribute('aAlpha', this.alpha);
    const mat = new C.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `attribute vec3 aColor; attribute float aAlpha; varying vec3 vC; varying float vA; varying vec3 vN;
        void main(){ vC = aColor; vA = aAlpha; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vC; varying float vA; varying vec3 vN;
        void main(){ float l = dot(vN, normalize(vec3(0.3,1.0,0.4))); vec3 c = vC * (l > 0.2 ? 1.0 : 0.78);
          if (vA <= 0.001) discard; gl_FragColor = vec4(c, vA);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new C.InstancedMesh(geo, mat, n);
    this.mesh.frustumCulled = false;
    this.p.forEach((q, i) => new C.Color(q.col).toArray(this.col.array, i * 3));
    this.col.needsUpdate = true;
    scene.add(this.mesh);

    const sg = new C.CircleGeometry(1, 9).rotateX(-Math.PI / 2);
    // jagged edge so it reads as a splat
    const sp = sg.attributes.position;
    for (let i = 1; i < sp.count; i++) { const k = 0.7 + 0.3 * ((i * 7) % 5) / 4; sp.setX(i, sp.getX(i) * k); sp.setZ(i, sp.getZ(i) * k); }
    this.splatMesh = new C.InstancedMesh(sg, new C.MeshBasicMaterial({ color: 0x8a0f18, polygonOffset: true, polygonOffsetFactor: -2 }), Math.max(1, this.splats.length));
    this.splatMesh.frustumCulled = false;
    scene.add(this.splatMesh);
  }

  update(T) {
    const m = new C.Matrix4(), q = new C.Quaternion(), s = new C.Vector3(), p = new C.Vector3();
    this.p.forEach((o, i) => {
      const u = (T - o.t0) / o.life;
      if (u < 0 || u > 1) { this.alpha.array[i] = 0; m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, m); return; }
      const tt = T - o.t0;
      const d = o.drag ? (1 - Math.exp(-o.drag * tt)) / o.drag : tt;
      p.copy(o.pos).addScaledVector(o.vel, d); p.y -= 0.5 * o.g * tt * tt;
      const r = o.r0 + (o.r1 - o.r0) * Math.sqrt(u);
      m.compose(p, q, s.setScalar(r));
      this.mesh.setMatrixAt(i, m);
      this.alpha.array[i] = o.a0 + (o.a1 - o.a0) * u;
    });
    this.mesh.instanceMatrix.needsUpdate = true; this.alpha.needsUpdate = true;
    this.splats.forEach((o, i) => {
      const k = Math.min(1, Math.max(0, (T - o.t0) / 0.3));
      m.compose(p.set(o.x, heightAt(o.x, o.z) + 0.03, o.z), q.setFromAxisAngle(new C.Vector3(0, 1, 0), o.r), s.set(o.s * k + 1e-4, 1, o.s * k * 0.8 + 1e-4));
      this.splatMesh.setMatrixAt(i, m);
    });
    this.splatMesh.instanceMatrix.needsUpdate = true;
  }
}
