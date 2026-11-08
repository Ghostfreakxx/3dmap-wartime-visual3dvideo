// Lushai Hills world: terrain meshes, jungle, bamboo, ravine river, mist, hilltop village & sahlam.
import * as THREE from 'three';
import { toon, vcToon, part, merge, inked, outlineMaterial, ensureOutlineNormals, rng } from '../toon.js';
import { heightAt, noise, pathY, PATH_HALF, VILLAGE, villageY, RIVER_Z } from './terrain.js';

const C = THREE;
const ss = THREE.MathUtils.smoothstep;

// ------------------------------------------------------------------ terrain
const COLS = {
  path: new C.Color(0xa07a4e), rut: new C.Color(0x8a6640), jungle: new C.Color(0x557a30), jungle2: new C.Color(0x4a6e2a),
  rock: new C.Color(0x7e6c50), valley: new C.Color(0x5b8838), far: new C.Color(0x4f7a35), village: new C.Color(0xae8a5c), grass: new C.Color(0x7c9a45),
};
function colorFor(x, z, slope, out) {
  const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  if (dv < VILLAGE.r) return out.copy(noise(x * 0.3, z * 0.3) > 0.45 ? COLS.village : COLS.grass);
  if (Math.abs(z) < PATH_HALF && Math.abs(x) < 400) return out.copy(Math.abs(Math.abs(z) - 0.8) < 0.25 ? COLS.rut : COLS.path);
  if (slope > 1.25) return out.copy(COLS.rock);
  if (Math.abs(z - RIVER_Z) < 10) return out.copy(COLS.valley);
  return out.copy(noise(x * 0.08, z * 0.08) > 0.5 ? COLS.jungle : COLS.jungle2);
}
function terrainPatch(x0, x1, z0, z1, step, sink = null) {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const g = new C.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).toNonIndexed();
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let y = heightAt(x, z);
    if (sink && sink(x, z)) y -= 0.8;
    pos.setY(i, y);
  }
  g.computeVertexNormals();
  const col = new Float32Array(pos.count * 3), c = new C.Color(), n = g.attributes.normal;
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const ny = Math.max(0.05, n.getY(i));
    colorFor(cx, cz, Math.sqrt(1 - ny * ny) / ny, c);
    for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3);
  }
  g.setAttribute('color', new C.BufferAttribute(col, 3));
  return new C.Mesh(g, vcToon());
}
const DETAIL = { x0: -110, x1: 110, z0: -14, z1: 20 };
const inDetail = (x, z) => x > DETAIL.x0 + 1 && x < DETAIL.x1 - 1 && z > DETAIL.z0 + 1 && z < DETAIL.z1 - 1;
const inVillage = (x, z) => Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 38;

