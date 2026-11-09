// The 3D Lammual set (built from layout.js) plus Aizawl's houses, the two flags, parachute
// flares, an Alouette-type helicopter and per-house fires for the air strike.
import * as THREE from 'three';
import { toon, inked, part, merge, vcToon, outlineMaterial, rng } from '../toon.js';
import { heightAt, TOWN } from '../mnf/terrain.js';
import { LAM } from './layout.js';

const C = THREE;
export const CEN = { x: TOWN.x, z: TOWN.z };
export const W = (x, z, dy = 0) => new C.Vector3(CEN.x + x, heightAt(CEN.x + x, CEN.z + z) + dy, CEN.z + z);
const P = (geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => part(geo, color, { pos, rot, scale });

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new C.CanvasTexture(c); t.colorSpace = C.SRGBColorSpace; return t; }
function sign(text, w = 2.6, h = 0.6, bg = '#1d3d2a', fg = '#f2e8c8') {
  const tex = canvasTex(512, 118, (g, W_, H_) => { g.fillStyle = bg; g.fillRect(0, 0, W_, H_); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(4, 4, W_ - 8, H_ - 8); g.fillStyle = fg; g.font = 'bold 50px DejaVu Sans'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W_ / 2, H_ / 2 + 2, W_ - 30); });
  return new C.Mesh(new C.PlaneGeometry(w, h), new C.MeshBasicMaterial({ map: tex }));
}

// ---------------------------------------------------------------- waving flags
export function makeFlag(kind, wid = 1.8, hei = 1.2) {
  const tex = canvasTex(256, 170, (g, w, h) => {
    if (kind === 'india') {
      [['#ff9933', 0], ['#ffffff', 1], ['#138808', 2]].forEach(([c, i]) => { g.fillStyle = c; g.fillRect(0, (i * h) / 3, w, h / 3 + 1); });
      g.strokeStyle = '#1f3a93'; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, h / 2, h / 8, 0, 7); g.stroke();
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * h / 8, h / 2 + Math.sin(a) * h / 8); g.lineWidth = 1.5; g.stroke(); }
    } else { // MNF flag (white over blue with a red disc; see README note on sources)
      g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#1f4fa0'; g.fillRect(0, h / 2, w, h / 2);
      g.fillStyle = '#c8202a'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.22, 0, 7); g.fill();
    }
  });
  const geo = new C.PlaneGeometry(wid, hei, 12, 6); geo.translate(wid / 2, 0, 0);
  const m = new C.Mesh(geo, new C.MeshToonMaterial({ map: tex, side: C.DoubleSide, gradientMap: toon(0xffffff).gradientMap }));
  m.userData.base = geo.attributes.position.array.slice();
  m.userData.wave = (T, amp = 1) => {
    const pos = geo.attributes.position, b = m.userData.base;
    for (let k = 0; k < pos.count; k++) { const x = b[k * 3]; pos.setZ(k, Math.sin(x * 2.6 - T * 6) * 0.12 * x * amp); pos.setY(k, b[k * 3 + 1] - x * 0.04); }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  return m;
}

