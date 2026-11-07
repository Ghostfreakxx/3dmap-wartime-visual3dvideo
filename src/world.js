// The battlefield: patchwork fields, muddy plain, river, woods, windmill, camp, sky, clouds and rain.
import * as THREE from 'three';
import { toon, vcToon, part, merge, inked, outlineMaterial, ensureOutlineNormals, rng } from './toon.js';
import { sailLattice, planks, blob } from './textures.js';
import { COL } from './characters.js';

const C = THREE;

export const LAYOUT = {
  englishLine: 20,       // z of the English front rank (facing -z)
  frenchLine: -26,       // z of the French front rank (facing +z)
  windmill: new C.Vector3(26, 0, 42),
  commanders: new C.Vector3(22, 0, 35),
  camp: new C.Vector3(-96, 0, 92),
  river: [[-220, 30], [-140, 0], [-92, -24], [-62, -62], [-50, -120], [-40, -210], [-30, -320]],
};

// ---------------------------------------------------------------- helpers
function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, z) { // cheap value noise
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const k = THREE.MathUtils.smoothstep(r, 150, 300);
  return k * (10 * noise(x * 0.012, z * 0.012) + 5 * Math.sin(x * 0.02) * Math.cos(z * 0.017) + 3);
}
function riverDist(x, z) {
  const P = LAYOUT.river;
  let best = 1e9;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const inBattlefield = (x, z) => Math.abs(x) < 50 && z > -70 && z < 32;

// ---------------------------------------------------------------- sky
function makeSky() {
  const mat = new C.ShaderMaterial({
    side: C.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new C.Color() }, horizon: { value: new C.Color() }, bottom: { value: new C.Color() },
      sunDir: { value: new C.Vector3(0.3, 0.12, -1).normalize() }, sunColor: { value: new C.Color() }, sunSize: { value: 0.02 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, horizon, bottom, sunColor, sunDir; uniform float sunSize; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 col = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.55, h), 0.7)) : mix(horizon, bottom, smoothstep(0.0, 0.15, -h));
        // posterise the gradient a little for a painted look
        float d = dot(normalize(vDir), sunDir);
        col += sunColor * smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.6, d);
        col += sunColor * 0.25 * smoothstep(0.85, 1.0, d);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new C.Mesh(new C.SphereGeometry(900, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// ---------------------------------------------------------------- ground
function makeGround() {
  const size = 1000, seg = 200;
  const g = new C.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2).toNonIndexed();
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  const palette = [0x86a04f, 0x9bb05a, 0xc3ad5f, 0x8f7c4c, 0x74924a, 0xa9b865, 0xb59a52].map((c) => new C.Color(c));
  const mud = new C.Color(0x6e5a40), mudDark = new C.Color(0x5b4a35), grass = new C.Color(0x7f9649), water = new C.Color(0x6aa6c6);
  const col = new Float32Array(pos.count * 3);
  const tmp = new C.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    if (riverDist(cx, cz) < 3.2) tmp.copy(water);
    else if (inBattlefield(cx, cz)) {
      // churned mud between the lines, grass toward the edges
      const n = noise(cx * 0.15, cz * 0.15);
      const mudness = (1 - Math.abs(cz + 4) / 34) * 1.3 + (n - 0.5);
      tmp.copy(mudness > 0.55 ? (n > 0.6 ? mudDark : mud) : grass);
    } else {
      const wx = cx + 8 * noise(cx * 0.03, cz * 0.03), wz = cz + 8 * noise(cz * 0.03 + 9, cx * 0.03);
      const cell = palette[Math.floor(hash(Math.floor(wx / 34), Math.floor(wz / 26)) * palette.length)];
      // ploughed furrows on some fields
      const furrow = hash(Math.floor(wx / 34), Math.floor(wz / 26) + 50) > 0.6 && Math.sin(wx * 1.2) > 0.3;
      tmp.copy(cell).multiplyScalar(furrow ? 0.9 : 1);
    }
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = tmp.r; col[(i + k) * 3 + 1] = tmp.g; col[(i + k) * 3 + 2] = tmp.b; }
  }
  g.setAttribute('color', new C.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new C.Mesh(g, vcToon());
}

