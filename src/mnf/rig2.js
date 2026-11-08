// Body plans for the 1960s film: Indian Army jawans, MNA fighters and civilians.
// Registered into the shared rig system from ../lushai/rig.js.
import * as THREE from 'three';
import { merge } from '../toon.js';
import { KINDS, WEAPONS, K, P, S, Cy, B, face, leg, arm } from '../lushai/rig.js';

const C = THREE;
export const M = {
  og: 0x5b6a3a, ogDark: 0x4a5730, web: 0xb3a46e, khaki: 0x9a8a5a, boot: 0x1d1a1a, helmet: 0x56603a, jawanSkin: 0xb87a4c,
  mnaGreen: 0x6a7048, mnaKhaki: 0x8c7d52, shirtWhite: 0xece6d8, check: 0x7a3a3a, mizoSkin: 0xd09060, hair: 0x18120f,
  metal: 0x2f3236, wood: 0x7a5233, blue: 0x2f4f8f, kurta: 0xf2efe6,
};

// ---------------------------------------------------------------- weapons (axis +y, grip at origin)
Object.assign(WEAPONS, {
  enfield: () => merge([
    P(B(0.06, 0.42, 0.11), M.wood, [0, -0.22, 0]), P(Cy(0.038, 0.034, 0.95, 6), M.wood, [0, 0.47, 0]),
    P(Cy(0.02, 0.02, 0.2, 6), M.metal, [0, 1.02, 0.02]), P(S(0.03, 6, 5), M.metal, [0.06, 0.05, 0.04]),
  ]),
  slr: () => merge([
    P(B(0.06, 0.38, 0.1), 0x3a2a20, [0, -0.2, 0]), P(B(0.07, 0.4, 0.09), M.metal, [0, 0.18, 0.01]),
    P(B(0.05, 0.16, 0.08), M.metal, [0, 0.15, -0.09]), P(Cy(0.04, 0.04, 0.3, 6), M.wood, [0, 0.52, 0]),
    P(Cy(0.02, 0.02, 0.45, 6), M.metal, [0, 0.82, 0.02]), P(Cy(0.03, 0.03, 0.08, 6), M.metal, [0, 1.05, 0.02]),
  ]),
  bren: () => merge([
    P(B(0.06, 0.3, 0.11), M.wood, [0, -0.2, 0]), P(B(0.09, 0.55, 0.12), M.metal, [0, 0.2, 0]),
    P(B(0.05, 0.22, 0.09), M.metal, [0, 0.25, 0.14], [0.35, 0, 0]), // curved top magazine
    P(Cy(0.03, 0.03, 0.55, 6), M.metal, [0, 0.72, 0]), P(new C.ConeGeometry(0.05, 0.12, 6), M.metal, [0, 1.02, 0], [Math.PI, 0, 0]),
    P(Cy(0.012, 0.012, 0.35, 4), M.metal, [0.08, 0.75, -0.14], [0.4, 0, 0.3]), P(Cy(0.012, 0.012, 0.35, 4), M.metal, [-0.08, 0.75, -0.14], [0.4, 0, -0.3]),
  ]),
  sten: () => merge([
    P(Cy(0.04, 0.04, 0.5, 8), M.metal, [0, 0.2, 0]), P(B(0.05, 0.05, 0.22), M.metal, [0, 0.25, -0.13]),
    P(Cy(0.015, 0.015, 0.28, 4), M.metal, [0, -0.15, -0.05]), P(B(0.02, 0.04, 0.12), M.metal, [0, -0.3, -0.03]),
  ]),
  pistol: () => merge([P(B(0.04, 0.12, 0.05), M.metal, [0, 0.03, 0]), P(B(0.04, 0.05, 0.14), M.metal, [0, 0.1, 0.05])]),
  grenade: () => merge([P(S(0.07, 8, 6), 0x4a5030, [0, 0.05, 0]), P(Cy(0.02, 0.02, 0.05, 6), M.metal, [0, 0.13, 0])]),
  bundle: () => merge([P(S(0.25, 10, 8), 0xc7b07a, [0, 0.1, 0], [0, 0, 0], [1.2, 0.8, 1])]),
  banner: () => merge([P(Cy(0.025, 0.025, 2.4, 6), M.wood, [0, 0.9, 0]), P(B(0.02, 0.6, 0.9), 0x2f5fb0, [0, 1.75, 0.45]), P(B(0.025, 0.2, 0.9), 0xd63a3a, [0, 1.75, 0.45])]),
});

