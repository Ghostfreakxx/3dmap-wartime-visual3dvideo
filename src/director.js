// The "film": a list of shots with camera moves, lighting moods, captions and who is on stage.
import * as THREE from 'three';
import { LAYOUT } from './world.js';
import { ease } from './toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const camp = LAYOUT.camp, cmd = LAYOUT.commanders;
const E = LAYOUT.englishLine, F = LAYOUT.frenchLine;

export const SHOTS = [
  {
    name: 'The Bowyer', dur: 8, mood: 'dusk', show: ['camp'],
    title: 'RAIN, MUD & LONGBOWS', caption: 'It starts with a stave of yew, a sharp knife… and years of practice.',
    from: { pos: V(camp.x - 2.2, 1.5, camp.z + 4.4), look: V(camp.x + 0.9, 0.85, camp.z + 0.1), fov: 38 },
    to: { pos: V(camp.x - 1.2, 1.3, camp.z + 3.4), look: V(camp.x + 1.1, 0.9, camp.z), fov: 34 },
  },
  {
    name: 'Two Armies', dur: 10, mood: 'stormDusk', show: [],
    caption: 'Two armies face each other across rain-soaked fields.',
    from: { pos: V(-112, 52, -96), look: V(8, 0, 4), fov: 40 },
    to: { pos: V(-88, 34, -70), look: V(14, 0, 10), fov: 38 },
  },
  {
    name: 'The Knights', dur: 8, mood: 'storm', show: ['french'],
    caption: 'Heavy armour. Proud banners. And a LOT of mud.',
    from: { pos: V(-4.5, 1.35, F + 9.5), look: V(-0.6, 1.25, F + 2.6), fov: 34 },
    to: { pos: V(1.5, 1.2, F + 8.6), look: V(0.2, 1.2, F + 2.6), fov: 32 },
  },
  {
    name: 'Stakes', dur: 8, mood: 'storm', show: ['archers'],
    caption: 'The archers hammer sharpened stakes into the ground.',
    from: { pos: V(30.2, 1.4, E - 6.0), look: V(27, 0.95, E - 0.4), fov: 36 },
    to: { pos: V(28.2, 1.3, E - 4.8), look: V(27.2, 0.95, E - 0.6), fov: 33 },
    archerMode: 'hammer',
  },
  {
    name: 'The Plan', dur: 8, mood: 'stormDusk', show: ['commanders'],
    caption: '“Let them come to us… through all of that.”',
    from: { pos: V(cmd.x - 1.0, 1.35, cmd.z - 5.6), look: V(cmd.x + 0.3, 1.1, cmd.z + 0.5), fov: 36 },
    to: { pos: V(cmd.x - 0.3, 1.25, cmd.z - 4.6), look: V(cmd.x + 0.3, 1.1, cmd.z + 0.5), fov: 33 },
  },
  {
    name: 'Loose!', dur: 10, mood: 'storm', show: ['archers'],
    caption: 'Then the sky goes dark with arrows.',
    from: { pos: V(32.5, 1.45, E - 4.6), look: V(26.5, 1.9, E + 0.6), fov: 38 },
    to: { pos: V(35, 5.5, E - 7), look: V(12, 13, -22), fov: 48 },
    archerMode: 'draw', hold: 3.8, // stay on the archers until the first loose, then follow the arrows
  },
  {
    name: 'Into the Storm', dur: 10, mood: 'storm', show: [],
    caption: 'Thousands of arrows, every few seconds, onto men stuck in the mud.',
    from: { pos: V(-48, 3.2, 4), look: V(-22, 1.5, -14), fov: 40 },
    to: { pos: V(-46, 6.5, 10), look: V(-8, 2, -6), fov: 42 },
  },
  {
    name: 'A Changed World', dur: 9, mood: 'stormDusk', show: [],
    caption: 'A simple wooden bow had changed the history of war.',
    from: { pos: V(70, 22, 70), look: V(0, 0, -6), fov: 40 },
    to: { pos: V(95, 60, 95), look: V(0, 0, -10), fov: 40 },
  },
];

let acc = 0;
for (const s of SHOTS) { s.start = acc; acc += s.dur; }
export const TOTAL = acc;

export const VOLLEY_TIMES = [46, 50.5, 55, 58.8, 62.6, 66.4];

export function shotAt(T) {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (T >= SHOTS[i].start) return [i, SHOTS[i]];
  return [0, SHOTS[0]];
}

const _p = new THREE.Vector3(), _l = new THREE.Vector3();
export function cameraFor(shot, t, camera) {
  const h = shot.hold ?? 0;
  const k = t < h ? 0.05 * (t / h) : 0.05 + 0.95 * ease.inOut((t - h) / (shot.dur - h));
  _p.lerpVectors(shot.from.pos, shot.to.pos, k);
  _l.lerpVectors(shot.from.look, shot.to.look, k);
  // gentle handheld sway on close-ups
  if (shot.from.pos.y < 3) { _p.x += Math.sin(t * 0.9) * 0.03; _p.y += Math.sin(t * 1.3) * 0.02; }
  camera.position.copy(_p);
  camera.lookAt(_l);
  camera.fov = shot.from.fov + (shot.to.fov - shot.from.fov) * k;
  camera.updateProjectionMatrix();
}