// ---------------------------------------------------------------- buildings
const wood = () => toon(0x6b4f34), tin = () => toon(0x8d96a0);
function building(b, inside) {
  const g = new C.Group(); const base = W(b.x, b.z); g.position.copy(base);
  const sink = 2.5; // walls run down into slopes
  const body = inked(new C.BoxGeometry(b.w, b.h + sink, b.d), toon(b.col), 0.05); body.position.y = (b.h - sink) / 2; g.add(body);
  if (b.storeys === 2) { const band = new C.Mesh(new C.BoxGeometry(b.w + 0.05, 0.15, b.d + 0.05), toon(0x8a7a5a)); band.position.y = b.h / 2; g.add(band); }
  const roof = inked(new C.CylinderGeometry(b.w * 0.62, b.w * 0.62, b.d + 0.8, 3).rotateX(-Math.PI / 2), b.id === 'church' ? toon(0x7a2a2a) : tin(), 0.05);
  roof.scale.set(1, 0.42, 1); roof.position.y = b.h + b.w * 0.13; g.add(roof);
  // windows & door on the side facing the parade ground (or south for buildings outside)
  const faceZ = inside ? (b.z > 5 ? -1 : b.z < -10 ? 1 : 0) : -1;
  const faceX = inside && Math.abs(b.x) > 15 ? -Math.sign(b.x) : 0;
  const winMat = toon(0x2a3440), doorMat = toon(0x4a3020);
  const n = Math.max(2, Math.floor((faceX ? b.d : b.w) / 2.2));
  for (let s = 0; s < (b.storeys ?? 1); s++) for (let i = 0; i < n; i++) {
    const u = (i - (n - 1) / 2) * 2.0, y = 1.4 + s * 3.0;
    const w = new C.Mesh(new C.BoxGeometry(0.9, 0.9, 0.05), winMat);
    if (faceX) { w.rotation.y = Math.PI / 2; w.position.set(faceX * (b.w / 2 + 0.03), y, u); } else { w.position.set(u, y, (faceZ || -1) * (b.d / 2 + 0.03)); }
    g.add(w);
  }
  const door = new C.Mesh(new C.BoxGeometry(1.1, 2.1, 0.06), doorMat);
  if (faceX) { door.rotation.y = Math.PI / 2; door.position.set(faceX * (b.w / 2 + 0.04), 1.05, 0); } else door.position.set(0, 1.05, (faceZ || -1) * (b.d / 2 + 0.04));
  g.add(door);
  if (b.storeys === 2) { // veranda columns
    for (let i = 0; i < 6; i++) { const c = inked(new C.CylinderGeometry(0.12, 0.12, 3, 8), toon(0xe8e0cc), 0.02); c.position.set(-b.w / 2 + 1 + i * (b.w - 2) / 5, 1.5, -b.d / 2 - 1.3); g.add(c); }
    const vr = inked(new C.BoxGeometry(b.w, 0.2, 1.6), tin(), 0.03); vr.position.set(0, 3.05, -b.d / 2 - 0.8); g.add(vr);
    const sg = sign('1st BATTALION · ASSAM RIFLES', 5, 0.55); sg.position.set(0, 3.5, -b.d / 2 - 1.62); sg.rotation.y = Math.PI; g.add(sg);
  }
  if (b.mast) { const m = inked(new C.CylinderGeometry(0.06, 0.1, 9, 6), toon(0x9a9a9a), 0.02); m.position.set(b.w / 2 - 0.5, b.h + 4, 0); g.add(m); for (let k = 0; k < 3; k++) { const x = inked(new C.BoxGeometry(1.2 - k * 0.3, 0.06, 0.06), toon(0x9a9a9a), 0.01); x.position.set(b.w / 2 - 0.5, b.h + 6 + k * 1.6, 0); g.add(x); } }
  if (b.steeple) { const st = inked(new C.BoxGeometry(2.2, 5, 2.2), toon(b.col), 0.04); st.position.set(0, b.h + 1.5, b.d / 2 - 1.5); g.add(st); const sp = inked(new C.ConeGeometry(1.6, 3, 4), toon(0x7a2a2a), 0.04); sp.position.set(0, b.h + 5.5, b.d / 2 - 1.5); sp.rotation.y = Math.PI / 4; g.add(sp);
    const cr = inked(merge([P(new C.BoxGeometry(0.15, 1.2, 0.15), 0xf2e8c8), P(new C.BoxGeometry(0.7, 0.15, 0.15), 0xf2e8c8, [0, 0.2, 0])]), vcToon(), 0.01); cr.position.set(0, b.h + 7.6, b.d / 2 - 1.5); g.add(cr); }
  if (b.sandbag) for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const s = inked(new C.SphereGeometry(0.45, 8, 6), toon(0xb8a57a), 0.02); s.scale.set(1.3, 0.5, 0.8); s.position.set(Math.cos(a) * (b.w / 2 + 1), 0.3, Math.sin(a) * (b.d / 2 + 1)); s.rotation.y = -a; g.add(s); }
  if (b.id === 'treasury' || b.id === 'exchange') { const sg = sign(b.id === 'treasury' ? 'GOVT. TREASURY' : 'TELEPHONE EXCHANGE', 3.6, 0.5, '#f2e8c8', '#2a1a0a'); sg.position.set(0, b.h - 0.4, -b.d / 2 - 0.06); sg.rotation.y = Math.PI; g.add(sg); }
  g.userData.b = b;
  return g;
}
function bunker(bk) {
  const g = new C.Group(); g.position.copy(W(bk.x, bk.z));
  const bag = toon(0xb8a57a);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + row * 0.2; if (row === 2 && i % 7 === 3) continue; // firing slits
    const s = inked(new C.SphereGeometry(0.42, 8, 6), bag, 0.02); s.scale.set(1.35, 0.5, 0.8); s.position.set(Math.cos(a) * 1.9, 0.22 + row * 0.38, Math.sin(a) * 1.9); s.rotation.y = -a; g.add(s);
  }
  const roof = inked(new C.CylinderGeometry(2.3, 2.3, 0.25, 12), toon(0x5a4630), 0.03); roof.position.y = 1.55; g.add(roof);
  for (let i = 0; i < 4; i++) { const p = inked(new C.CylinderGeometry(0.08, 0.08, 1.5, 6), toon(0x5a4630), 0.01); const a = (i / 4) * Math.PI * 2 + 0.4; p.position.set(Math.cos(a) * 1.6, 0.75, Math.sin(a) * 1.6); g.add(p); }
  g.userData.bk = bk;
  return g;
}