function makeHedges(scene) {
  const R = rng(11);
  const segs = [];
  for (let gx = -12; gx <= 12; gx++) for (let gz = -14; gz <= 14; gz++) {
    const x = gx * 34, z = gz * 26;
    if (Math.hypot(x, z) > 420) continue;
    if (R() < 0.45) segs.push([x, z + 13, 0, 26]);
    if (R() < 0.45) segs.push([x + 17, z, Math.PI / 2, 34]);
  }
  const keep = segs.filter(([x, z]) => !inBattlefield(x, z) && riverDist(x, z) > 6 && Math.hypot(x - LAYOUT.camp.x, z - LAYOUT.camp.z) > 30);
  const geo = ensureOutlineNormals(new C.BoxGeometry(1, 1, 1));
  const m = new C.InstancedMesh(geo, toon(0x4f6e35), keep.length);
  const o = new C.InstancedMesh(geo, outlineMaterial(0.06), keep.length);
  o.instanceMatrix = m.instanceMatrix;
  const mtx = new C.Matrix4();
  keep.forEach(([x, z, rot, len], i) => {
    mtx.compose(new C.Vector3(x, heightAt(x, z) + 0.6, z), new C.Quaternion().setFromEuler(new C.Euler(0, rot, 0)), new C.Vector3(1.4, 1.4, len));
    m.setMatrixAt(i, mtx);
  });
  scene.add(m, o);
}