// ---------------------------------------------------------------- jawan (Indian Army, c. 1966)
function jawan(v) {
  const officer = v === 'officer';
  const torso = [
    P(Cy(0.2, 0.25, 0.5, 16), M.og, [0, 0.25, 0]),
    P(Cy(0.255, 0.255, 0.07, 16), M.web, [0, 0.1, 0]),
    P(B(0.12, 0.1, 0.06), M.web, [0.12, 0.14, 0.22]), P(B(0.12, 0.1, 0.06), M.web, [-0.12, 0.14, 0.22]), // ammo pouches
    P(Cy(0.17, 0.2, 0.06, 12), M.ogDark, [0, 0.5, 0]),
    P(B(0.035, 0.12, 0.02), M.ogDark, [0.1, 0.36, 0.205]), P(B(0.035, 0.12, 0.02), M.ogDark, [-0.1, 0.36, 0.205]), // pockets
  ];
  if (!officer) for (const s of [-1, 1]) torso.push(P(B(0.05, 0.5, 0.025), M.web, [s * 0.1, 0.32, 0.21], [0.12, 0, 0]));
  const y = 0.32, head = [...face(M.jawanSkin, { brows: v === 'scared' ? 'worried' : 'angry', mustache: v === 'young' ? null : 0x1a1410 })];
  if (officer) {
    head.push(P(S(0.39, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), 0x2f3a24, [0.06, y + 0.12, 0], [0, 0, -0.25], [1.05, 0.6, 1.05])); // beret
    head.push(P(Cy(0.05, 0.05, 0.02, 8), 0xe0b23a, [-0.12, y + 0.3, 0.3], [Math.PI / 2 - 0.4, 0, 0]));
  } else {
    // Mk II steel helmet: shallow dome, wide brim, scrim net
    head.push(P(S(0.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.helmet, [0, y + 0.1, 0], [0, 0, 0], [1, 0.62, 1]));
    head.push(P(Cy(0.6, 0.6, 0.03, 22), M.helmet, [0, y + 0.12, 0]));
    head.push(P(new C.TorusGeometry(0.6, 0.02, 4, 22), 0x3f4628, [0, y + 0.12, 0], [Math.PI / 2, 0, 0]));
    for (const r of [0, Math.PI / 2]) head.push(P(new C.TorusGeometry(0.3, 0.012, 4, 16, Math.PI), 0x3f4628, [0, y + 0.1, 0], [0, r, 0], [1.33, 0.83, 1.33]));
  }
  return {
    leg: merge([P(Cy(0.075, 0.068, 0.3, 10), M.og, [0, -0.15, 0]), P(Cy(0.075, 0.075, 0.1, 10), M.khaki, [0, -0.25, 0]), P(B(0.13, 0.07, 0.22), M.boot, [0, -0.32, 0.04])]),
    torso: merge(torso),
    arm: arm(M.og, M.jawanSkin, [P(Cy(0.064, 0.064, 0.05, 10), M.ogDark, [0, -0.04, 0])]),
    head: merge(head),
    weapon: officer ? 'pistol' : v === 'bren' ? 'bren' : v === 'old' ? 'enfield' : 'slr',
  };
}

// ---------------------------------------------------------------- MNA fighter
function mna(v) {
  const civvy = v === 'civvy', cmd = v === 'commander';
  const shirt = civvy ? M.shirtWhite : (v === 'khaki' ? M.mnaKhaki : M.mnaGreen);
  const torso = [P(Cy(0.2, 0.25, 0.5, 16), shirt, [0, 0.25, 0]), P(Cy(0.255, 0.255, 0.06, 16), 0x5a3e26, [0, 0.1, 0]), P(Cy(0.17, 0.2, 0.06, 12), shirt, [0, 0.5, 0])];
  if (civvy) for (let i = 0; i < 4; i++) torso.push(P(Cy(0.202 + i * 0.012, 0.205 + i * 0.012, 0.03, 16), M.check, [0, 0.12 + i * 0.1, 0]));
  torso.push(P(B(0.06, 0.62, 0.03), 0x6e4a2a, [0, 0.28, 0.215], [0.12, 0, 0.6])); // bandolier
  for (let i = 0; i < 5; i++) torso.push(P(B(0.035, 0.06, 0.04), 0xd8b040, [-0.13 + i * 0.065, 0.15 + i * 0.07, 0.235], [0, 0, 0.6]));
  // puan scarf at the neck
  torso.push(P(new C.TorusGeometry(0.18, 0.045, 6, 14), v === 'khaki' ? 0xb3282d : 0xf0ebe0, [0, 0.5, 0.02], [Math.PI / 2 - 0.2, 0, 0]));
  const y = 0.32, head = [...face(M.mizoSkin, { brows: 'angry', mouth: cmd ? 'grit' : 'flat' })];
  head.push(P(S(0.375, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), M.hair, [0, y + 0.02, -0.02], [-0.25, 0, 0]));
  if (cmd) head.push(P(S(0.39, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), 0x2c3320, [0.05, y + 0.12, 0], [0, 0, 0.25], [1.05, 0.6, 1.05]));
  else if (v === 'cap' || v === 'khaki') { // soft jungle cap
    head.push(P(Cy(0.36, 0.38, 0.2, 18), M.mnaGreen, [0, y + 0.3, -0.02]));
    head.push(P(Cy(0.2, 0.2, 0.02, 12, false, 0, Math.PI), M.mnaGreen, [0, y + 0.22, 0.34], [0.2, 0, 0], [1.4, 1, 1]));
  } else head.push(P(new C.TorusGeometry(0.36, 0.04, 6, 20), 0xb3282d, [0, y + 0.16, 0], [Math.PI / 2 + 0.1, 0, 0])); // headband
  return {
    leg: leg(civvy ? 0x3a3a40 : M.mnaGreen, 0x2a2420),
    torso: merge(torso),
    arm: arm(shirt, M.mizoSkin),
    head: merge(head),
    weapon: cmd ? 'sten' : v === 'gunner' ? 'bren' : v === 'cap' ? 'sten' : 'enfield',
  };
}

// ---------------------------------------------------------------- civilians
function civil(v) {
  const woman = v === 'woman', official = v === 'official', leader = v === 'leader';
  const top = official ? M.kurta : leader ? 0x2b2f3a : woman ? 0xf4efe4 : (v === 'boy' ? 0x6a8ab0 : 0xe8e0cc);
  const torso = [P(Cy(0.2, 0.25, 0.5, 16), top, [0, 0.25, 0]), P(Cy(0.17, 0.2, 0.06, 12), top, [0, 0.5, 0])];
  if (woman) { // striped puan wrap skirt
    torso.push(P(Cy(0.26, 0.32, 0.36, 16), 0x1d1a1a, [0, 0.0, 0]));
    for (let i = 0; i < 3; i++) torso.push(P(Cy(0.27 + i * 0.015, 0.28 + i * 0.015, 0.035, 16), i % 2 ? 0xf0ebe0 : 0xb3282d, [0, -0.1 + i * 0.1, 0]));
  }
  if (official) torso.push(P(Cy(0.27, 0.3, 0.3, 16), M.kurta, [0, -0.02, 0]));
  if (leader) for (const s of [-1, 1]) torso.push(P(B(0.08, 0.36, 0.02), 0xf2efe6, [s * 0.06, 0.32, 0.215], [0, 0, s * 0.3]));
  const y = 0.32, head = [...face(woman || official ? 0xc98e5e : M.mizoSkin, { brows: v === 'sad' ? 'worried' : 'calm', mustache: official ? 0x1a1410 : null })];
  head.push(P(S(0.375, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), v === 'elder' ? 0x9a9690 : M.hair, [0, y + 0.02, -0.03], [-0.28, 0, 0]));
  if (woman) head.push(P(S(0.15, 10, 8), M.hair, [0, y - 0.02, -0.38]));
  if (official) head.push(P(Cy(0.33, 0.36, 0.14, 16), 0xf6f3ec, [0, y + 0.3, 0], [0, 0, 0], [0.75, 1, 1.15])); // white cap
  return {
    leg: leg(official ? M.kurta : leader ? 0x2b2f3a : woman ? 0xc98e5e : 0x3a3a40, 0x2a2420),
    torso: merge(torso),
    arm: arm(top, woman || official ? 0xc98e5e : M.mizoSkin),
    head: merge(head),
    weapon: null,
  };
}

Object.assign(KINDS, { jawan, mna, civil });