// ---------------------------------------------------------------- the town: instanced stilt houses
function townHouses(scene) {
  const R = rng(1966), pts = [];
  const inRect = (x, z, m) => Math.abs(x) < LAM.fence.hx + m && Math.abs(z) < LAM.fence.hz + m;
  const nearOutside = (x, z) => LAM.outside.some((b) => Math.abs(x - b.x) < b.w / 2 + 4 && Math.abs(z - b.z) < b.d / 2 + 4);
  const nearRoad = (x, z) => LAM.road.some(([rx, rz]) => Math.hypot(x - rx, z - rz) < 4.5);
  // footpaths through the town along the attack and withdrawal routes (and the film's camera lanes)
  const segD = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * u, z - az - dz * u); };
  const lanes = [...LAM.mnaAxes.map((a) => [a.from, a.to]), ...LAM.retreat.map((r) => [r.from, r.to]), [[-64, 4], [-24, 2]], [[-8, -6], [-45, 16]]];
  const inLane = (x, z) => lanes.some(([a, b]) => segD(x, z, a, b) < 6.5);
  for (let i = 0; i < 2000 && pts.length < 300; i++) {
    const a = R() * Math.PI * 2, r = 27 + Math.pow(R(), 0.8) * 62;
    const x = Math.cos(a) * r * 1.15, z = Math.sin(a) * r * 0.95;
    if (inRect(x, z, 4) || nearOutside(x, z) || nearRoad(x, z) || inLane(x, z)) continue;
    if (pts.some((p) => Math.hypot(p.x - x, p.z - z) < 5.2)) continue;
    pts.push({ x, z, w: 3.6 + R() * 2.2, d: 3.6 + R() * 2.2, h: 2.6 + R() * 0.9, ry: Math.atan2(-x, -z) + (R() - 0.5) * 0.5, tone: R() });
  }
  const geo = merge([
    P(new C.BoxGeometry(1, 1, 1), 0xffffff, [0, 0.5, 0]),
    P(new C.CylinderGeometry(0.62, 0.62, 1.15, 3).rotateX(-Math.PI / 2), 0x8d96a0, [0, 1.13, 0], [0, 0, 0], [1, 0.45, 1]),
    P(new C.BoxGeometry(0.22, 0.4, 0.02), 0x3a2a1a, [0, 0.25, 0.51]), P(new C.BoxGeometry(0.18, 0.18, 0.02), 0x2a3440, [0.3, 0.6, 0.51]),
  ]);
  const m = new C.InstancedMesh(geo, vcToon(), pts.length); const o = new C.InstancedMesh(geo, outlineMaterial(0.012), pts.length); o.instanceMatrix = m.instanceMatrix;
  const mtx = new C.Matrix4(), col = new C.Color();
  const tones = [0xcdb48a, 0xb8a27a, 0xd8c9a6, 0xa88f6a, 0xc9b07c, 0xe0d2b0];
  pts.forEach((p, i) => {
    const wx = CEN.x + p.x, wz = CEN.z + p.z, y = heightAt(wx, wz);
    const lo = Math.min(heightAt(wx - p.w / 2, wz - p.d / 2), heightAt(wx + p.w / 2, wz + p.d / 2), heightAt(wx - p.w / 2, wz + p.d / 2), heightAt(wx + p.w / 2, wz - p.d / 2));
    const hTot = p.h + (y - lo) + 0.4; // stilts: the box reaches down the slope
    mtx.compose(new C.Vector3(wx, y - (y - lo) - 0.4, wz), new C.Quaternion().setFromEuler(new C.Euler(0, p.ry, 0)), new C.Vector3(p.w, hTot, p.d));
    m.setMatrixAt(i, mtx); m.setColorAt(i, col.set(tones[Math.floor(p.tone * tones.length)]));
    p.top = y + p.h; p.wx = wx; p.wz = wz;
  });
  scene.add(m, o);
  return pts;
}

