// Chibi "hero" characters (close-up shots) built from primitives + ink outlines.
import * as THREE from 'three';
import { toon, inked } from './toon.js';
import { tabard } from './textures.js';

const mats = new Map();
const M = (c) => { if (!mats.has(c)) mats.set(c, toon(c)); return mats.get(c); };

export const COL = {
  skin: 0xf6eee0, steel: 0xdfe3e8, steelDark: 0x9aa3ad, ink: 0x2b2522,
  leather: 0x7a5233, wood: 0x9c6b3e, darkWood: 0x6e4a2b, gold: 0xf2c53d,
  hair: 0x7a4a2a, red: 0xc8322f, cloth: 0xf1ede4, brownCloth: 0x8a6a48,
};

const O = 0.022; // outline thickness for heroes

function add(parent, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], ol = O) {
  const m = inked(geo, typeof color === 'number' ? M(color) : color, ol);
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
  parent.add(m);
  return m;
}
const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

/**
 * opts: tabard, helm (none|great|visor|kettle|crown|hood), hair (color|null), hairStyle (cap|spiky|long),
 * beard (color|null), brows (angry|calm|worried), armoured (bool), legColor, plume (color|null),
 * weapon (none|bow|mallet|lance|stave), mouth (flat|open|frown)
 */
export function makeHero(opts = {}) {
  const o = {
    tabard: 'stgeorge', helm: 'none', hair: COL.hair, hairStyle: 'cap', beard: null,
    brows: 'angry', armoured: false, legColor: null, plume: null, weapon: 'none', mouth: 'flat', ...opts,
  };
  const limb = o.armoured ? COL.steel : COL.cloth;
  const legC = o.legColor ?? (o.armoured ? COL.steel : COL.red);

  const root = new THREE.Group();
  const hips = pivot(root, 0, 0.36, 0);

  // legs
  const legs = [-1, 1].map((s) => {
    const p = pivot(hips, s * 0.1, 0, 0);
    add(p, new THREE.CylinderGeometry(0.075, 0.068, 0.3, 10), legC, [0, -0.15, 0]);
    add(p, new THREE.BoxGeometry(0.13, 0.07, 0.22), o.armoured ? COL.steelDark : COL.leather, [0, -0.32, 0.04]);
    return p;
  });

  // torso
  const torso = pivot(hips, 0, 0, 0);
  const tabMat = toon(0xffffff, { map: tabard(o.tabard) });
  add(torso, new THREE.CylinderGeometry(0.2, 0.25, 0.5, 24, 1, false, Math.PI), tabMat, [0, 0.25, 0]);
  add(torso, new THREE.CylinderGeometry(0.255, 0.255, 0.05, 24), COL.leather, [0, 0.06, 0]);
  if (o.armoured) add(torso, new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), COL.steel, [0, 0.48, 0], [0, 0, 0], [1, 0.45, 1]);

  // arms (pivot at shoulder; +x is the character's left)
  const arms = [-1, 1].map((s) => {
    const p = pivot(torso, s * 0.25, 0.44, 0);
    p.rotation.z = s * 0.12;
    add(p, new THREE.CylinderGeometry(0.06, 0.055, 0.34, 10), limb, [0, -0.17, 0]);
    if (o.armoured) add(p, new THREE.SphereGeometry(0.09, 12, 8), COL.steel, [0, -0.01, 0]);
    add(p, new THREE.SphereGeometry(0.072, 12, 8), o.armoured ? COL.steelDark : COL.skin, [0, -0.36, 0]);
    const hand = pivot(p, 0, -0.36, 0);
    return { p, hand };
  });
  const [armR, armL] = arms; // armR at -x (screen-left when facing camera)

  // head
  const neck = pivot(torso, 0, 0.5, 0);
  const head = pivot(neck, 0, 0, 0);
  add(head, new THREE.SphereGeometry(0.36, 32, 20), COL.skin, [0, 0.32, 0]);
  const face = pivot(head, 0, 0.32, 0);
  const showFace = !['great', 'visor'].includes(o.helm);
  if (showFace) {
    const eyeG = new THREE.SphereGeometry(0.045, 12, 8);
    for (const s of [-1, 1]) {
      add(face, eyeG, COL.ink, [s * 0.12, 0.02, 0.33], [0, 0, 0], [1, 1.35, 0.6], 0);
      const br = add(face, new THREE.BoxGeometry(0.14, 0.032, 0.03), COL.ink, [s * 0.125, 0.13, 0.315], [0, 0, 0], [1, 1, 1], 0);
      br.rotation.z = o.brows === 'angry' ? s * 0.38 : o.brows === 'worried' ? -s * 0.35 : 0;
    }
    if (o.mouth === 'open') add(face, new THREE.SphereGeometry(0.05, 12, 8), 0x5a2320, [0, -0.13, 0.32], [0, 0, 0], [1.2, 0.8, 0.4], 0);
    else {
      const mth = add(face, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), COL.ink, [0, -0.15, 0.325], [0, 0, 0], [1, 0.6, 1], 0);
      if (o.mouth !== 'frown') mth.rotation.z = Math.PI;
      if (o.mouth === 'flat') mth.scale.y = 0.15;
    }
    if (o.beard) {
      add(face, new THREE.SphereGeometry(0.2, 16, 10), o.beard, [0, -0.17, 0.17], [0, 0, 0], [1.25, 1.05, 0.9]);
      add(face, new THREE.BoxGeometry(0.22, 0.05, 0.05), o.beard, [0, -0.08, 0.33], [0, 0, 0], [1, 1, 1], 0.012);
    }
    if (o.hair && o.helm !== 'hood' && o.helm !== 'kettle') {
      if (o.hairStyle === 'spiky') {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          add(face, new THREE.ConeGeometry(0.09, 0.22, 8), o.hair, [Math.cos(a) * 0.22, 0.27, Math.sin(a) * 0.22 - 0.05], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]);
        }
        add(face, new THREE.SphereGeometry(0.37, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), o.hair, [0, 0.02, -0.03]);
      } else {
        add(face, new THREE.SphereGeometry(0.375, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), o.hair, [0, 0.02, -0.04], [-0.25, 0, 0]);
        if (o.hairStyle === 'long') add(face, new THREE.CylinderGeometry(0.34, 0.36, 0.42, 20, 1, true, Math.PI * 0.75, Math.PI * 1.5), o.hair, [0, -0.1, -0.04]);
      }
    }
  }

  // helmets
  if (o.helm === 'great') {
    add(head, new THREE.CylinderGeometry(0.4, 0.38, 0.6, 28), COL.steel, [0, 0.32, 0]);
    add(head, new THREE.SphereGeometry(0.4, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), COL.steel, [0, 0.62, 0], [0, 0, 0], [1, 0.32, 1]);
    add(head, new THREE.BoxGeometry(0.46, 0.045, 0.1), COL.ink, [0, 0.36, 0.36], [0, 0, 0], [1, 1, 1], 0);
    add(head, new THREE.BoxGeometry(0.05, 0.5, 0.06), COL.steelDark, [0, 0.3, 0.39]);
    for (let i = 0; i < 4; i++) add(head, new THREE.CylinderGeometry(0.018, 0.018, 0.05, 6), COL.ink, [0.12 + (i % 2) * 0.06, 0.2 - Math.floor(i / 2) * 0.07, 0.37], [Math.PI / 2, 0, 0], [1, 1, 1], 0);
    // angry eyes peeking from the slit
    for (const s of [-1, 1]) add(head, new THREE.BoxGeometry(0.12, 0.03, 0.02), COL.ink, [s * 0.11, 0.42, 0.395], [0, 0, s * 0.35], [1, 1, 1], 0);
  } else if (o.helm === 'visor') {
    add(head, new THREE.SphereGeometry(0.41, 28, 18), COL.steel, [0, 0.36, 0], [0, 0, 0], [1, 1.12, 1]);
    const snout = add(head, new THREE.ConeGeometry(0.26, 0.42, 20), COL.steel, [0, 0.3, 0.42], [Math.PI / 2, 0, 0]);
    add(head, new THREE.BoxGeometry(0.42, 0.04, 0.05), COL.ink, [0, 0.42, 0.37], [0, 0, 0], [1, 1, 1], 0);
    for (let i = 0; i < 3; i++) add(head, new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6), COL.ink, [(i - 1) * 0.07, 0.26, 0.53], [Math.PI / 2, 0, 0], [1, 1, 1], 0);
    for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(0.045, 10, 8), 0xffffff, [s * 0.1, 0.43, 0.39], [0, 0, 0], [1, 1, 0.4], 0);
    snout.userData.visor = true;
  } else if (o.helm === 'kettle') {
    add(head, new THREE.SphereGeometry(0.385, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), COL.steel, [0, 0.4, 0]);
    add(head, new THREE.CylinderGeometry(0.52, 0.54, 0.035, 32), COL.steel, [0, 0.42, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(head, new THREE.SphereGeometry(0.018, 6, 6), COL.steelDark, [Math.cos(a) * 0.45, 0.445, Math.sin(a) * 0.45], [0, 0, 0], [1, 1, 1], 0);
    }
  } else if (o.helm === 'crown') {
    add(head, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24, 1, true), COL.gold, [0, 0.66, -0.02]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(head, new THREE.ConeGeometry(0.05, 0.12, 6), COL.gold, [Math.cos(a) * 0.3, 0.76, Math.sin(a) * 0.3 - 0.02]);
    }
  } else if (o.helm === 'hood') {
    add(head, new THREE.SphereGeometry(0.4, 28, 18), COL.brownCloth, [0, 0.34, -0.08], [0, 0, 0], [1.02, 1.05, 1]);
    add(head, new THREE.CylinderGeometry(0.37, 0.37, 0.2, 24), 0x3a3330, [0, 0.16, 0.02]); // face scarf
    add(torso, new THREE.ConeGeometry(0.42, 0.4, 24, 1, true), COL.brownCloth, [0, 0.42, 0]); // cape
  }
  if (o.plume) {
    for (let i = 0; i < 5; i++) {
      add(head, new THREE.SphereGeometry(0.07, 10, 8), o.plume, [0.02, 0.72 + i * 0.07, -0.05 - i * 0.07], [0.6, 0, 0], [0.8, 1.8, 0.8]);
    }
  }

  // weapons
  const handR = armR.hand, handL = armL.hand;
  const weapon = new THREE.Group();
  if (o.weapon === 'bow') {
    const R = 1.6, arc = 0.95;
    const bow = add(weapon, new THREE.TorusGeometry(R, 0.024, 6, 40, arc), COL.wood, [-R, 0, 0], [0, 0, -arc / 2]);
    bow.userData.bow = true;
    const y = R * Math.sin(arc / 2), x = R - R * Math.cos(arc / 2);
    const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-x, y, 0), new THREE.Vector3(-x, -y, 0)]), new THREE.LineBasicMaterial({ color: 0xeeeeee }));
    weapon.add(string);
    // bow length -> hand-local axis; belly bulges away from the archer
    const basis = (bx, by) => new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(bx, by, new THREE.Vector3().crossVectors(bx, by)));
    weapon.userData.idleQ = basis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
    weapon.userData.drawQ = basis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1));
    weapon.quaternion.copy(weapon.userData.idleQ);
    handL.add(weapon);
  } else if (o.weapon === 'mallet') {
    add(weapon, new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), COL.wood, [0, -0.2, 0]);
    add(weapon, new THREE.BoxGeometry(0.15, 0.15, 0.28), COL.darkWood, [0, -0.48, 0]);
    handR.add(weapon);
  } else if (o.weapon === 'lance') {
    add(weapon, new THREE.CylinderGeometry(0.03, 0.04, 3.2, 8), COL.wood, [0, 0.9, 0]);
    add(weapon, new THREE.ConeGeometry(0.05, 0.2, 8), COL.steel, [0, 2.6, 0]);
    handR.add(weapon);
  } else if (o.weapon === 'stave') {
    add(weapon, new THREE.CylinderGeometry(0.03, 0.03, 1.9, 8), 0xc89a5c, [0, 0, 0], [0, 0, Math.PI / 2]);
    weapon.position.set(0, 0.74, 0.42); weapon.rotation.set(0, 0.25, 0.42);
    root.add(weapon);
  }

  const hero = { root, hips, torso, neck, head, legs, armR: armR.p, armL: armL.p, weapon, opts: o, mode: 'idle', phase: Math.random() * 10 };
  return hero;
}

