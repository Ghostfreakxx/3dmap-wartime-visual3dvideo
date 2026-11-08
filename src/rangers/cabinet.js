// Aizawl at night: a (fictional) state government building, and the cabinet-room set where
// the operation is approved. The room is an interior set placed away from everything.
import * as THREE from 'three';
import { toon, inked } from '../toon.js';
import { heightAt, TOWN, townY } from '../mnf/terrain.js';

const C = THREE;
export const ROOM = { x: 260, z: -360 };
export const SEC = { x: TOWN.x, z: TOWN.z - 12 };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new C.CanvasTexture(c); t.colorSpace = C.SRGBColorSpace; return t;
}
const flag = (g, x, y, z, s = 1, rotY = 0) => {
  const f = new C.Group(); f.position.set(x, y, z); f.rotation.y = rotY; g.add(f);
  [[0xff9933, 0.22], [0xffffff, 0], [0x138808, -0.22]].forEach(([c, yy]) => { const m = new C.Mesh(new C.BoxGeometry(1.1 * s, 0.22 * s, 0.02), toon(c)); m.position.set(0.55 * s, yy * s, 0); f.add(m); });
  const ch = new C.Mesh(new C.TorusGeometry(0.075 * s, 0.012 * s, 4, 16), toon(0x1f3a93)); ch.position.set(0.55 * s, 0, 0.02); f.add(ch);
  return f;
};

export function makeSecretariat(scene) {
  const g = new C.Group(); const y0 = townY(); g.position.set(SEC.x, y0, SEC.z); scene.add(g);
  const win = canvasTex(256, 160, (x, w, h) => {
    x.fillStyle = '#d9cfb6'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { x.fillStyle = (r * 7 + c * 3) % 5 === 0 ? '#3a3a44' : '#ffd98a'; x.fillRect(10 + c * 31, 12 + r * 37, 20, 24); }
    x.fillStyle = '#7a5a3a'; x.fillRect(108, 120, 40, 40);
  });
  const shell = inked(new C.BoxGeometry(18, 10, 10), new C.MeshToonMaterial({ map: win, gradientMap: toon(0xffffff).gradientMap }), 0.06);
  shell.position.y = 5; g.add(shell);
  const roof = inked(new C.CylinderGeometry(9.8, 9.8, 19, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6), toon(0x8a4a3a), 0.06);
  roof.position.y = 11.5; roof.scale.set(1, 0.4, 0.62); g.add(roof);
  const steps = inked(new C.BoxGeometry(6, 0.6, 2), toon(0xb8b0a0), 0.03); steps.position.set(0, 0.3, -6); g.add(steps);
  const pole = inked(new C.CylinderGeometry(0.08, 0.08, 9, 6), toon(0xe8e4dc), 0.02); pole.position.set(8, 4.5, -8); g.add(pole);
  flag(g, 8, 8.4, -8, 2.2);
  const lamp = new C.PointLight(0xffd9a0, 30, 30, 1.3); lamp.position.set(0, 3, -9); g.add(lamp);
  g.userData.light = lamp;
  return g;
}

