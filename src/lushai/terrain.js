// Height field for the Lushai Hills: a narrow path cut along a jungle hillside,
// a steep drop into a misty ravine, ridges all around and a hilltop village.
import * as THREE from 'three';

const ss = THREE.MathUtils.smoothstep;
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => 0.55 * noise(x, z) + 0.3 * noise(x * 2.1 + 5, z * 2.1) + 0.15 * noise(x * 4.3, z * 4.3 + 3);

export const PATH_HALF = 2.2;
export const VILLAGE = { x: 34, z: 150, r: 24 };
export const pathY = (x) => 2.5 * Math.sin(x * 0.03) + 1.2 * Math.sin(x * 0.071 + 1);

function base(x, z) {
  let h = pathY(x);
  if (z > PATH_HALF) {
    const d = z - PATH_HALF;
    h += 46 * (1 - Math.exp(-d / 48));
    h += 0.9 * (noise(x * 0.25, z * 0.25) - 0.5) * ss(d, 0.5, 3); // lumpy jungle floor
  } else if (z < -PATH_HALF) {
    const d = -z - PATH_HALF;
    h += -26 * (1 - Math.exp(-d / 11));
    h += d > 44 ? 0.75 * (d - 44) * ss(d, 44, 60) : 0; // far side of the ravine
  }
  // big ridges everywhere except close to the path
  const amp = 26 * ss(Math.abs(z), 14, 95) + 18 * ss(Math.abs(x), 120, 260);
  h += amp * (fbm(x * 0.011, z * 0.011) - 0.42);
  return h;
}

let _vh = null;
export function heightAt(x, z) {
  let h = base(x, z);
  const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  h += 16 * Math.exp(-((dv / 55) ** 2));
  if (_vh === null) _vh = base(VILLAGE.x, VILLAGE.z) + 16;
  h = THREE.MathUtils.lerp(h, _vh, 1 - ss(dv, VILLAGE.r - 6, VILLAGE.r + 10));
  return h;
}
export const villageY = () => heightAt(VILLAGE.x, VILLAGE.z);
export const RIVER_Z = -45;