/** Poses a hero procedurally. t = seconds. */
export function animateHero(h, t) {
  const p = t + h.phase;
  const [legR, legL] = h.legs;
  h.hips.position.y = 0.36; h.torso.rotation.set(0, 0, 0); h.neck.rotation.set(0, 0, 0);
  legR.rotation.set(0, 0, 0); legL.rotation.set(0, 0, 0);
  h.armR.rotation.set(0, 0, -0.12); h.armL.rotation.set(0, 0, 0.12);
  const breathe = Math.sin(p * 1.8);
  if (h.weapon.userData.idleQ) h.weapon.quaternion.copy(h.mode === 'draw' ? h.weapon.userData.drawQ : h.weapon.userData.idleQ);
  switch (h.mode) {
    case 'idle':
      h.torso.rotation.x = 0.02 * breathe;
      h.neck.rotation.y = 0.15 * Math.sin(p * 0.5);
      h.armR.rotation.x = 0.05 * breathe; h.armL.rotation.x = -0.05 * breathe;
      break;
    case 'march': {
      const s = Math.sin(p * 6);
      legR.rotation.x = 0.5 * s; legL.rotation.x = -0.5 * s;
      h.armR.rotation.x = -0.4 * s; h.armL.rotation.x = 0.4 * s;
      h.hips.position.y = 0.36 + 0.03 * Math.abs(Math.cos(p * 6));
      break;
    }
    case 'trudge': { // slogging through mud
      const s = Math.sin(p * 3);
      legR.rotation.x = 0.35 * s; legL.rotation.x = -0.35 * s;
      h.torso.rotation.x = 0.15; h.torso.rotation.z = 0.06 * s;
      h.hips.position.y = 0.3 + 0.02 * Math.abs(Math.cos(p * 3));
      break;
    }
    case 'hammer': {
      const c = (p * 1.4) % 1; // swing cycle
      const k = c < 0.65 ? c / 0.65 : 1 - (c - 0.65) / 0.35;
      h.armR.rotation.x = -0.6 - 2.1 * (c < 0.65 ? Math.sin(k * Math.PI / 2) : k);
      h.armL.rotation.x = -0.7; h.armL.rotation.z = -0.25;
      h.torso.rotation.x = 0.12 + (c > 0.65 ? 0.1 : 0);
      h.neck.rotation.x = -0.05;
      break;
    }
    case 'point':
      // arm thrust out sideways toward the battlefield
      h.armR.rotation.x = -0.5 + 0.04 * Math.sin(p * 7); h.armR.rotation.z = -1.35;
      h.neck.rotation.y = -0.45; h.torso.rotation.y = -0.15;
      break;
    case 'nod':
      h.neck.rotation.x = 0.08 + 0.1 * Math.max(0, Math.sin(p * 3));
      h.armR.rotation.x = -0.5; h.armL.rotation.x = -0.5; h.armR.rotation.z = 0.5; h.armL.rotation.z = -0.5; // arms crossed-ish
      h.neck.rotation.y = 0.3;
      break;
    case 'draw': {
      const c = (t % 4.5) / 4.5; // nock, draw, hold, loose
      h.armL.rotation.x = -2.1; h.armL.rotation.z = 0.1; // bow arm raised high
      const draw = c < 0.15 ? 0 : c < 0.55 ? (c - 0.15) / 0.4 : c < 0.62 ? 1 : 0;
      h.armR.rotation.x = -2.0 + 0.2 * draw; h.armR.rotation.z = -0.1 - 0.9 * draw;
      h.torso.rotation.x = -0.15; h.torso.rotation.y = 0.15; h.neck.rotation.x = -0.35;
      break;
    }
    case 'carve': {
      legR.rotation.x = -1.4; legL.rotation.x = -1.4;
      h.hips.position.y = 0.42;
      const s = Math.sin(p * 4);
      h.armL.rotation.x = -1.1; h.armR.rotation.x = -1.0 + 0.25 * s; h.armR.rotation.z = -0.3 + 0.15 * s;
      h.torso.rotation.x = 0.3; h.neck.rotation.x = 0.35;
      break;
    }
    case 'ride':
      legR.rotation.set(-0.5, 0, -0.75); legL.rotation.set(-0.5, 0, 0.75);
      h.armR.rotation.x = -0.6; h.armL.rotation.x = -0.5;
      h.torso.rotation.x = 0.03 * breathe;
      break;
  }
}