// ---------------------------------------------------------------- fires that switch on per house
function fireGroup(scale = 1) {
  const g = new C.Group(); g.visible = false;
  for (let i = 0; i < 7; i++) {
    const mat = new C.MeshBasicMaterial({ color: [0xf06a22, 0xff9a2a, 0xffd060][i % 3], fog: false });
    const f = new C.Group(), r = (0.5 + (i % 3) * 0.25) * scale, h = (1.6 + (i % 4) * 0.6) * scale;
    f.add(new C.Mesh(new C.SphereGeometry(r, 8, 6), mat)); const tip = new C.Mesh(new C.ConeGeometry(r, h, 8), mat); tip.position.y = h / 2; f.add(tip);
    f.position.set((((i * 71) % 10) / 10 - 0.5) * 3 * scale, 0, (((i * 29) % 10) / 10 - 0.5) * 3 * scale); g.add(f);
  }
  g.userData.burnAt = -1;
  return g;
}

// ---------------------------------------------------------------- 1960s light helicopter (Alouette-type)
export function makeChopper() {
  const root = new C.Group(), body = new C.Group(); root.add(body);
  const G = 0x5d6a4a;
  body.add(inked(merge([
    P(new C.SphereGeometry(1.0, 16, 12), 0x9fc4d8, [0, 1.3, 0.6], [0, 0, 0], [0.95, 0.9, 1.2]),
    P(new C.BoxGeometry(1.2, 0.9, 1.6), G, [0, 1.2, -0.7]), P(new C.BoxGeometry(0.9, 0.7, 1.0), G, [0, 1.9, -0.6]),
    P(new C.BoxGeometry(0.18, 0.18, 4.6), G, [0, 1.6, -3.4]), P(new C.BoxGeometry(0.1, 1.0, 0.6), G, [0, 2.0, -5.6]),
    P(new C.BoxGeometry(0.08, 0.08, 2.6), 0x2a2a2a, [0.7, 0.15, 0]), P(new C.BoxGeometry(0.08, 0.08, 2.6), 0x2a2a2a, [-0.7, 0.15, 0]),
    P(new C.BoxGeometry(0.06, 0.9, 0.06), 0x2a2a2a, [0.6, 0.6, 0.6]), P(new C.BoxGeometry(0.06, 0.9, 0.06), 0x2a2a2a, [-0.6, 0.6, 0.6]),
    P(new C.BoxGeometry(0.06, 0.9, 0.06), 0x2a2a2a, [0.6, 0.6, -0.6]), P(new C.BoxGeometry(0.06, 0.9, 0.06), 0x2a2a2a, [-0.6, 0.6, -0.6]),
  ]), vcToon(), 0.03));
  const rotor = new C.Group(); rotor.position.set(0, 2.5, -0.4); body.add(rotor);
  for (let i = 0; i < 3; i++) { const b = inked(new C.BoxGeometry(0.25, 0.05, 5.2), toon(0x222222), 0.01); b.position.z = 2.6; const arm = new C.Group(); arm.rotation.y = (i * 2 * Math.PI) / 3; arm.add(b); rotor.add(arm); }
  const disc = new C.Mesh(new C.CircleGeometry(5.3, 32).rotateX(-Math.PI / 2), new C.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.15, depthWrite: false, side: C.DoubleSide })); disc.position.y = 0.05; rotor.add(disc);
  const tr = new C.Group(); tr.position.set(0.12, 2.1, -5.7); body.add(tr);
  for (let i = 0; i < 3; i++) { const b = new C.Mesh(new C.BoxGeometry(0.03, 0.7, 0.12), toon(0x222222)); b.geometry.translate(0, 0.35, 0); b.rotation.x = (i * 2 * Math.PI) / 3; tr.add(b); }
  // IAF roundel on the boom
  for (const s of [-1, 1]) [[0.32, 0xff9933], [0.21, 0xffffff], [0.1, 0x138808]].forEach(([r, c], k) => { const d = new C.Mesh(new C.CircleGeometry(r, 18), new C.MeshBasicMaterial({ color: c })); d.position.set(s * (0.62 + k * 0.002), 1.25, -0.9); d.rotation.y = s * Math.PI / 2; body.add(d); });
  return { root, body, rotor, tr };
}

