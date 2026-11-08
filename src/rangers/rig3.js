// Rangers (fictional "Mizo Rangers"), junta guards and the VIP. Registered into the shared rig system.
import * as THREE from 'three';
import { merge } from '../toon.js';
import { KINDS, WEAPONS, P, S, Cy, B, face, leg, arm } from '../lushai/rig.js';

const C = THREE;
const R = { green: 0x5b5f47, coyote: 0x8a7550, coyoteD: 0x6f5e40, black: 0x1c1c1c, skin: 0xd09060, metal: 0x26282b, tan: 0xa89068 };
const J = { green: 0x4f5a38, greenD: 0x3e4a2c, helmet: 0x4b5a35, skin: 0xc68c5c };

Object.assign(WEAPONS, {
  m4: () => merge([
    P(B(0.06, 0.26, 0.09), R.black, [0, -0.2, 0]), P(B(0.07, 0.36, 0.1), R.black, [0, 0.12, 0]),
    P(B(0.05, 0.14, 0.07), R.black, [0, 0.08, -0.1], [0.25, 0, 0]), P(Cy(0.04, 0.04, 0.3, 8), R.metal, [0, 0.45, 0.01]),
    P(Cy(0.03, 0.03, 0.28, 8), R.black, [0, 0.72, 0.01]), P(Cy(0.03, 0.03, 0.16, 8), R.black, [0, 0.16, 0.09], [0, 0, 0]),
    P(B(0.04, 0.06, 0.04), 0x2a6a2a, [0.04, 0.4, 0.05]),
  ]),
  ak: () => merge([
    P(B(0.06, 0.32, 0.1), 0x7a4a26, [0, -0.2, 0]), P(B(0.07, 0.34, 0.09), R.metal, [0, 0.12, 0]),
    P(B(0.05, 0.18, 0.07), R.metal, [0, 0.07, -0.12], [0.45, 0, 0]), P(Cy(0.04, 0.04, 0.25, 6), 0x7a4a26, [0, 0.42, 0]),
    P(Cy(0.02, 0.02, 0.4, 6), R.metal, [0, 0.66, 0.02]),
  ]),
  minigun: () => merge([
    P(B(0.18, 0.4, 0.18), R.metal, [0, 0.0, 0]), ...[0, 1, 2, 3, 4, 5].map((i) => P(Cy(0.025, 0.025, 0.8, 5), R.metal, [Math.cos(i) * 0.06, 0.55, Math.sin(i) * 0.06])),
    P(B(0.1, 0.12, 0.25), 0x3a3a3a, [0, -0.05, -0.18]),
  ]),
});