/** Cartoon horse with caparison. Rider attaches to `saddle`. */
export function makeHorse(opts = {}) {
  const o = { coat: 0x8b5a3c, cap: 'frenchPale', ...opts };
  const root = new THREE.Group();
  const body = pivot(root, 0, 1.0, 0);
  add(body, new THREE.CapsuleGeometry(0.36, 0.8, 8, 16), o.coat, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const capMat = toon(0xffffff, { map: tabard(o.cap), side: THREE.DoubleSide });
  add(body, new THREE.CylinderGeometry(0.42, 0.55, 0.6, 24, 1, true, Math.PI), capMat, [0, -0.12, 0], [0, 0, 0], [1, 1, 1.75]);
  add(body, new THREE.BoxGeometry(0.5, 0.12, 0.5), COL.leather, [0, 0.36, -0.05]);
  const neck = pivot(body, 0, 0.15, 0.55);
  add(neck, new THREE.CylinderGeometry(0.18, 0.26, 0.75, 14), o.coat, [0, 0.3, 0.12], [0.55, 0, 0]);
  add(neck, new THREE.BoxGeometry(0.08, 0.6, 0.18), 0x3b2a20, [0, 0.36, -0.02], [0.55, 0, 0]); // mane
  const head = pivot(neck, 0, 0.65, 0.32);
  add(head, new THREE.CapsuleGeometry(0.17, 0.4, 6, 12), o.coat, [0, 0, 0.15], [Math.PI / 2 - 0.35, 0, 0]);
  add(head, new THREE.SphereGeometry(0.15, 12, 10), 0x6b4430, [0, -0.1, 0.42], [0, 0, 0], [1, 0.9, 1]);
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.075, 12, 10), 0xffffff, [s * 0.13, 0.08, 0.12], [0, 0, 0], [1, 1.2, 1], 0.012);
    add(head, new THREE.SphereGeometry(0.035, 8, 8), COL.ink, [s * 0.17, 0.09, 0.15], [0, 0, 0], [1, 1, 1], 0);
    add(head, new THREE.ConeGeometry(0.06, 0.16, 8), o.coat, [s * 0.08, 0.22, -0.05], [-0.3, 0, s * 0.2]);
  }
  const legs = [[-0.2, 0.42], [0.2, 0.42], [-0.2, -0.42], [0.2, -0.42]].map(([x, z]) => {
    const p = pivot(body, x, -0.15, z);
    add(p, new THREE.CylinderGeometry(0.08, 0.07, 0.8, 10), o.coat, [0, -0.42, 0]);
    add(p, new THREE.CylinderGeometry(0.09, 0.1, 0.1, 10), 0x2d2420, [0, -0.83, 0]);
    return p;
  });
  const tail = pivot(body, 0, 0.1, -0.75);
  add(tail, new THREE.ConeGeometry(0.1, 0.6, 10), 0x3b2a20, [0, -0.25, -0.1], [Math.PI - 0.4, 0, 0]);
  const saddle = pivot(body, 0, 0.12, -0.05);
  return { root, body, neck, head, legs, tail, saddle, mode: 'idle', phase: Math.random() * 10 };
}