// ---------------------------------------------------------------- build everything
export function buildSet(scene) {
  const out = { buildings: {}, bunkers: {}, houses: [], fires: [], lights: [] };
  // parade ground surface + helipad
  const pd = LAM.parade, y0 = heightAt(CEN.x, CEN.z);
  const ground = new C.Mesh(new C.BoxGeometry(pd.w, 0.12, pd.d), toon(0xb79c6a)); ground.position.set(CEN.x + pd.x, y0 + 0.02, CEN.z + pd.z); scene.add(ground);
  const hp = new C.Mesh(new C.RingGeometry(LAM.helipad.r - 0.25, LAM.helipad.r, 32).rotateX(-Math.PI / 2), new C.MeshBasicMaterial({ color: 0xf2efe6 }));
  hp.position.copy(W(LAM.helipad.x, LAM.helipad.z, 0.1)); scene.add(hp);
  const H = merge([P(new C.BoxGeometry(0.35, 0.02, 2.4), 0xf2efe6, [-0.7, 0, 0]), P(new C.BoxGeometry(0.35, 0.02, 2.4), 0xf2efe6, [0.7, 0, 0]), P(new C.BoxGeometry(1.4, 0.02, 0.35), 0xf2efe6)]);
  const hm = new C.Mesh(H, vcToon()); hm.position.copy(W(LAM.helipad.x, LAM.helipad.z, 0.1)); scene.add(hm);
  // buildings
  for (const b of LAM.buildings) { const g = building(b, true); scene.add(g); out.buildings[b.id] = g; }
  for (const b of LAM.outside) { const g = building(b, false); scene.add(g); out.buildings[b.id] = g; }
  for (const bk of LAM.bunkers) { const g = bunker(bk); scene.add(g); out.bunkers[bk.id] = g; }
  // trench: a dark cut with a sandbag lip
  for (let i = 0; i < LAM.trench.length - 1; i++) {
    const [x0, z0] = LAM.trench[i], [x1, z1] = LAM.trench[i + 1], len = Math.hypot(x1 - x0, z1 - z0);
    const cut = new C.Mesh(new C.BoxGeometry(1.1, 0.1, len), toon(0x3a2e22)); cut.position.copy(W((x0 + x1) / 2, (z0 + z1) / 2, 0.06)); cut.rotation.y = Math.atan2(x1 - x0, z1 - z0); scene.add(cut);
    const lip = inked(new C.BoxGeometry(0.5, 0.45, len), toon(0xb8a57a), 0.02); lip.position.copy(W((x0 + x1) / 2 + 0.8, (z0 + z1) / 2, 0.22)); lip.rotation.y = cut.rotation.y; scene.add(lip);
  }
  // perimeter fence: posts + three strands of wire
  const { hx, hz } = LAM.fence, postMat = toon(0x5a4630);
  const edges = [[[-hx, -hz], [-3, -hz]], [[3, -hz], [hx, -hz]], [[hx, -hz], [hx, hz]], [[hx, hz], [-hx, hz]], [[-hx, hz], [-hx, -hz]]];
  for (const [[x0, z0], [x1, z1]] of edges) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 3);
    for (let i = 0; i <= n; i++) { const u = i / n, p = inked(new C.CylinderGeometry(0.07, 0.09, 1.8, 5), postMat, 0.01); p.position.copy(W(x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, 0.9)); scene.add(p); }
    for (let s = 0; s < 3; s++) { const a = W(x0, z0, 0.5 + s * 0.5), b = W(x1, z1, 0.5 + s * 0.5); const len = a.distanceTo(b); const w = new C.Mesh(new C.CylinderGeometry(0.012, 0.012, len, 3), toon(0x333333)); w.position.copy(a).add(b).multiplyScalar(0.5); w.quaternion.setFromUnitVectors(new C.Vector3(0, 1, 0), b.clone().sub(a).normalize()); scene.add(w); }
  }
  // gate posts + barrier
  for (const s of [-1, 1]) { const g = inked(new C.BoxGeometry(0.6, 2.6, 0.6), toon(0xe8e0cc), 0.02); g.position.copy(W(s * 3, -hz, 1.3)); scene.add(g); }
  const bar = inked(new C.BoxGeometry(5.4, 0.15, 0.15), toon(0xc8202a), 0.01); bar.position.copy(W(0, -hz, 1.1)); scene.add(bar);
  // flagstaff with the tricolour
  const fsPos = W(LAM.flagstaff.x, LAM.flagstaff.z);
  const fs = inked(new C.CylinderGeometry(0.07, 0.09, 8, 8), toon(0xe8e4dc), 0.02); fs.position.copy(fsPos).add(new C.Vector3(0, 4, 0)); scene.add(fs);
  const india = makeFlag('india', 1.9, 1.25); india.position.copy(fsPos).add(new C.Vector3(0.05, 7.3, 0)); scene.add(india);
  out.india = india;
  // MNF flag pole on bunker B1 (flag hoisted on 4 March)
  const b1 = W(LAM.bunkers[0].x, LAM.bunkers[0].z);
  const pole = new C.Group(); pole.position.copy(b1).add(new C.Vector3(0, 1.6, 0)); scene.add(pole);
  const shaft = inked(new C.CylinderGeometry(0.05, 0.06, 5, 6), toon(0x7a5a3a), 0.015); shaft.position.set(0, 2.5, 0); pole.add(shaft);
  const mnf = makeFlag('mnf', 1.6, 1.05); pole.add(mnf); mnf.position.set(0.05, 1.0, 0);
  out.mnfPole = pole; out.mnf = mnf; pole.visible = false;
  // the town
  out.houses = townHouses(scene);
  // fires for houses / buildings (positions chosen by the film)
  out.addFire = (pos, scale, at, until = 1e9) => { const f = fireGroup(scale); f.position.copy(pos); f.userData.burnAt = at; f.userData.until = until; scene.add(f); out.fires.push(f); return f; };
  // parachute flares
  out.flares = [0, 1, 2].map(() => {
    const g = new C.Group(); scene.add(g);
    g.add(new C.Mesh(new C.SphereGeometry(0.35, 10, 8), new C.MeshBasicMaterial({ color: 0xfff6d0, fog: false })));
    const chute = new C.Mesh(new C.SphereGeometry(1.0, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new C.MeshBasicMaterial({ color: 0xe8e4d8, side: C.DoubleSide })); chute.position.y = 2.4; g.add(chute);
    const light = new C.PointLight(0xfff0c8, 0, 70, 1.2); g.add(light); out.lights.push(light);
    g.userData.light = light; g.visible = false; return g;
  });
  return out;
}