function makeRiver() {
  const P = LAYOUT.river.map(([x, z]) => new C.Vector3(x, 0, z));
  const curve = new C.CatmullRomCurve3(P);
  const pts = curve.getSpacedPoints(160);
  const verts = [], uvs = [], idx = [];
  pts.forEach((p, i) => {
    const t = curve.getTangentAt(i / (pts.length - 1));
    const n = new C.Vector3(-t.z, 0, t.x).multiplyScalar(3.4);
    for (const s of [-1, 1]) {
      const x = p.x + n.x * s, z = p.z + n.z * s;
      verts.push(x, heightAt(x, z) + 0.06, z);
      uvs.push((s + 1) / 2, i / 8);
    }
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const g = new C.BufferGeometry();
  g.setAttribute('position', new C.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new C.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // painted water texture (MeshBasicMaterial so it fogs like everything else)
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = '#6ba8cc'; x.fillRect(0, 0, 64, 128);
  x.fillStyle = '#d6ecf5';
  for (let i = 0; i < 6; i++) x.fillRect(16 + (i % 3) * 9, i * 21, 14, 3);
  x.fillStyle = '#2b2522'; x.fillRect(0, 0, 4, 128); x.fillRect(60, 0, 4, 128);
  const tex = new C.CanvasTexture(cv); tex.colorSpace = C.SRGBColorSpace; tex.wrapS = tex.wrapT = C.RepeatWrapping;
  const mat = new C.MeshBasicMaterial({ map: tex, side: C.DoubleSide });
  mat.userData.tex = tex;
  return new C.Mesh(g, mat);
}

// ---------------------------------------------------------------- vegetation
function treeGeo(green, dark) {
  return merge([
    part(new C.CylinderGeometry(0.35, 0.5, 3, 7), 0x6e4a2b, { pos: [0, 1.5, 0] }),
    part(new C.SphereGeometry(2.2, 10, 8), green, { pos: [0, 4.4, 0] }),
    part(new C.SphereGeometry(1.7, 10, 8), dark, { pos: [1.5, 3.6, 0.4] }),
    part(new C.SphereGeometry(1.6, 10, 8), green, { pos: [-1.4, 3.8, -0.3] }),
    part(new C.SphereGeometry(1.4, 10, 8), dark, { pos: [0.2, 5.6, -0.6] }),
  ]);
}
function pineGeo() {
  return merge([
    part(new C.CylinderGeometry(0.3, 0.4, 2, 6), 0x5a3d26, { pos: [0, 1, 0] }),
    part(new C.ConeGeometry(2.4, 3.4, 8), 0x2f4f3a, { pos: [0, 3.2, 0] }),
    part(new C.ConeGeometry(1.9, 3, 8), 0x37593f, { pos: [0, 4.9, 0] }),
    part(new C.ConeGeometry(1.3, 2.6, 8), 0x3f6447, { pos: [0, 6.5, 0] }),
  ]);
}
function scatter(scene, geo, points, outline = 0.08) {
  const m = new C.InstancedMesh(geo, vcToon(), points.length);
  const o = new C.InstancedMesh(geo, outlineMaterial(outline), points.length);
  o.instanceMatrix = m.instanceMatrix;
  const mtx = new C.Matrix4();
  points.forEach(([x, z, s, r], i) => {
    mtx.compose(new C.Vector3(x, heightAt(x, z) - 0.1, z), new C.Quaternion().setFromEuler(new C.Euler(0, r, 0)), new C.Vector3(s, s, s));
    m.setMatrixAt(i, mtx);
  });
  scene.add(m, o);
  return m;
}
function makeVegetation(scene) {
  const R = rng(3);
  const trees = [], pines = [];
  const ok = (x, z) => !inBattlefield(x, z) && riverDist(x, z) > 7 && Math.hypot(x - LAYOUT.windmill.x, z - LAYOUT.windmill.z) > 12;
  // woods hugging both flanks of the battlefield
  for (let i = 0; i < 700; i++) {
    const side = R() < 0.5 ? -1 : 1;
    const x = side * (53 + Math.pow(R(), 1.5) * 45), z = -80 + R() * 120;
    if (ok(x, z)) trees.push([x, z, 0.8 + R() * 0.6, R() * 6]);
  }
  // background tree lines behind both armies (the bushy horizon of the close-ups)
  for (let i = 0; i < 260; i++) {
    const x = -90 + R() * 180;
    const z = R() < 0.5 ? 62 + R() * 30 : -95 - R() * 30;
    if (ok(x, z)) trees.push([x, z, 0.9 + R() * 0.7, R() * 6]);
  }
  // scattered countryside
  for (let i = 0; i < 380; i++) {
    const a = R() * Math.PI * 2, r = 110 + R() * 300;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ok(x, z)) trees.push([x, z, 0.8 + R() * 0.8, R() * 6]);
  }
  // pine forest around the camp, plus some on far hills
  for (let i = 0; i < 220; i++) {
    const a = R() * Math.PI * 2, r = 14 + R() * 45;
    const x = LAYOUT.camp.x + Math.cos(a) * r, z = LAYOUT.camp.z + Math.sin(a) * r;
    if (Math.abs(a - 5.5) < 0.6 && r < 40) continue; // keep a view toward the mountains open
    pines.push([x, z, 0.8 + R() * 0.7, R() * 6]);
  }
  for (let i = 0; i < 260; i++) {
    const a = R() * Math.PI * 2, r = 260 + R() * 160;
    pines.push([Math.cos(a) * r, Math.sin(a) * r, 1 + R(), R() * 6]);
  }
  scatter(scene, treeGeo(0x6f9a45, 0x557f3a), trees.filter((_, i) => i % 2 === 0));
  scatter(scene, treeGeo(0x7ea94e, 0x5d8a3e), trees.filter((_, i) => i % 2 === 1));
  scatter(scene, pineGeo(), pines);
}

function makeMountains(scene) {
  const R = rng(5);
  const parts = [];
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + R() * 0.1;
    const r = 520 + R() * 80;
    const h = 70 + R() * 90, w = 80 + R() * 70;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    parts.push(part(new C.ConeGeometry(w, h, 6), 0x6d6a8a, { pos: [x, h / 2 - 5, z], rot: [0, R() * 3, 0] }));
    parts.push(part(new C.ConeGeometry(w * 0.32, h * 0.32, 6), 0xf1eef5, { pos: [x, h - h * 0.16 - 5 + 0.5, z], rot: [0, R() * 3, 0] }));
  }
  const g = merge(parts);
  // too far away for the scene fog: shown unfogged, only in the clear dusk mood
  const m = new C.Mesh(g, vcToon({ fog: false }));
  m.add(new C.Mesh(g, outlineMaterial(0.6)));
  scene.add(m);
  return m;
}

// ---------------------------------------------------------------- windmill & props
function makeWindmill() {
  const g = new C.Group();
  const wood = toon(0xffffff, { map: planks() });
  // trestle
  const legs = inked(new C.ConeGeometry(3, 4, 4, 1, true), toon(0x6e4a2b), 0.08);
  legs.position.y = 2; g.add(legs);
  const post = inked(new C.CylinderGeometry(0.4, 0.5, 5, 8), toon(0x6e4a2b), 0.06);
  post.position.y = 3; g.add(post);
  // body
  const body = inked(new C.BoxGeometry(4.4, 5.4, 4.4), wood, 0.08);
  body.position.y = 7.6; g.add(body);
  const roof = inked(new C.CylinderGeometry(3.2, 3.2, 5.0, 3, 1).rotateX(-Math.PI / 2), toon(0x8a5a3a), 0.08);
  roof.position.y = 11.3; roof.scale.set(1.0, 0.75, 1); g.add(roof);
  const door = inked(new C.BoxGeometry(1.2, 2, 0.1), toon(0x4a3020), 0.04);
  door.position.set(0, 6, -2.25); g.add(door);
  const win = inked(new C.BoxGeometry(0.8, 0.8, 0.1), toon(0x2b2522), 0.03);
  win.position.set(1.2, 8.8, 2.25); g.add(win);
  // sails
  const hub = new C.Group(); hub.position.set(0, 8.8, 2.6); g.add(hub);
  hub.add(inked(new C.CylinderGeometry(0.45, 0.45, 0.6, 12).rotateX(Math.PI / 2), toon(0x5a3d26), 0.05));
  const sailMat = toon(0xffffff, { map: sailLattice() });
  for (let i = 0; i < 4; i++) {
    const arm = new C.Group(); arm.rotation.z = (i * Math.PI) / 2; hub.add(arm);
    const spar = inked(new C.BoxGeometry(0.3, 8.5, 0.2), toon(0x6e4a2b), 0.05);
    spar.position.y = 4.4; arm.add(spar);
    const sail = inked(new C.BoxGeometry(1.7, 6.6, 0.08), sailMat, 0.05);
    sail.position.set(0.95, 5.0, 0.05); arm.add(sail);
  }
  g.userData.hub = hub;
  return g;
}

function makeHayCart() {
  const g = new C.Group();
  const bed = inked(new C.BoxGeometry(2, 0.5, 3.2), toon(0x9c6b3e), 0.05); bed.position.y = 1; g.add(bed);
  for (const s of [-1, 1]) {
    const w = inked(new C.TorusGeometry(0.6, 0.1, 6, 16), toon(0x6e4a2b), 0.04);
    w.rotation.y = Math.PI / 2; w.position.set(s * 1.1, 0.6, 0); g.add(w);
  }
  const hay = inked(new C.SphereGeometry(1.3, 14, 10), toon(0xe2c063), 0.05);
  hay.scale.set(0.85, 0.6, 1.25); hay.position.y = 1.5; g.add(hay);
  const shaft = inked(new C.BoxGeometry(0.12, 0.12, 2.4), toon(0x6e4a2b), 0.03); shaft.position.set(0.5, 0.8, 2.6); shaft.rotation.x = 0.25; g.add(shaft);
  return g;
}

function makeTent(color) {
  const g = new C.Group();
  const t = inked(new C.ConeGeometry(2.6, 3.6, 10), toon(color), 0.06); t.position.y = 1.8; g.add(t);
  const flap = inked(new C.ConeGeometry(0.8, 1.6, 3), toon(0x2b2522), 0.02); flap.position.set(0, 0.8, 2.2); g.add(flap);
  const top = inked(new C.SphereGeometry(0.18, 8, 6), toon(0xf2c53d), 0.02); top.position.y = 3.7; g.add(top);
  return g;
}

function makeTorch() {
  const g = new C.Group();
  const pole = inked(new C.CylinderGeometry(0.06, 0.06, 2.2, 6), toon(0x5a3d26), 0.03); pole.position.y = 1.1; g.add(pole);
  const flame = new C.Mesh(new C.ConeGeometry(0.16, 0.5, 8), new C.MeshBasicMaterial({ color: 0xffa13a }));
  flame.position.y = 2.45; g.add(flame);
  g.userData.flame = flame;
  return g;
}

function makeStakes(scene, xs, z) {
  const geo = merge([
    part(new C.CylinderGeometry(0.07, 0.08, 1.6, 6), 0x9c6b3e, { pos: [0, 0.8, 0] }),
    part(new C.ConeGeometry(0.07, 0.3, 6), 0xd9b98a, { pos: [0, 1.75, 0] }),
  ]);
  const R = rng(21);
  const pts = [];
  for (const [x0, x1] of xs) for (let x = x0; x <= x1; x += 0.9) pts.push([x + (R() - 0.5) * 0.3, z + (R() - 0.5) * 0.8 - (Math.round(x * 1.1) % 2) * 0.9]);
  const m = new C.InstancedMesh(geo, vcToon(), pts.length);
  const o = new C.InstancedMesh(geo, outlineMaterial(0.03), pts.length);
  o.instanceMatrix = m.instanceMatrix;
  const mtx = new C.Matrix4();
  pts.forEach(([x, zz], i) => {
    mtx.compose(new C.Vector3(x, -0.2, zz), new C.Quaternion().setFromEuler(new C.Euler(-0.55 + (R() - 0.5) * 0.2, (R() - 0.5) * 0.3, (R() - 0.5) * 0.2)), new C.Vector3(1, 1, 1));
    m.setMatrixAt(i, mtx);
  });
  scene.add(m, o);
}

function makePuddles(scene) {
  const R = rng(9);
  const g = new C.CircleGeometry(1, 18).rotateX(-Math.PI / 2);
  const n = 140;
  const m = new C.InstancedMesh(g, new C.MeshBasicMaterial({ color: 0xa5b4bd, transparent: true, opacity: 0.8 }), n);
  const mtx = new C.Matrix4();
  for (let i = 0; i < n; i++) {
    const x = (R() - 0.5) * 90, z = -22 + R() * 38;
    mtx.compose(new C.Vector3(x, 0.025, z), new C.Quaternion().setFromEuler(new C.Euler(0, R() * 3, 0)), new C.Vector3(0.6 + R() * 1.6, 1, 0.4 + R() * 0.9));
    m.setMatrixAt(i, mtx);
  }
  scene.add(m);
  return m;
}

// ---------------------------------------------------------------- camp (night prologue)
function makeCamp() {
  const g = new C.Group();
  const R = rng(17);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = inked(new C.SphereGeometry(0.17 + R() * 0.05, 8, 6), toon(0x8c8a90), 0.02);
    s.position.set(Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55); s.scale.y = 0.7; g.add(s);
  }
  for (let i = 0; i < 3; i++) {
    const log = inked(new C.CylinderGeometry(0.07, 0.07, 0.8, 6), toon(0x5a3d26), 0.02);
    log.rotation.set(Math.PI / 2, (i * Math.PI) / 3, 0.3); log.position.y = 0.12; g.add(log);
  }
  const fire = new C.Group(); g.add(fire);
  // flame tongues: teardrops (sphere base + cone tip), outer to inner
  const tongue = (r, h, c, x, z, tilt) => {
    const t = new C.Group();
    const mat = new C.MeshBasicMaterial({ color: c, fog: false });
    const base = new C.Mesh(new C.SphereGeometry(r, 12, 8), mat); t.add(base);
    const tip = new C.Mesh(new C.ConeGeometry(r, h, 12), mat); tip.position.y = h / 2; t.add(tip);
    t.position.set(x, r + 0.06, z); t.rotation.z = tilt; fire.add(t);
    return t;
  };
  const flames = [
    tongue(0.2, 0.55, 0xf06a22, 0, 0, 0), tongue(0.14, 0.4, 0xf06a22, 0.16, 0.05, -0.35), tongue(0.13, 0.36, 0xf06a22, -0.15, -0.04, 0.4),
    tongue(0.13, 0.42, 0xffa630, 0.02, 0.08, 0.05), tongue(0.07, 0.25, 0xfff1a8, 0, 0.16, 0),
  ];
  const light = new C.PointLight(0xff9a40, 6, 9, 1.6);
  light.position.y = 0.8; g.add(light);
  // hide-drying frame (left of the bowyer)
  const frame = new C.Group(); frame.position.set(-2.2, 0, -0.6); g.add(frame);
  for (const s of [-1, 1]) {
    const p = inked(new C.CylinderGeometry(0.04, 0.04, 1.9, 6), toon(0x5a3d26), 0.02);
    p.position.set(s * 0.55, 0.95, 0); p.rotation.z = -s * 0.08; frame.add(p);
  }
  const bar = inked(new C.CylinderGeometry(0.035, 0.035, 1.4, 6), toon(0x5a3d26), 0.02);
  bar.rotation.z = Math.PI / 2; bar.position.y = 1.75; frame.add(bar);
  const hide = inked(new C.BoxGeometry(0.85, 1.0, 0.03), toon(0xa27a52), 0.02); hide.position.y = 1.15; frame.add(hide);
  // wood shavings
  for (let i = 0; i < 26; i++) {
    const c = new C.Mesh(new C.BoxGeometry(0.05, 0.015, 0.03), toon(0xe9d6b0));
    c.position.set(0.35 + R() * 1.2, 0.01, 0.4 + R() * 0.8); c.rotation.y = R() * 3; g.add(c);
  }
  // a few unfinished staves leaning on a log
  const seat = inked(new C.CylinderGeometry(0.22, 0.22, 1.2, 10), toon(0x6e4a2b), 0.03);
  seat.rotation.z = Math.PI / 2; seat.position.set(1.5, 0.2, -0.05); g.add(seat);
  const blobM = new C.Mesh(new C.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), new C.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.18, depthWrite: false }));
  blobM.position.y = 0.02; g.add(blobM);
  g.userData = { flames, light, seat };
  return g;
}