// ------------------------------------------------------------------ sky
function makeSky() {
  const mat = new C.ShaderMaterial({
    side: C.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new C.Color() }, horizon: { value: new C.Color() }, bottom: { value: new C.Color() }, sunDir: { value: new C.Vector3(0, 0.1, -1) }, sunColor: { value: new C.Color() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, horizon, bottom, sunColor, sunDir; varying vec3 vDir;
      void main(){ float h = vDir.y;
        vec3 col = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.6, h), 0.75)) : mix(horizon, bottom, smoothstep(0.0, 0.12, -h));
        float d = dot(normalize(vDir), normalize(sunDir));
        col += sunColor * smoothstep(0.9985, 0.9992, d) + sunColor * 0.35 * smoothstep(0.9, 1.0, d);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new C.Mesh(new C.SphereGeometry(1400, 32, 16), mat);
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

// ------------------------------------------------------------------ vegetation
function bambooGeo(R) {
  const p = [];
  const n = 7 + Math.floor(R() * 5);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r = R() * 0.7, h = 7 + R() * 5, lean = 0.08 + R() * 0.18;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const tx = bx + Math.cos(a) * lean * h, tz = bz + Math.sin(a) * lean * h;
    const dir = new C.Vector3(tx - bx, h, tz - bz);
    const q = new C.Quaternion().setFromUnitVectors(new C.Vector3(0, 1, 0), dir.clone().normalize());
    const e = new C.Euler().setFromQuaternion(q);
    const culm = part(new C.CylinderGeometry(0.07, 0.1, dir.length(), 6), i % 3 ? 0x7da23c : 0x93b04a, { pos: [(bx + tx) / 2, h / 2, (bz + tz) / 2], rot: [e.x, e.y, e.z] });
    p.push(culm);
    for (let k = 0; k < 6; k++) { // narrow drooping leaf sprays along the upper culm
      const f = 0.5 + k * 0.09, a2 = R() * Math.PI * 2;
      p.push(part(new C.SphereGeometry(1, 6, 4), k % 2 ? 0x5f8f2e : 0x76a63a, { pos: [bx + (tx - bx) * f + Math.cos(a2) * 0.7, h * f - 0.2, bz + (tz - bz) * f + Math.sin(a2) * 0.7], scale: [0.95, 0.12, 0.28], rot: [0, -a2, -0.5] }));
    }
  }
  return merge(p);
}
function jungleTreeGeo(green, dark) {
  return merge([
    part(new C.CylinderGeometry(0.4, 0.6, 7, 7), 0x6b5236, { pos: [0, 3.5, 0] }),
    part(new C.SphereGeometry(3.0, 10, 7), green, { pos: [0, 8.2, 0], scale: [1.2, 0.7, 1.2] }),
    part(new C.SphereGeometry(2.3, 10, 7), dark, { pos: [2.2, 7.2, 0.8], scale: [1.1, 0.7, 1.1] }),
    part(new C.SphereGeometry(2.2, 10, 7), green, { pos: [-2.0, 7.5, -0.6], scale: [1.1, 0.7, 1.1] }),
    part(new C.SphereGeometry(1.8, 10, 7), dark, { pos: [0.3, 9.6, -1.0], scale: [1.1, 0.7, 1.1] }),
  ]);
}
function bananaGeo() {
  const p = [part(new C.CylinderGeometry(0.16, 0.22, 2.4, 6), 0x6e8a3a, { pos: [0, 1.2, 0] })];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push(part(new C.SphereGeometry(1, 8, 4), i % 2 ? 0x76a83a : 0x86b844, { pos: [Math.cos(a) * 1.1, 2.4, Math.sin(a) * 1.1], scale: [1.4, 0.08, 0.38], rot: [0, -a, -0.45] }));
  }
  return merge(p);
}
function fernGeo() {
  const p = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    p.push(part(new C.SphereGeometry(1, 6, 4), i % 2 ? 0x4f8a2c : 0x5f9a34, { pos: [Math.cos(a) * 0.5, 0.35, Math.sin(a) * 0.5], scale: [0.7, 0.07, 0.2], rot: [0, -a, -0.5] }));
  }
  return merge(p);
}
function scatter(scene, geo, pts, outline = 0.05) {
  if (!pts.length) return null;
  const m = new C.InstancedMesh(geo, vcToon(), pts.length);
  const mtx = new C.Matrix4();
  pts.forEach(([x, z, s, r], i) => {
    mtx.compose(new C.Vector3(x, heightAt(x, z) - 0.15, z), new C.Quaternion().setFromEuler(new C.Euler(0, r, 0)), new C.Vector3(s, s, s));
    m.setMatrixAt(i, mtx);
  });
  scene.add(m);
  if (outline) { const o = new C.InstancedMesh(geo, outlineMaterial(outline), pts.length); o.instanceMatrix = m.instanceMatrix; scene.add(o); }
  return m;
}

/** spots kept clear of plants so the camera can see the actors */
export const CLEAR = [];
const isClear = (x, z) => CLEAR.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r);

