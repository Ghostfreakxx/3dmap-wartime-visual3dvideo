// Character rigs. Every bone is ONE merged, vertex-coloured mesh (+ ink outline), so a
// hundred actors stay cheap. Shapes follow the chibi proportions of the reference cartoons.
import * as THREE from 'three';
import { part, merge, vcToon, outlineMaterial } from '../toon.js';

const C = THREE;
const P = (geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => part(geo, color, { pos, rot, scale });
const S = (r, w = 14, h = 10, ...a) => new C.SphereGeometry(r, w, h, ...a);
const Cy = (a, b, h, n = 12, ...r) => new C.CylinderGeometry(a, b, h, n, 1, ...r);
const B = (x, y, z) => new C.BoxGeometry(x, y, z);

export const K = {
  ink: 0x2b2522, paleSkin: 0xf6eee0, mizoSkin: 0xd09060, red: 0xc0262b, redDark: 0x9c1e22, navy: 0x23263a, white: 0xf3efe6,
  helmet: 0xf1ead8, brass: 0xe0b23a, steel: 0xc9d0d8, wood: 0x7a5233, woodLight: 0x9c6b3e, black: 0x1d1a1a, hair: 0x18120f,
  cloth: 0x2a2626, puanRed: 0xb3282d, puanWhite: 0xf0ebe0, amber: 0xe08a2a, feather: 0xf7f3ea, blood: 0xa3121b,
};

// ---------------------------------------------------------------- shared pieces
function face(skin, { brows = 'angry', mustache = null, mouth = 'flat', dead = false } = {}) {
  const p = [P(S(0.36, 24, 16), skin, [0, 0.32, 0])];
  const y = 0.32;
  for (const s of [-1, 1]) {
    if (dead) {
      p.push(P(B(0.12, 0.03, 0.03), K.ink, [s * 0.12, y + 0.02, 0.33], [0, 0, 0.7]));
      p.push(P(B(0.12, 0.03, 0.03), K.ink, [s * 0.12, y + 0.02, 0.33], [0, 0, -0.7]));
    } else {
      p.push(P(S(0.045, 10, 8), K.ink, [s * 0.12, y + 0.02, 0.33], [0, 0, 0], [1, 1.35, 0.6]));
      const rz = brows === 'angry' ? s * 0.4 : brows === 'worried' ? -s * 0.38 : 0;
      p.push(P(B(0.14, 0.034, 0.03), K.ink, [s * 0.125, y + 0.13, 0.315], [0, 0, rz]));
    }
  }
  if (mouth === 'open' || dead) p.push(P(S(0.05, 10, 8), 0x5a2320, [0, y - 0.14, 0.32], [0, 0, 0], [1.2, 0.8, 0.4]));
  else if (mouth === 'grit') p.push(P(B(0.14, 0.05, 0.03), 0xffffff, [0, y - 0.14, 0.32]));
  else p.push(P(B(0.1, 0.022, 0.02), K.ink, [0, y - 0.15, 0.325]));
  if (mustache) for (const s of [-1, 1]) p.push(P(S(0.07, 8, 6), mustache, [s * 0.07, y - 0.08, 0.32], [0, 0, s * 0.4], [1.3, 0.5, 0.5]));
  return p;
}
function leg(color, foot) {
  return merge([P(Cy(0.075, 0.068, 0.3, 10), color, [0, -0.15, 0]), P(B(0.13, 0.07, 0.22), foot, [0, -0.32, 0.04])]);
}
function arm(sleeve, hand, extra = []) {
  return merge([P(Cy(0.06, 0.055, 0.34, 10), sleeve, [0, -0.17, 0]), P(S(0.072, 10, 8), hand, [0, -0.36, 0]), ...extra]);
}

// ---------------------------------------------------------------- weapons (axis +y, grip at origin)
const WEAPONS = {
  rifle: () => merge([
    P(B(0.06, 0.42, 0.11), K.wood, [0, -0.22, 0]),
    P(Cy(0.035, 0.035, 0.7, 6), K.wood, [0, 0.35, 0]),
    P(Cy(0.02, 0.02, 0.95, 6), 0x3b3f45, [0, 0.47, 0.03]),
    P(new C.ConeGeometry(0.018, 0.4, 5), K.steel, [0, 1.13, 0.03]),
  ]),
  musket: () => merge([
    P(B(0.06, 0.4, 0.12), K.woodLight, [0, -0.22, 0]),
    P(Cy(0.038, 0.038, 0.85, 6), K.woodLight, [0, 0.42, 0]),
    P(Cy(0.022, 0.022, 1.05, 6), 0x3b3f45, [0, 0.52, 0.03]),
    P(Cy(0.045, 0.045, 0.04, 6), K.brass, [0, 0.3, 0]), P(Cy(0.045, 0.045, 0.04, 6), K.brass, [0, 0.65, 0]),
  ]),
  dao: () => merge([
    P(Cy(0.03, 0.03, 0.24, 6), K.wood, [0, 0, 0]),
    P(B(0.08, 0.035, 0.06), K.black, [0, 0.13, 0]),
    P(B(0.02, 0.5, 0.075), K.steel, [0, 0.4, 0.015]),
    P(B(0.02, 0.18, 0.13), K.steel, [0, 0.72, 0.04]),
  ]),
  spear: () => merge([
    P(Cy(0.028, 0.03, 2.3, 6), K.woodLight, [0, 0.5, 0]),
    P(new C.ConeGeometry(0.06, 0.34, 6), K.steel, [0, 1.82, 0]),
    P(S(0.07, 6, 5), K.puanRed, [0, 1.62, 0], [0, 0, 0], [1, 1.4, 1]),
  ]),
  sword: () => merge([
    P(Cy(0.025, 0.025, 0.18, 6), K.black, [0, 0, 0]),
    P(B(0.18, 0.03, 0.04), K.brass, [0, 0.1, 0]),
    P(B(0.035, 0.85, 0.012), K.steel, [0, 0.53, 0]),
  ]),
  pole: () => merge([P(Cy(0.03, 0.03, 2.6, 6), 0xc7b46a, [0, 0.4, 0])]),
};

// ---------------------------------------------------------------- body plans
function redcoatParts(v) {
  const officer = v === 'officer';
  const torso = [
    P(Cy(0.2, 0.25, 0.5, 16), K.red, [0, 0.25, 0]),
    P(Cy(0.25, 0.29, 0.12, 16), K.red, [0, 0.0, 0]),
    P(Cy(0.255, 0.255, 0.05, 16), K.white, [0, 0.1, 0]),
    P(Cy(0.17, 0.2, 0.06, 12), K.navy, [0, 0.5, 0]),
  ];
  if (!officer) for (const s of [-1, 1]) torso.push(P(B(0.055, 0.58, 0.03), K.white, [0, 0.28, 0.215], [0.15, 0, s * 0.62]));
  for (let i = 0; i < 4; i++) torso.push(P(S(0.022, 6, 5), K.brass, [0.06, 0.14 + i * 0.09, 0.225]));
  if (officer) {
    for (const s of [-1, 1]) torso.push(P(S(0.1, 10, 6), K.brass, [s * 0.22, 0.47, 0], [0, 0, 0], [1.1, 0.45, 1]));
    torso.push(P(B(0.07, 0.6, 0.03), 0xd8c070, [0, 0.27, 0.225], [0.1, 0, 0.55])); // sash
  }
  const helmet = [
    P(S(0.4, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), K.helmet, [0, 0.44, 0.0], [0, 0, 0], [1, 0.85, 1.06]),
    P(Cy(0.52, 0.54, 0.03, 22), K.helmet, [0, 0.46, 0.02], [0.06, 0, 0], [1, 1, 1.18]),
    P(Cy(0.405, 0.405, 0.07, 22), 0xd9cfb5, [0, 0.5, 0]),
    P(S(0.05, 8, 6), K.brass, [0, 0.79, 0]),
  ];
  return {
    leg: leg(K.navy, K.black),
    torso: merge(torso),
    arm: arm(K.red, K.paleSkin, [P(Cy(0.064, 0.064, 0.06, 10), K.navy, [0, -0.3, 0])]),
    head: merge([...face(K.paleSkin, { brows: officer ? 'angry' : 'worried', mustache: officer ? 0x8a5a30 : null }), ...helmet]),
    weapon: officer ? 'sword' : 'rifle',
    skin: K.paleSkin,
  };
}
function warriorParts(v) {
  const chief = v === 'chief', vet = v === 'veteran' || chief, elder = v === 'elder';
  const torso = [
    P(Cy(0.2, 0.23, 0.3, 16), K.mizoSkin, [0, 0.36, 0]),
    P(Cy(0.236, 0.27, 0.24, 16), K.cloth, [0, 0.12, 0]),
    P(Cy(0.24, 0.24, 0.035, 16), K.puanRed, [0, 0.08, 0]),
    P(Cy(0.24, 0.245, 0.03, 16), K.puanWhite, [0, 0.17, 0]),
    P(B(0.17, 0.2, 0.03), K.cloth, [0, -0.07, 0.24]), // front flap
  ];
  // puan cloth slung over one shoulder: white with red/black stripes
  if (vet || elder) {
    torso.push(P(B(0.14, 0.62, 0.03), K.puanWhite, [0, 0.3, 0.21], [0.1, 0, 0.62]));
    torso.push(P(B(0.03, 0.62, 0.035), K.puanRed, [0.03, 0.3, 0.215], [0.1, 0, 0.62]));
    torso.push(P(B(0.14, 0.62, 0.03), K.puanWhite, [0, 0.3, -0.21], [-0.1, 0, 0.62]));
  }
  if (elder) torso.push(P(Cy(0.21, 0.24, 0.3, 16), K.puanWhite, [0, 0.36, 0]));
  if (vet) { // brass chest disc & bead necklace mark a head-taker
    torso.push(P(Cy(0.075, 0.075, 0.02, 12), K.brass, [0, 0.36, 0.215], [Math.PI / 2, 0, 0]));
    torso.push(P(new C.TorusGeometry(0.19, 0.022, 6, 16), K.amber, [0, 0.46, 0.03], [Math.PI / 2 - 0.35, 0, 0]));
  }
  const y = 0.32;
  const head = [...face(K.mizoSkin, { brows: elder ? 'calm' : 'angry', mouth: chief ? 'grit' : 'flat' })];
  head.push(P(S(0.375, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), elder ? 0x9a9690 : K.hair, [0, y + 0.02, -0.03], [-0.3, 0, 0]));
  head.push(P(S(0.15, 12, 10), elder ? 0x9a9690 : K.hair, [0, y - 0.02, -0.38])); // hair knot at the nape
  head.push(P(B(0.36, 0.025, 0.025), 0xe9dfc6, [0, y - 0.0, -0.4], [0, 0, 0.25])); // hairpin
  for (const s of [-1, 1]) head.push(P(Cy(0.05, 0.05, 0.03, 10), K.amber, [s * 0.36, y - 0.05, 0], [0, 0, Math.PI / 2])); // ear plugs
  if (vet) { // hornbill tail feathers in the knot
    for (const s of [-1, 1]) {
      head.push(P(B(0.06, 0.55, 0.012), K.feather, [s * 0.06, y + 0.25, -0.5], [-0.5, 0, s * 0.25]));
      head.push(P(B(0.062, 0.11, 0.014), K.black, [s * 0.06 + s * 0.06, y + 0.42, -0.6], [-0.5, 0, s * 0.25]));
    }
  }
  if (chief) { // white turban
    head.push(P(new C.TorusGeometry(0.33, 0.08, 8, 20), K.puanWhite, [0, y + 0.2, -0.02], [Math.PI / 2 + 0.15, 0, 0]));
  }
  const band = [P(Cy(0.066, 0.066, 0.04, 10), K.brass, [0, -0.1, 0])];
  return {
    leg: leg(K.mizoSkin, K.mizoSkin),
    torso: merge(torso),
    arm: arm(K.mizoSkin, K.mizoSkin, vet ? band : []),
    head: merge(head),
    weapon: null,
    skin: K.mizoSkin,
  };
}

const cache = new Map();
function parts(kind, variant) {
  const k = kind + ':' + variant;
  if (!cache.has(k)) cache.set(k, kind === 'redcoat' ? redcoatParts(variant) : warriorParts(variant));
  return cache.get(k);
}
const wcache = new Map();
const weaponGeo = (w) => { if (!wcache.has(w)) wcache.set(w, WEAPONS[w]()); return wcache.get(w); };

let _mat, _ol;
function mesh(geo) {
  _mat ??= vcToon(); _ol ??= outlineMaterial(0.022);
  const m = new C.Mesh(geo, _mat);
  m.add(new C.Mesh(geo, _ol));
  return m;
}
const pivot = (parent, x, y, z) => { const g = new C.Group(); g.position.set(x, y, z); parent.add(g); return g; };

/** kind: redcoat | warrior ; variant: soldier|officer / brave|veteran|chief|elder */
export function makeActor(kind, variant = 'soldier', weapon) {
  const pt = parts(kind, variant);
  const root = new C.Group();
  const body = pivot(root, 0, 0, 0); // tilts as a whole (falling, crouching)
  const hips = pivot(body, 0, 0.36, 0);
  const legs = [-1, 1].map((s) => { const p = pivot(hips, s * 0.1, 0, 0); p.add(mesh(pt.leg)); return p; });
  const torso = pivot(hips, 0, 0, 0);
  torso.add(mesh(pt.torso));
  const arms = [-1, 1].map((s) => { const p = pivot(torso, s * 0.25, 0.44, 0); p.rotation.z = s * 0.12; p.add(mesh(pt.arm)); return p; });
  const neck = pivot(torso, 0, 0.5, 0);
  const head = mesh(pt.head); neck.add(head);
  const [armR, armL] = arms;
  const handR = pivot(armR, 0, -0.36, 0), handL = pivot(armL, 0, -0.36, 0);
  const w = weapon ?? pt.weapon;
  let wmesh = null;
  if (w) { wmesh = mesh(weaponGeo(w)); handR.add(wmesh); }
  return { kind, variant, root, body, hips, legs, torso, armR, armL, neck, head, handR, handL, weapon: wmesh, weaponKind: w };
}

/** a severed trophy head (cartoon) */
export function makeTrophyHead() {
  if (!cache.has('trophy')) cache.set('trophy', merge([
    ...face(K.paleSkin, { dead: true }),
    P(S(0.375, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), 0x8a5a30, [0, 0.34, -0.02], [-0.2, 0, 0]),
    P(Cy(0.17, 0.17, 0.05, 12), K.blood, [0, 0.0, 0]),
  ]));
  const g = new C.Group();
  const m = mesh(cache.get('trophy')); m.position.y = -0.32; g.add(m);
  return g;
}

/** a pole carried on the shoulder with two heads hanging from it */
export function makeHeadPole() {
  const g = new C.Group();
  const pole = mesh(weaponGeo('pole')); g.add(pole);
  const heads = [0.95, 1.45].map((y) => {
    const h = makeTrophyHead(); h.position.set(0, y, -0.35); h.scale.setScalar(0.8); g.add(h);
    const str = new C.Mesh(new C.CylinderGeometry(0.01, 0.01, 0.3, 4), new C.MeshBasicMaterial({ color: K.ink })); str.position.set(0, y, -0.18); g.add(str);
    return h;
  });
  g.userData.heads = heads;
  return g;
}
