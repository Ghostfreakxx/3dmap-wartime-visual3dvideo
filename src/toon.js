// Cartoon look helpers: stepped toon shading, ink outlines, vertex-colour merging.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const INK = 0x2b2522;

let _gradient;
export function gradientMap() {
  if (!_gradient) {
    // three hard bands -> flat "cel" look
    const data = new Uint8Array([110, 185, 255]);
    _gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    _gradient.minFilter = _gradient.magFilter = THREE.NearestFilter;
    _gradient.needsUpdate = true;
  }
  return _gradient;
}

export function toon(color = 0xffffff, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...opts });
}

/** Vertex-coloured toon material (for merged multi-colour geometry). */
export const vcToon = (opts = {}) => toon(0xffffff, { vertexColors: true, ...opts });

/**
 * Inverted-hull outline. Pushes vertices out along a *smoothed* normal so hard-edged
 * shapes (boxes, cylinders) still get a closed ink line.
 */
const _outlineCache = new Map();
export function outlineMaterial(thickness = 0.025, color = INK) {
  const key = thickness + ':' + color;
  if (_outlineCache.has(key)) return _outlineCache.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uThick = { value: thickness };
    s.vertexShader = 'uniform float uThick;\nattribute vec3 oNormal;\n' +
      s.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed += oNormal * uThick;');
  };
  m.customProgramCacheKey = () => 'outline-' + thickness;
  _outlineCache.set(key, m);
  return m;
}

/** Adds an `oNormal` attribute: normals averaged over coincident positions. */
export function ensureOutlineNormals(geo) {
  if (geo.attributes.oNormal) return geo;
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const map = new Map();
  const key = (i) => `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let v = map.get(k);
    if (!v) map.set(k, (v = new THREE.Vector3()));
    v.x += nor.getX(i); v.y += nor.getY(i); v.z += nor.getZ(i);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = map.get(key(i)).clone().normalize();
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  geo.setAttribute('oNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}

/** Mesh + ink outline in one group-friendly package. */
export function inked(geo, mat, thickness = 0.025) {
  ensureOutlineNormals(geo);
  const mesh = new THREE.Mesh(geo, mat);
  if (thickness > 0) {
    const o = new THREE.Mesh(geo, outlineMaterial(thickness));
    o.raycast = () => {};
    mesh.add(o);
  }
  return mesh;
}

/** Bakes a transform and a flat colour into a geometry so many parts can be merged. */
export function part(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const g = geo.index ? geo : geo; // keep indexed
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale));
  g.applyMatrix4(m);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function merge(parts) {
  const clean = parts.map((g) => {
    const x = g.index ? g : g;
    for (const name of Object.keys(x.attributes)) {
      if (!['position', 'normal', 'uv', 'color'].includes(name)) x.deleteAttribute(name);
    }
    return x;
  });
  const m = mergeGeometries(clean, false);
  return ensureOutlineNormals(m);
}

export const ease = {
  inOut: (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t))),
  out: (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3),
  in: (t) => Math.pow(Math.min(1, Math.max(0, t)), 3),
};

/** Small deterministic PRNG so every playback looks identical (needed for recording). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