function makeVegetation(scene) {
  const R = rng(7);
  const near = Math.abs;
  const okPath = (x, z) => near(z) > PATH_HALF + 0.8 && !isClear(x, z) && !inVillage(x, z);
  const bamboo = [], trees = [], bananas = [], ferns = [];
  // dense bamboo on the slope above the path (the warriors' cover)
  for (let i = 0; i < 900; i++) {
    const x = -110 + R() * 220, z = 3.6 + Math.pow(R(), 1.3) * 60;
    if (okPath(x, z)) bamboo.push([x, z, 0.8 + R() * 0.5, R() * 6]);
  }
  for (let i = 0; i < 260; i++) {
    const x = -110 + R() * 220, z = -3.4 - R() * 30;
    if (okPath(x, z)) bamboo.push([x, z, 0.7 + R() * 0.5, R() * 6]);
  }
  // jungle canopy over the hills
  for (let i = 0; i < 4200; i++) {
    const x = -520 + R() * 1040, z = -420 + R() * 900;
    if (near(z) < 8 && near(x) < 120) continue;
    if (Math.abs(z - RIVER_Z) < 4) continue;
    if (!okPath(x, z)) continue;
    trees.push([x, z, 0.8 + R() * 0.7, R() * 6]);
  }
  for (let i = 0; i < 500; i++) {
    const x = -110 + R() * 220, z = (R() < 0.6 ? 3.2 + R() * 14 : -3 - R() * 10);
    if (okPath(x, z)) bananas.push([x, z, 0.8 + R() * 0.5, R() * 6]);
  }
  for (let i = 0; i < 1600; i++) {
    const x = -110 + R() * 220, z = (R() < 0.5 ? 2.5 + R() * 8 : -2.5 - R() * 4);
    if (near(z) > PATH_HALF + 0.2 && !isClear(x, z)) ferns.push([x, z, 0.6 + R() * 0.8, R() * 6]);
  }
  // bushes & trees around the village
  for (let i = 0; i < 260; i++) {
    const a = R() * Math.PI * 2, r = 40 + R() * 40;
    trees.push([VILLAGE.x + Math.cos(a) * r, VILLAGE.z + Math.sin(a) * r, 0.7 + R() * 0.6, R() * 6]);
  }
  const bambooVariants = [bambooGeo(rng(1)), bambooGeo(rng(2)), bambooGeo(rng(3))];
  bambooVariants.forEach((g, k) => scatter(scene, g, bamboo.filter((_, i) => i % 3 === k), 0.035));
  scatter(scene, jungleTreeGeo(0x4f7f2c, 0x3f6a26), trees.filter((_, i) => i % 2 === 0), 0.07);
  scatter(scene, jungleTreeGeo(0x5f8f34, 0x46742a), trees.filter((_, i) => i % 2 === 1), 0.07);
  scatter(scene, bananaGeo(), bananas, 0.03);
  scatter(scene, fernGeo(), ferns, 0);
}

// ------------------------------------------------------------------ panji (sharpened bamboo spikes along the path)
export function makePanji(scene, ranges) {
  const geo = merge([
    part(new C.CylinderGeometry(0.035, 0.045, 0.9, 5), 0xc7b46a, { pos: [0, 0.45, 0] }),
    part(new C.ConeGeometry(0.035, 0.18, 5), 0xe8dcaa, { pos: [0, 0.99, 0] }),
  ]);
  const R = rng(31), pts = [];
  for (const [x0, x1] of ranges) for (let x = x0; x < x1; x += 0.35) for (const s of [-1, 1]) {
    if (R() < 0.35) continue;
    const z = s * (PATH_HALF + 0.15 + R() * 0.5);
    pts.push([x + R() * 0.2, z, s]);
  }
  const m = new C.InstancedMesh(geo, vcToon(), pts.length);
  const o = new C.InstancedMesh(geo, outlineMaterial(0.02), pts.length); o.instanceMatrix = m.instanceMatrix;
  const mtx = new C.Matrix4();
  pts.forEach(([x, z, s], i) => {
    mtx.compose(new C.Vector3(x, heightAt(x, z) - 0.15, z), new C.Quaternion().setFromEuler(new C.Euler(s * 0.45 + (R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.4)), new C.Vector3(1, 0.8 + R() * 0.5, 1));
    m.setMatrixAt(i, mtx);
  });
  scene.add(m, o);
}

// ------------------------------------------------------------------ river & mist
function makeRiver() {
  const g = new C.PlaneGeometry(1100, 7, 220, 1).rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = RIVER_Z + pos.getZ(i) + 4 * Math.sin(x * 0.02);
    pos.setZ(i, z); pos.setY(i, Math.min(heightAt(x, z - 2), heightAt(x, z + 2), heightAt(x, z)) + 0.35);
  }
  return new C.Mesh(g, new C.MeshBasicMaterial({ color: 0x8fc4d6 }));
}
function mistTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,255,255,0.75)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new C.CanvasTexture(c);
}
function makeMist(scene) {
  const R = rng(5), tex = mistTexture(), list = [];
  const mat = new C.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55 });
  for (let i = 0; i < 46; i++) {
    const x = -300 + R() * 600, z = RIVER_Z + (R() - 0.5) * 60 + (R() < 0.3 ? -80 - R() * 120 : 0);
    const m = new C.Mesh(new C.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat);
    const s = 40 + R() * 60;
    m.scale.set(s * 1.6, 1, s);
    m.position.set(x, heightAt(x, z) + 4 + R() * 6, z);
    m.userData.x0 = x; m.userData.speed = 0.3 + R() * 0.6;
    scene.add(m); list.push(m);
  }
  return { list, mat };
}