function ranger(v) {
  const torso = [
    P(Cy(0.2, 0.25, 0.5, 16), R.green, [0, 0.25, 0]),
    P(B(0.4, 0.36, 0.12), R.coyote, [0, 0.3, 0.17]), P(B(0.4, 0.36, 0.1), R.coyote, [0, 0.3, -0.17]),
    P(B(0.09, 0.13, 0.06), R.coyoteD, [-0.12, 0.2, 0.25]), P(B(0.09, 0.13, 0.06), R.coyoteD, [0, 0.2, 0.25]), P(B(0.09, 0.13, 0.06), R.coyoteD, [0.12, 0.2, 0.25]),
    P(B(0.1, 0.1, 0.05), R.black, [0.12, 0.42, 0.25]), // radio
    P(Cy(0.26, 0.26, 0.07, 16), R.coyoteD, [0, 0.08, 0]),
    P(Cy(0.008, 0.008, 0.45, 4), R.black, [0.12, 0.6, -0.2]),
  ];
  const y = 0.32, head = [...face(R.skin, { brows: 'angry', mouth: v === 'leader' ? 'grit' : 'flat' })];
  head.push(P(S(0.41, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), R.coyote, [0, y + 0.06, -0.02], [-0.1, 0, 0], [1.02, 0.85, 1.05]));
  for (const s of [-1, 1]) head.push(P(Cy(0.12, 0.12, 0.08, 12), R.black, [s * 0.37, y, -0.02], [0, 0, Math.PI / 2]));
  head.push(P(B(0.14, 0.1, 0.08), R.black, [0, y + 0.36, 0.33])); // NVG mount
  for (const s of [-1, 1]) head.push(P(Cy(0.05, 0.05, 0.18, 10), R.metal, [s * 0.07, y + 0.4, 0.42], [0.25, 0, 0])); // NVGs flipped up
  head.push(P(B(0.08, 0.05, 0.02), 0x2a6a2a, [0, y + 0.43, -0.38])); // IR strobe
  return {
    leg: merge([P(Cy(0.08, 0.072, 0.3, 10), R.green, [0, -0.15, 0]), P(B(0.12, 0.1, 0.08), R.black, [0, -0.12, 0.07]), P(B(0.13, 0.08, 0.23), R.coyoteD, [0, -0.32, 0.04])]),
    torso: merge(torso),
    arm: arm(R.green, R.black, [P(Cy(0.068, 0.068, 0.08, 10), R.black, [0, -0.2, 0])]),
    head: merge(head),
    weapon: v === 'gunner' ? 'minigun' : 'm4',
  };
}
function junta(v) {
  const torso = [P(Cy(0.2, 0.25, 0.5, 16), J.green, [0, 0.25, 0]), P(Cy(0.255, 0.255, 0.06, 16), 0x3a2e20, [0, 0.1, 0]),
    P(B(0.1, 0.1, 0.06), J.greenD, [0.11, 0.16, 0.22]), P(B(0.1, 0.1, 0.06), J.greenD, [-0.11, 0.16, 0.22]), P(Cy(0.17, 0.2, 0.06, 12), J.greenD, [0, 0.5, 0])];
  const y = 0.32, head = [...face(J.skin, { brows: v === 'scared' ? 'worried' : 'angry', mustache: v === 'officer' ? 0x1a1410 : null })];
  head.push(P(S(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), J.helmet, [0, y + 0.08, 0], [0, 0, 0], [1, 0.8, 1.05]));
  head.push(P(Cy(0.45, 0.47, 0.04, 20), J.helmet, [0, y + 0.1, 0]));
  return { leg: leg(J.green, 0x1a1a1a), torso: merge(torso), arm: arm(J.green, J.skin), head: merge(head), weapon: 'ak' };
}
function vip() {
  const torso = [
    P(Cy(0.2, 0.24, 0.5, 16), 0xf3dcd6, [0, 0.25, 0]),
    P(Cy(0.25, 0.3, 0.72, 18), 0x6a4a8a, [0, -0.1, 0]), // longyi to the ankles
    P(Cy(0.255, 0.27, 0.03, 18), 0xd8b84a, [0, 0.12, 0]), P(Cy(0.29, 0.3, 0.03, 18), 0xd8b84a, [0, -0.38, 0]),
    P(new C.TorusGeometry(0.2, 0.05, 6, 16), 0xf6efe4, [0, 0.47, 0.02], [Math.PI / 2 - 0.2, 0, 0]), // shawl
  ];
  const y = 0.32, head = [...face(0xe6c09a, { brows: 'calm', mouth: 'flat' })];
  head.push(P(S(0.378, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), 0x2a2624, [0, y + 0.02, -0.03], [-0.3, 0, 0]));
  head.push(P(S(0.16, 12, 10), 0x2a2624, [0, y - 0.04, -0.38]));
  [[0.13, 0.02, 0xffffff], [0.18, -0.08, 0xf2c23a], [0.09, -0.12, 0xf08aa0], [0.2, 0.06, 0xffffff]].forEach(([x, dy, c]) => head.push(P(S(0.055, 8, 6), c, [x, y + dy, -0.36])));
  return { leg: leg(0xe6c09a, 0x6a4a2a), torso: merge(torso), arm: arm(0xf3dcd6, 0xe6c09a), head: merge(head), weapon: null };
}
Object.assign(KINDS, { ranger, junta, vip });

// the fictional unit emblem, as a texture (shoulder patch + title card)
export function emblemCanvas(size = 256) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d'), s = size / 256;
  g.scale(s, s);
  // scroll tab
  g.fillStyle = '#111'; g.strokeStyle = '#d8b04a'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(16, 70); g.quadraticCurveTo(128, 22, 240, 70); g.lineTo(232, 108); g.quadraticCurveTo(128, 62, 24, 108); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#d8b04a'; g.font = '900 30px "DejaVu Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MIZO RANGERS', 128, 82);
  // shield with crossed daos
  g.fillStyle = '#1d2a1d'; g.beginPath(); g.moveTo(58, 118); g.lineTo(198, 118); g.lineTo(198, 170); g.quadraticCurveTo(198, 230, 128, 250); g.quadraticCurveTo(58, 230, 58, 170); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#e8e4da'; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(88, 220); g.lineTo(168, 140); g.moveTo(168, 220); g.lineTo(88, 140); g.stroke();
  g.fillStyle = '#d8b04a'; g.font = '800 18px "DejaVu Sans", sans-serif'; g.fillText('VANAPA BN', 128, 196);
  return c;
}