export function animateSet(set, T, flareTimes) {
  set.india.userData.wave(T);
  if (set.mnfPole.visible) set.mnf.userData.wave(T, 1.2);
  set.fires.forEach((f, i) => {
    f.visible = f.userData.burnAt >= 0 && T >= f.userData.burnAt && T < f.userData.until;
    if (f.visible) f.children.forEach((c, k) => c.scale.set(1 + 0.15 * Math.sin(T * 12 + k + i), 1 + 0.3 * Math.sin(T * 8 + k * 2 + i), 1 + 0.15 * Math.cos(T * 10 + k)));
  });
  set.flares.forEach((g, i) => {
    const t0 = flareTimes[i]; const u = (T - t0) / 24;
    g.visible = t0 !== undefined && u >= 0 && u < 1;
    g.userData.light.visible = g.visible;
    if (!g.visible) return;
    const base = W(-10 + i * 14, -6 + i * 8);
    g.position.set(base.x + Math.sin(T * 0.7 + i) * 3, base.y + 46 - 36 * u, base.z + Math.cos(T * 0.5 + i) * 2);
    g.userData.light.intensity = 55 * Math.min(1, u * 8) * (1 - Math.pow(u, 6)) * (0.85 + 0.15 * Math.sin(T * 23 + i));
  });
}