// ------------------------------------------------------------------ village
function house(R, big = false) {
  const g = new C.Group();
  const w = big ? 9 : 4.5 + R() * 1.5, d = big ? 12 : 6 + R() * 2, hgt = big ? 3.2 : 2.4;
  const stilt = 1.3;
  const wood = toon(0x7a5a38), bam = toon(0xc9a86a), thatch = toon(0x9b7a44);
  for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) {
    const p = inked(new C.CylinderGeometry(0.12, 0.14, stilt + 3, 6), wood, 0.03);
    p.position.set(sx * w / 2 * 0.9, (stilt - 3) / 2 + 0.2, sz * d / 2 * 0.9); g.add(p);
  }
  const floor = inked(new C.BoxGeometry(w + 0.4, 0.25, d + 2.4), wood, 0.04); floor.position.set(0, stilt, 1.0); g.add(floor);
  const walls = inked(new C.BoxGeometry(w, hgt, d), bam, 0.05); walls.position.y = stilt + hgt / 2; g.add(walls);
  // woven-bamboo pattern lines
  for (let k = 1; k < 4; k++) {
    const l = new C.Mesh(new C.BoxGeometry(w + 0.02, 0.05, d + 0.02), toon(0xa8884e)); l.position.y = stilt + (hgt * k) / 4; g.add(l);
  }
  const roof = inked(new C.CylinderGeometry(w * 0.78, w * 0.78, d + 2.6, 3, 1).rotateX(-Math.PI / 2), thatch, 0.06);
  roof.scale.set(1, 0.7, 1); roof.position.set(0, stilt + hgt + w * 0.3, 0.6); g.add(roof);
  const door = inked(new C.BoxGeometry(0.9, 1.6, 0.1), toon(0x3a2a1c), 0.02); door.position.set(0, stilt + 0.9, d / 2 + 0.03); g.add(door);
  // mithun skull trophy over the door
  const sk = inked(new C.SphereGeometry(0.25, 8, 6), toon(0xf1eadb), 0.02); sk.position.set(0, stilt + hgt - 0.2, d / 2 + 0.2); g.add(sk);
  for (const s of [-1, 1]) { const h = inked(new C.ConeGeometry(0.07, 0.6, 6), toon(0x2b2522), 0.01); h.position.set(s * 0.35, stilt + hgt - 0.05, d / 2 + 0.2); h.rotation.z = -s * 1.1; g.add(h); }
  return g;
}

export const SAHLAM = { x: VILLAGE.x - 14, z: VILLAGE.z - 20 };
function makeSahlam() {
  // a forked post at the village gate where heads were hung
  const g = new C.Group();
  const wood = toon(0x5e4630);
  const post = inked(new C.CylinderGeometry(0.22, 0.3, 4.6, 8), wood, 0.05); post.position.y = 2.3; g.add(post);
  for (const s of [-1, 1]) {
    const b = inked(new C.CylinderGeometry(0.12, 0.16, 2.4, 6), wood, 0.04);
    b.position.set(s * 0.7, 4.8, 0); b.rotation.z = -s * 0.55; g.add(b);
  }
  const bar = inked(new C.CylinderGeometry(0.1, 0.1, 3.6, 6), wood, 0.03); bar.rotation.z = Math.PI / 2; bar.position.y = 3.7; g.add(bar);
  // old weathered skulls already hanging
  const skullMat = toon(0xece4d0);
  const hooks = [];
  for (let i = 0; i < 8; i++) {
    const x = -1.6 + (i / 7) * 3.2;
    hooks.push(new C.Vector3(x, 3.7, 0));
  }
  [0, 2, 5, 7].forEach((k) => {
    const sk = inked(new C.SphereGeometry(0.2, 10, 8), skullMat, 0.02);
    sk.position.copy(hooks[k]).add(new C.Vector3(0, -0.55, 0)); sk.scale.set(1, 1.1, 1); g.add(sk);
    for (const s of [-1, 1]) { const e = new C.Mesh(new C.SphereGeometry(0.05, 6, 5), toon(0x2b2522)); e.position.copy(sk.position).add(new C.Vector3(s * 0.07, 0.02, 0.17)); g.add(e); }
    const str = new C.Mesh(new C.CylinderGeometry(0.01, 0.01, 0.35, 4), toon(0x2b2522)); str.position.copy(hooks[k]).add(new C.Vector3(0, -0.2, 0)); g.add(str);
  });
  g.userData.hooks = [1, 3, 4, 6].map((k) => hooks[k]);
  return g;
}