export function makeCabinetRoom(scene) {
  // floor sits above any terrain under the footprint
  let fy = -1e9; for (let x = -9; x <= 9; x += 1.5) for (let z = -6; z <= 6; z += 1.5) fy = Math.max(fy, heightAt(ROOM.x + x, ROOM.z + z));
  fy += 0.3;
  const g = new C.Group(); g.position.set(ROOM.x, fy, ROOM.z); scene.add(g);
  const gm = toon(0xffffff).gradientMap;
  const M = (c, extra = {}) => new C.MeshToonMaterial({ color: c, side: C.DoubleSide, gradientMap: gm, ...extra });
  const plane = (w, h, m, pos, rot) => { const p = new C.Mesh(new C.PlaneGeometry(w, h), m); p.position.set(...pos); p.rotation.set(...rot); g.add(p); return p; };
  const W = 14, D = 9, H = 3.6;
  plane(W, D, M(0x5a3f2a), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  plane(W, D, M(0xe8e0cc), [0, H, 0], [Math.PI / 2, 0, 0]);
  plane(W, H, M(0xd9cdb0), [0, H / 2, -D / 2], [0, 0, 0]);
  plane(W, H, M(0xd9cdb0), [0, H / 2, D / 2], [0, Math.PI, 0]);
  plane(D, H, M(0xd9cdb0), [-W / 2, H / 2, 0], [0, Math.PI / 2, 0]);
  plane(D, H, M(0xcfc2a2), [W / 2, H / 2, 0], [0, -Math.PI / 2, 0]);
  // wood panelling
  plane(W, 1.0, M(0x6b4a30), [0, 0.5, -D / 2 + 0.01], [0, 0, 0]); plane(W, 1.0, M(0x6b4a30), [0, 0.5, D / 2 - 0.01], [0, Math.PI, 0]);
  plane(D, 1.0, M(0x6b4a30), [-W / 2 + 0.01, 0.5, 0], [0, Math.PI / 2, 0]);
  // window behind the head of the table: Aizawl at night
  const night = canvasTex(256, 140, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d1838'); gr.addColorStop(1, '#2a3560'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = '#141c30'; x.beginPath(); x.moveTo(0, 90); for (let i = 0; i <= 16; i++) x.lineTo(i * 16, 70 + 18 * Math.sin(i * 1.3)); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    for (let i = 0; i < 160; i++) { x.fillStyle = i % 3 ? '#ffd27a' : '#fff1c0'; x.fillRect((i * 53) % w, 82 + ((i * 29) % 52), 2, 2); }
    x.strokeStyle = '#3a2a1a'; x.lineWidth = 6; x.strokeRect(0, 0, w, h); x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke();
  });
  plane(3.4, 1.9, new C.MeshBasicMaterial({ map: night }), [W / 2 - 0.02, 1.95, 0], [0, -Math.PI / 2, 0]);
  for (const s of [-1, 1]) { const c = inked(new C.BoxGeometry(0.1, 2.6, 0.7), toon(0x7a2028), 0.02); c.position.set(W / 2 - 0.1, 1.9, s * 2.05); g.add(c); }
  // wall map of the operation
  const map = canvasTex(512, 300, (x, w, h) => {
    x.fillStyle = '#efe6cf'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#b9d29a'; x.beginPath(); x.moveTo(0, 0); x.lineTo(250, 0); x.bezierCurveTo(230, 90, 280, 160, 240, 300); x.lineTo(0, 300); x.fill();
    x.fillStyle = '#e8cf9a'; x.beginPath(); x.moveTo(250, 0); x.lineTo(w, 0); x.lineTo(w, h); x.lineTo(240, 300); x.bezierCurveTo(280, 160, 230, 90, 250, 0); x.fill();
    x.strokeStyle = '#2f6fb0'; x.lineWidth = 5; x.beginPath(); x.moveTo(250, 0); x.bezierCurveTo(230, 90, 280, 160, 240, 300); x.stroke();
    x.fillStyle = '#222'; x.font = 'bold 22px DejaVu Sans'; x.fillText('MIZORAM', 40, 150); x.fillText('MYANMAR', 330, 70); x.font = 'italic 16px DejaVu Sans'; x.fillStyle = '#2f6fb0'; x.fillText('Tiau R.', 262, 230);
    x.fillStyle = '#c21b1b'; x.font = 'bold 34px DejaVu Sans'; x.fillText('✕', 400, 190); x.font = 'bold 14px DejaVu Sans'; x.fillText('TARGET', 388, 214);
    x.strokeStyle = '#c21b1b'; x.lineWidth = 4; x.setLineDash([12, 8]); x.beginPath(); x.moveTo(120, 220); x.quadraticCurveTo(260, 170, 395, 180); x.stroke();
    x.setLineDash([]); x.fillStyle = '#111'; x.font = 'bold 18px DejaVu Sans'; x.fillText('OPERATION FREEDOM — SECRET', 120, 285);
    x.strokeStyle = '#3a2a1a'; x.lineWidth = 10; x.strokeRect(0, 0, w, h);
  });
  plane(4.4, 2.6, new C.MeshBasicMaterial({ map: map }), [-3, 2.0, -D / 2 + 0.03], [0, 0, 0]);
  // table, chairs
  const wood = toon(0x4a3020), woodL = toon(0x6b4a30);
  const t = inked(new C.BoxGeometry(8, 0.12, 2.2), wood, 0.03); t.position.set(0.5, 0.8, 0); g.add(t);
  for (const [x, z] of [[-3.2, -0.9], [-3.2, 0.9], [4.2, -0.9], [4.2, 0.9]]) { const l = inked(new C.BoxGeometry(0.15, 0.8, 0.15), wood, 0.02); l.position.set(x, 0.4, z); g.add(l); }
  const chair = (x, z, ry) => {
    const c = new C.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
    const seat = inked(new C.BoxGeometry(0.62, 0.1, 0.62), woodL, 0.02); seat.position.y = 0.48; c.add(seat);
    const back = inked(new C.BoxGeometry(0.62, 0.8, 0.08), toon(0x7a2028), 0.02); back.position.set(0, 0.92, -0.3); c.add(back);
  };
  const seats = [];
  for (const x of [-2.4, -0.8, 0.8, 2.4]) for (const s of [-1, 1]) { const ry = s > 0 ? Math.PI : 0; chair(x, s * 1.55, ry); seats.push([x, s * 1.45, ry]); }
  // papers, the secret folder, the secure phone
  const folder = canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#c8a25a'; x.fillRect(0, 0, w, h); x.fillStyle = '#b01818'; x.font = 'bold 14px DejaVu Sans'; x.fillText('TOP SECRET', 18, 30); x.fillStyle = '#222'; x.font = 'bold 11px DejaVu Sans'; x.fillText('OP. FREEDOM', 22, 56); });
  const f1 = new C.Mesh(new C.BoxGeometry(0.6, 0.03, 0.45), [toon(0xc8a25a), toon(0xc8a25a), new C.MeshBasicMaterial({ map: folder }), toon(0xc8a25a), toon(0xc8a25a), toon(0xc8a25a)]); f1.position.set(3.4, 0.88, 0.3); f1.rotation.y = 0.2; g.add(f1);
  for (let i = 0; i < 6; i++) { const p = new C.Mesh(new C.BoxGeometry(0.42, 0.01, 0.3), toon(0xf6f3ea)); p.position.set(-2.4 + i * 0.9, 0.87, (i % 2 ? 0.6 : -0.6)); p.rotation.y = i * 0.3; g.add(p); }
  const phone = new C.Group(); phone.position.set(3.7, 0.87, -0.55); g.add(phone);
  const base = inked(new C.BoxGeometry(0.4, 0.1, 0.3), toon(0x1e1e22), 0.015); base.position.y = 0.05; phone.add(base);
  const hand = inked(new C.CapsuleGeometry(0.05, 0.3, 4, 8).rotateZ(Math.PI / 2), toon(0x1e1e22), 0.015); hand.position.set(0, 0.15, -0.05); phone.add(hand);
  const led = new C.Mesh(new C.SphereGeometry(0.025, 8, 6), new C.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(0.15, 0.11, 0.1); phone.add(led);
  // flag on a stand, clock, light
  const stand = inked(new C.CylinderGeometry(0.03, 0.03, 2.4, 6), toon(0xd8b04a), 0.01); stand.position.set(6.3, 1.2, 3.6); g.add(stand);
  flag(g, 6.3, 2.2, 3.6, 0.9, -Math.PI / 2);
  const clock = new C.Mesh(new C.CircleGeometry(0.35, 24), new C.MeshBasicMaterial({ color: 0xf6f3ea })); clock.position.set(3, 2.8, -D / 2 + 0.03); g.add(clock);
  const hands = [0.25, 0.18].map((l, i) => { const h = new C.Mesh(new C.BoxGeometry(0.03, l, 0.01), new C.MeshBasicMaterial({ color: 0x111111 })); h.geometry.translate(0, l / 2, 0); h.position.set(3, 2.8, -D / 2 + 0.05); h.rotation.z = -i * 2.1 - 0.4; g.add(h); return h; });
  const lamp = new C.PointLight(0xffe2b0, 22, 16, 1.2); lamp.position.set(0.5, 3.2, 0); g.add(lamp);
  const lamp2 = new C.PointLight(0xffd090, 8, 9, 1.4); lamp2.position.set(-3, 2.6, -3); g.add(lamp2);
  const panel = new C.Mesh(new C.BoxGeometry(3, 0.05, 0.8), new C.MeshBasicMaterial({ color: 0xfff4d8 })); panel.position.set(0.5, H - 0.04, 0); g.add(panel);
  g.visible = false;
  const W2 = (x, y, z) => new C.Vector3(ROOM.x + x, fy + y, ROOM.z + z);
  return { g, fy, seats, phoneLed: led, handset: hand, W2, clockHand: hands[1], lights: [lamp, lamp2] };
}