export function animateHorse(h, t) {
  const p = t + h.phase;
  h.body.position.y = 1.0; h.body.rotation.set(0, 0, 0);
  h.legs.forEach((l) => l.rotation.set(0, 0, 0));
  h.tail.rotation.z = 0.25 * Math.sin(p * 2);
  if (h.mode === 'idle') {
    h.neck.rotation.x = 0.06 * Math.sin(p * 1.3);
    h.head.rotation.y = 0.15 * Math.sin(p * 0.7);
    h.legs[0].rotation.x = Math.max(0, Math.sin(p * 0.9)) * 0.4; // pawing the mud
  } else if (h.mode === 'walk') {
    const s = Math.sin(p * 4);
    h.legs[0].rotation.x = 0.4 * s; h.legs[3].rotation.x = 0.4 * s;
    h.legs[1].rotation.x = -0.4 * s; h.legs[2].rotation.x = -0.4 * s;
    h.body.position.y = 1.0 + 0.04 * Math.abs(Math.cos(p * 4));
    h.neck.rotation.x = 0.1 * Math.sin(p * 4);
  } else if (h.mode === 'rear') {
    const k = 0.5 + 0.5 * Math.sin(p * 1.5);
    h.body.rotation.x = -0.45 * k; h.body.position.y = 1.0 + 0.35 * k;
    h.legs[0].rotation.x = -1.0 * k; h.legs[1].rotation.x = -0.7 * k;
    h.legs[2].rotation.x = 0.45 * k; h.legs[3].rotation.x = 0.45 * k;
  }
}