function makeBonfire() {
  const g = new C.Group();
  for (let i = 0; i < 6; i++) {
    const log = inked(new C.CylinderGeometry(0.1, 0.1, 1.4, 6), toon(0x4a3424), 0.02);
    log.rotation.set(Math.PI / 2 - 0.5, (i * Math.PI) / 3, 0); log.position.y = 0.35; g.add(log);
  }
  const fire = new C.Group(); g.add(fire);
  const tongue = (r, h, c, x, z, tilt) => {
    const t = new C.Group(), mat = new C.MeshBasicMaterial({ color: c, fog: false });
    t.add(new C.Mesh(new C.SphereGeometry(r, 10, 8), mat));
    const tip = new C.Mesh(new C.ConeGeometry(r, h, 10), mat); tip.position.y = h / 2; t.add(tip);
    t.position.set(x, r + 0.1, z); t.rotation.z = tilt; fire.add(t); return t;
  };
  const flames = [tongue(0.42, 1.3, 0xf06a22, 0, 0, 0), tongue(0.3, 0.9, 0xf06a22, 0.3, 0.1, -0.35), tongue(0.28, 0.8, 0xf06a22, -0.3, -0.1, 0.4), tongue(0.26, 0.9, 0xffa630, 0, 0.15, 0.05), tongue(0.14, 0.5, 0xfff1a8, 0, 0.3, 0)];
  const light = new C.PointLight(0xff9a40, 0, 30, 1.4); light.position.y = 1.5; g.add(light);
  g.userData = { flames, light };
  return g;
}

function makeVillage(scene) {
  const g = new C.Group();
  const vy = villageY();
  g.position.set(VILLAGE.x, vy, VILLAGE.z);
  const R = rng(77);
  const spots = [[-12, 8, 0.4], [-4, 14, 0.1], [6, 13, -0.2], [14, 6, -0.6], [15, -6, -1.5], [-15, -4, 1.4], [-8, -12, 2.6], [4, -14, 3.0]];
  spots.forEach(([x, z, r]) => { const h = house(R); h.position.set(x, 0, z); h.rotation.y = r + Math.PI; g.add(h); });
  const zawlbuk = house(R, true); zawlbuk.position.set(-2, 0, 2); zawlbuk.rotation.y = Math.PI * 0.9; g.add(zawlbuk);
  scene.add(g);
  const sahlam = makeSahlam();
  sahlam.position.set(SAHLAM.x, heightAt(SAHLAM.x, SAHLAM.z), SAHLAM.z);
  sahlam.rotation.y = -0.6;
  scene.add(sahlam);
  const fire = makeBonfire();
  fire.position.set(VILLAGE.x + 4, vy, VILLAGE.z - 6);
  scene.add(fire);
  return { group: g, sahlam, fire };
}

// ------------------------------------------------------------------ clouds
function makeClouds() {
  const R = rng(13), parts = [];
  for (let i = 0; i < 60; i++) {
    const a = R() * Math.PI * 2, r = 120 + R() * 700;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 110 + R() * 60;
    const n = 4 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const s = 10 + R() * 12;
      parts.push(part(new C.SphereGeometry(1, 12, 8), 0xffffff, { pos: [cx + (k - n / 2) * s * 0.9, cy + R() * 4, cz + (R() - 0.5) * 14], scale: [s * 1.3, s * 0.6, s] }));
    }
  }
  const g = merge(parts);
  const m = new C.Mesh(g, toon(0xffffff));
  m.add(new C.Mesh(g, outlineMaterial(0.04, 0x3a3540)));
  return m;
}