// ---------------------------------------------------------------- clouds & rain
function makeClouds() {
  const R = rng(13);
  const parts = [];
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2, r = 40 + R() * 420;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 48 + R() * 30;
    const n = 4 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const s = 8 + R() * 10;
      parts.push(part(new C.SphereGeometry(1, 12, 8), 0xffffff, { pos: [cx + (k - n / 2) * s * 0.9, cy + R() * 3, cz + (R() - 0.5) * 12], scale: [s * 1.3, s * 0.55, s] }));
    }
  }
  const g = merge(parts);
  const mat = toon(0x5c626b, { fog: true });
  const m = new C.Mesh(g, mat);
  m.add(new C.Mesh(g, outlineMaterial(0.04, 0x262230)));
  return m;
}

function makeRain() {
  const N = 9000, BOX = new C.Vector3(70, 40, 70);
  const R = rng(99);
  const pos = new Float32Array(N * 2 * 3), seed = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = R() * BOX.x, y = R() * BOX.y, z = R() * BOX.z;
    for (let k = 0; k < 2; k++) {
      seed.set([x, y, z], (i * 2 + k) * 3);
      end[i * 2 + k] = k;
    }
  }
  const g = new C.BufferGeometry();
  g.setAttribute('position', new C.BufferAttribute(pos, 3));
  g.setAttribute('seed', new C.BufferAttribute(seed, 3));
  g.setAttribute('isEnd', new C.BufferAttribute(end, 1));
  const mat = new C.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, center: { value: new C.Vector3() }, box: { value: BOX }, opacity: { value: 0.5 } },
    vertexShader: `attribute vec3 seed; attribute float isEnd; uniform float time; uniform vec3 center, box;
      void main(){
        vec3 p = seed;
        p.y = mod(seed.y - time * 26.0, box.y);
        p.x = mod(seed.x + time * 3.0 - center.x, box.x);
        p.z = mod(seed.z - center.z, box.z);
        p += center - box * vec3(0.5, 0.25, 0.5);
        p += isEnd * vec3(0.12, 0.9, 0.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform float opacity; void main(){ gl_FragColor = vec4(0.88,0.9,0.95, opacity); }`,
  });
  const lines = new C.LineSegments(g, mat);
  lines.frustumCulled = false;
  return lines;
}