// ------------------------------------------------------------------ moods
export const MOODS = {
  mist: { top: 0x7c9cb6, horizon: 0xdde5e2, bottom: 0xc3d0cf, fog: 0xc3d0cf, fogDensity: 0.0042, sun: 0x000000, sunDir: [0.5, 0.5, 0.4], sunLight: 0xfff3dc, sunI: 1.3, hemiSky: 0xd6e2ea, hemiGround: 0x4f5a38, hemiI: 1.5, cloud: 0xf2f4f2, mist: 0.6, fire: 0 },
  jungle: { top: 0x5a8ec2, horizon: 0xdbe7d6, bottom: 0xb6c9bb, fog: 0xb6c9bb, fogDensity: 0.0032, sun: 0x000000, sunDir: [0.4, 0.8, 0.3], sunLight: 0xfff1d6, sunI: 1.7, hemiSky: 0xd8e6f0, hemiGround: 0x4a5a32, hemiI: 1.45, cloud: 0xffffff, mist: 0.35, fire: 0 },
  battle: { top: 0x6d7c8a, horizon: 0xc9cdbf, bottom: 0xa8afa2, fog: 0xa8afa2, fogDensity: 0.0045, sun: 0x000000, sunDir: [0.4, 0.8, 0.3], sunLight: 0xf4ead6, sunI: 1.4, hemiSky: 0xc8d0d4, hemiGround: 0x4a4a32, hemiI: 1.45, cloud: 0xd0d4d6, mist: 0.3, fire: 0 },
  sunset: { top: 0x352a5a, horizon: 0xff9850, bottom: 0xb86a5a, fog: 0xb87060, fogDensity: 0.003, sun: 0xffe0a0, sunDir: [0.12, 0.07, -1], sunLight: 0xffa060, sunI: 1.6, hemiSky: 0x8a6aa0, hemiGround: 0x3a2a2a, hemiI: 0.8, cloud: 0xf0a080, mist: 0.4, fire: 0 },
  dusk: { top: 0x24245a, horizon: 0xd8805a, bottom: 0x4a4060, fog: 0x5a4a66, fogDensity: 0.003, sun: 0xff9a60, sunDir: [-0.6, 0.12, -0.8], sunLight: 0xffa070, sunI: 0.95, hemiSky: 0x9a8ac0, hemiGround: 0x3a3040, hemiI: 1.05, cloud: 0x6a4f78, mist: 0.0, fire: 1 },
};

export function buildWorld(scene) {
  const sky = makeSky(); scene.add(sky);
  scene.fog = new C.FogExp2(0xb6c9bb, 0.003);
  const hemi = new C.HemisphereLight(0xffffff, 0x444444, 1.4); scene.add(hemi);
  const sun = new C.DirectionalLight(0xffffff, 1.5); scene.add(sun);

  const sink = (x, z) => inDetail(x, z) || inVillage(x, z);
  scene.add(terrainPatch(-560, 560, -460, 520, 7, sink));
  scene.add(terrainPatch(DETAIL.x0, DETAIL.x1, DETAIL.z0, DETAIL.z1, 0.6));
  scene.add(terrainPatch(VILLAGE.x - 40, VILLAGE.x + 40, VILLAGE.z - 40, VILLAGE.z + 40, 1.2));
  scene.add(makeRiver());
  makeVegetation(scene);
  const mist = makeMist(scene);
  const village = makeVillage(scene);
  const clouds = makeClouds(); scene.add(clouds);

  let mood = MOODS.jungle;
  function applyMood(m) {
    mood = m;
    const u = sky.material.uniforms;
    u.top.value.set(m.top); u.horizon.value.set(m.horizon); u.bottom.value.set(m.bottom); u.sunColor.value.set(m.sun);
    u.sunDir.value.set(...m.sunDir).normalize();
    scene.fog.color.set(m.fog); scene.fog.density = m.fogDensity;
    sun.color.set(m.sunLight); sun.intensity = m.sunI; sun.position.set(...m.sunDir).multiplyScalar(100);
    hemi.color.set(m.hemiSky); hemi.groundColor.set(m.hemiGround); hemi.intensity = m.hemiI;
    clouds.material.color.set(m.cloud);
    mist.mat.opacity = m.mist; mist.list.forEach((x) => (x.visible = m.mist > 0.01));
  }
  function update(T, camera) {
    sky.position.copy(camera.position);
    mist.list.forEach((m) => { m.position.x = m.userData.x0 + Math.sin(T * 0.05 * m.userData.speed) * 20; });
    clouds.position.x = T * 0.6;
    const f = village.fire.userData;
    f.flames.forEach((fl, i) => fl.scale.set(1 + 0.12 * Math.sin(T * 13 + i), 1 + 0.25 * Math.sin(T * 9 + i * 2), 1 + 0.12 * Math.cos(T * 11 + i)));
    f.light.intensity = 40 * mood.fire * (0.85 + 0.15 * Math.sin(T * 17));
    village.fire.visible = mood.fire > 0;
  }
  return { applyMood, update, village };
}