// ---------------------------------------------------------------- moods
export const MOODS = {
  storm: {
    top: 0x4a505b, horizon: 0x9aa0a3, bottom: 0x8d9396, fog: 0x8d9396, fogDensity: 0.0085, mountains: 0,
    sun: 0x000000, sunLight: 0xdfe6ea, sunI: 1.4, hemiSky: 0xbac4cc, hemiGround: 0x5a5040, hemiI: 1.6,
    cloud: 0x5d636c, rain: 0.55, exposure: 1.0, fire: 0,
  },
  stormDusk: {
    top: 0x3c3654, horizon: 0xcfae90, bottom: 0xa89a98, fog: 0xa89a98, fogDensity: 0.0055, mountains: 0,
    sun: 0xffe2b0, sunLight: 0xffd9b0, sunI: 1.6, hemiSky: 0xc0b4c8, hemiGround: 0x5d5040, hemiI: 1.4,
    cloud: 0x4f4762, rain: 0.35, exposure: 1.0, fire: 0,
  },
  dusk: {
    top: 0x2e2a55, horizon: 0xf09a62, bottom: 0x3a3048, fog: 0x6d5a72, fogDensity: 0.0035, mountains: 1,
    sun: 0xffc080, sunLight: 0xffa070, sunI: 0.7, hemiSky: 0x8a7aa8, hemiGround: 0x3a2a30, hemiI: 0.9,
    cloud: 0x4a3f66, rain: 0, exposure: 1.0, fire: 1,
  },
};
const _c = new C.Color();
export function lerpMood(a, b, k) {
  const out = {};
  for (const key in a) {
    if (typeof a[key] === 'number' && (key.endsWith('I') || ['fogDensity', 'rain', 'exposure', 'fire', 'mountains'].includes(key))) out[key] = a[key] + (b[key] - a[key]) * k;
    else out[key] = _c.set(a[key]).lerp(new C.Color(b[key]), k).getHex();
  }
  return out;
}

// ---------------------------------------------------------------- assemble
export function buildWorld(scene) {
  const sky = makeSky(); scene.add(sky);
  scene.fog = new C.FogExp2(0x8d9396, 0.008);

  const hemi = new C.HemisphereLight(0xbac4cc, 0x5a5040, 1.6); scene.add(hemi);
  const sun = new C.DirectionalLight(0xffffff, 1.4); sun.position.set(-40, 80, 30); scene.add(sun);

  scene.add(makeGround());
  makeHedges(scene);
  const river = makeRiver(); scene.add(river);
  makeVegetation(scene);
  const mountains = makeMountains(scene);
  const puddles = makePuddles(scene);

  const windmill = makeWindmill();
  windmill.position.copy(LAYOUT.windmill); windmill.rotation.y = -0.5;
  scene.add(windmill);
  const cart = makeHayCart(); cart.position.set(17.5, 0, 37.5); cart.rotation.y = 0.9; scene.add(cart);
  const torches = [[25.5, 33.8], [19, 39]].map(([x, z]) => { const t = makeTorch(); t.position.set(x, 0, z); scene.add(t); return t; });
  [[-6, 48, 0xc8322f], [4, 52, 0xf1ede4], [12, 47, 0x2f55a8], [-14, 52, 0xf1ede4], [-30, -62, 0x2f55a8], [-18, -66, 0xf2c53d], [-4, -63, 0x2f55a8], [10, -66, 0xf1ede4], [24, -62, 0x2f55a8]]
    .forEach(([x, z, c]) => { const t = makeTent(c); t.position.set(x, 0, z); t.rotation.y = x; scene.add(t); });

  const L = LAYOUT.englishLine - 2.2;
  makeStakes(scene, [[-44, -12], [12, 21], [33, 44]], L);

  const camp = makeCamp(); camp.position.copy(LAYOUT.camp); scene.add(camp);

  const clouds = makeClouds(); scene.add(clouds);
  const rain = makeRain(); scene.add(rain);

  let mood = MOODS.storm;
  function applyMood(m, renderer) {
    mood = m;
    sky.material.uniforms.top.value.set(m.top);
    sky.material.uniforms.horizon.value.set(m.horizon);
    sky.material.uniforms.bottom.value.set(m.bottom);
    sky.material.uniforms.sunColor.value.set(m.sun);
    scene.fog.color.set(m.fog); scene.fog.density = m.fogDensity;
    sun.color.set(m.sunLight); sun.intensity = m.sunI;
    hemi.color.set(m.hemiSky); hemi.groundColor.set(m.hemiGround); hemi.intensity = m.hemiI;
    clouds.material.color.set(m.cloud);
    rain.material.uniforms.opacity.value = m.rain;
    rain.visible = m.rain > 0.01;
    mountains.visible = m.mountains > 0.5;
    camp.userData.light.intensity = 6 * m.fire;
    if (renderer) renderer.toneMappingExposure = m.exposure;
  }

  function update(T, camera, rainEnabled = true) {
    windmill.userData.hub.rotation.z = -T * 0.35;
    river.material.map.offset.y = -T * 0.15;
    rain.material.uniforms.time.value = T;
    rain.material.uniforms.center.value.copy(camera.position);
    if (!rainEnabled) rain.visible = false;
    clouds.position.x = Math.sin(T * 0.01) * 20 + T * 0.4;
    const f = camp.userData.flames;
    f.forEach((fl, i) => { fl.scale.set(1 + 0.12 * Math.sin(T * 13 + i), 1 + 0.25 * Math.sin(T * 9 + i * 2), 1 + 0.12 * Math.cos(T * 11 + i)); });
    camp.userData.light.intensity = 6 * mood.fire * (0.85 + 0.15 * Math.sin(T * 17));
    torches.forEach((t, i) => t.userData.flame.scale.y = 1 + 0.2 * Math.sin(T * 12 + i));
  }

  return { applyMood, update, lerpMood, sky, camp, windmill };
}
