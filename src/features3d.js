// Development features for flyover3d segments: valley mist, a ridge-top
// city with evening lights, an expressway on viaducts, and solar farms.
// All placement is seeded and derived from the terrain height function, so
// renders are deterministic.
//
// segment.features = {
//   mist:   { layers: 3, opacity: 0.35 },
//   city:   { at: 0.55, count: 1800, radius: 260, side: 1, lights: true },
//   road:   { offset: 70, lights: true },
//   solar:  { at: 0.5, rows: 24, cols: 18, side: -1 },
//   planned:{ at: 0.6, blocks: 9, block: 70, capitol: true },  // with terrain.flatten
// }
// `at` is the fraction of the segment's flight where the feature sits;
// `side` puts it left (-1) or right (+1) of the flight line.
import * as THREE from 'three';
import { makeNoise } from './noise.js';

export function addFeatures(scene, f, { heightAt, pathAt, duration, seed = 5 }) {
  const n = makeNoise(seed);
  const rnd = n.rand;
  const updaters = [];
  const anchor = (at, side, dist) => {
    const p = pathAt(duration * at);
    return [p.x + side * dist, p.z];
  };

  // ---------- valley mist ----------
  if (f.mist) {
    const tex = mistTexture(n);
    const layers = f.mist.layers ?? 3;
    for (let k = 0; k < layers; k++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: (f.mist.opacity ?? 0.35) * (1 - k * 0.2),
        depthWrite: false, color: f.mist.color ?? '#f3efe6', fog: true,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = (f.mist.height ?? 90) + k * 45;
      plane.renderOrder = 2;
      scene.add(plane);
      updaters.push((t) => { tex.offset.set(t * 0.004 * (k + 1), t * 0.002); });
    }
  }

  // ---------- ridge city ----------
  if (f.city) {
    const c = f.city;
    const [cx, cz] = anchor(c.at ?? 0.5, c.side ?? 1, c.dist ?? 160);
    const count = c.count ?? 1500, R = c.radius ?? 260;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    // Aizawl look: pale walls under bright tin roofs
    const roofs = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 }), count);
    const palette = ['#f2f0ea', '#e6e1d6', '#dfe7ec', '#efe3cf', '#e3ead9', '#f5f5f2', '#e9d8cc', '#d8e0ea'];
    const roofPalette = ['#c0392b', '#2e86c1', '#27ae60', '#8e9aa6', '#d35400', '#16a085', '#b03a5b', '#2c3e98'];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const lights = [];
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 6; tries++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const h = heightAt(x, z);
      // Mizo towns sit on ridges: prefer high ground around the centre
      if (h < heightAt(cx, cz) * 0.55 && rnd() < 0.8) continue;
      const w = 3.5 + rnd() * 5, d = 3.5 + rnd() * 5;
      const tall = r < R * 0.2 ? 14 + rnd() * 26 : 4 + rnd() * 10;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
      m.compose(new THREE.Vector3(x, h - 2, z), q, new THREE.Vector3(w, tall, d));
      mesh.setMatrixAt(placed, m);
      mesh.setColorAt(placed, col.set(palette[Math.floor(rnd() * palette.length)]));
      m.compose(new THREE.Vector3(x, h - 2 + tall, z), q, new THREE.Vector3(w * 1.12, 0.9, d * 1.12));
      roofs.setMatrixAt(placed, m);
      roofs.setColorAt(placed, col.set(roofPalette[Math.floor(rnd() * roofPalette.length)]));
      if (c.lights !== false && rnd() < 0.7) lights.push(x + (rnd() - 0.5) * w, h + tall * (0.3 + rnd() * 0.6), z + (rnd() - 0.5) * d);
      placed++;
    }
    mesh.count = roofs.count = placed;
    scene.add(mesh, roofs);
    if (lights.length) scene.add(lightPoints(lights, c.lightColor ?? '#ffcf7a', c.lightSize ?? 3.2));
  }

  // ---------- expressway on viaducts ----------
  if (f.road) {
    const r = f.road;
    const N = 420, pts = [];
    for (let k = 0; k <= N; k++) {
      const t = -1 + (duration + 2) * (k / N);
      const p = pathAt(t);
      pts.push([p.x + (r.offset ?? 70), p.z]);
    }
    // grade-smoothed deck height: bridges over valleys, cuttings through ridges
    const raw = pts.map(([x, z]) => heightAt(x, z));
    const win = 14;
    const deck = raw.map((_, k) => {
      let s = 0, c = 0;
      for (let j = Math.max(0, k - win); j <= Math.min(N, k + win); j++) { s += raw[j]; c++; }
      return s / c + 6;
    });
    const width = r.width ?? 16;
    const pos = [], idx = [];
    pts.forEach(([x, z], k) => {
      const [nx, nz] = k < N ? [pts[k + 1][0] - x, pts[k + 1][1] - z] : [x - pts[k - 1][0], z - pts[k - 1][1]];
      const len = Math.hypot(nx, nz) || 1;
      const px = -nz / len, pz = nx / len;
      pos.push(x + px * width / 2, deck[k], z + pz * width / 2, x - px * width / 2, deck[k], z - pz * width / 2);
      if (k < N) idx.push(2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 1, 2 * k + 3, 2 * k + 2);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.9, side: THREE.DoubleSide })));
    // centre line + edge lights
    const marks = [], lamps = [];
    pts.forEach(([x, z], k) => {
      if (k % 2 === 0) marks.push(x, deck[k] + 0.4, z);
      if (k % 6 === 0 && r.lights !== false) {
        const [nx, nz] = k < N ? [pts[k + 1][0] - x, pts[k + 1][1] - z] : [1, 0];
        const len = Math.hypot(nx, nz) || 1;
        lamps.push(x - nz / len * (width / 2 + 1), deck[k] + 5, z + nx / len * (width / 2 + 1));
      }
    });
    scene.add(lightPoints(marks, '#f5f1e0', 1.6));
    if (lamps.length) scene.add(lightPoints(lamps, r.lightColor ?? '#ffb347', 4.5));
    // pillars where the deck flies over a valley
    const pillarGeo = new THREE.BoxGeometry(3, 1, 3);
    pillarGeo.translate(0, -0.5, 0);
    const pillars = new THREE.InstancedMesh(pillarGeo, new THREE.MeshStandardMaterial({ color: '#8c8f93', roughness: 0.8 }), N);
    let np = 0;
    const m = new THREE.Matrix4();
    pts.forEach(([x, z], k) => {
      const gap = deck[k] - raw[k];
      if (k % 5 === 0 && gap > 12) {
        m.compose(new THREE.Vector3(x, deck[k], z), new THREE.Quaternion(), new THREE.Vector3(1, gap + 4, 1));
        pillars.setMatrixAt(np++, m);
      }
    });
    pillars.count = np;
    scene.add(pillars);
  }

  // ---------- solar farm ----------
  if (f.solar) {
    const s = f.solar;
    const [cx, cz] = anchor(s.at ?? 0.5, s.side ?? -1, s.dist ?? 170);
    const rows = s.rows ?? 22, cols = s.cols ?? 16;
    const geo = new THREE.BoxGeometry(9, 0.4, 5.5);
    const mat = new THREE.MeshStandardMaterial({ color: '#1b2f5c', metalness: 0.75, roughness: 0.22 });
    const mesh = new THREE.InstancedMesh(geo, mat, rows * cols);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.6, roughness: 0.4 });
    const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 3, 0.6), frameMat, rows * cols);
    const m = new THREE.Matrix4();
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.42);
    let k = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = cx + (j - cols / 2) * 11, z = cz + (i - rows / 2) * 9;
        const h = heightAt(x, z);
        m.compose(new THREE.Vector3(x, h + 3.2, z), tilt, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(k, m);
        m.compose(new THREE.Vector3(x, h + 1.5, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        legs.setMatrixAt(k, m);
        k++;
      }
    }
    scene.add(mesh, legs);
  }

  // ---------- planned city (New Aizawl) ----------
  // { at, side, dist, blocks: 9, block: 70, capitol: true }
  if (f.planned) {
    const pc = f.planned;
    const [cx, cz] = anchor(pc.at ?? 0.6, pc.side ?? 1, pc.dist ?? 0);
    const B = pc.blocks ?? 9, size = pc.block ?? 70, street = pc.street ?? 22;
    const span = B * (size + street);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const glass = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2, emissive: '#1a2a3a', emissiveIntensity: 0.35 });
    const towers = new THREE.InstancedMesh(geo, glass, B * B * 4);
    const parkMat = new THREE.MeshStandardMaterial({ color: '#3f8f45', roughness: 1 });
    const parks = new THREE.InstancedMesh(geo, parkMat, B * B);
    const roadMat = new THREE.MeshStandardMaterial({ color: '#2e3136', roughness: 0.95 });
    const roads = new THREE.InstancedMesh(geo, roadMat, (B + 1) * 2);
    const glassCols = ['#9fc4dd', '#b9d3e3', '#7fa8c8', '#d7e3ea', '#8cb6c9', '#c5cfd8'];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const lamps = [];
    let nt = 0, np = 0, nr = 0;
    const ground = heightAt(cx, cz);
    for (let i = 0; i <= B; i++) {
      const off = -span / 2 + i * (size + street) - street / 2;
      m.compose(new THREE.Vector3(cx + off, ground - 0.5, cz), q, new THREE.Vector3(street * 0.8, 1.2, span));
      roads.setMatrixAt(nr++, m);
      m.compose(new THREE.Vector3(cx, ground - 0.5, cz + off), q, new THREE.Vector3(span, 1.2, street * 0.8));
      roads.setMatrixAt(nr++, m);
      for (let k = 0; k <= B; k++) lamps.push(cx + off, ground + 5, cz - span / 2 + k * (size + street));
    }
    const mid = (B - 1) / 2;
    for (let i = 0; i < B; i++) {
      for (let j = 0; j < B; j++) {
        const bx = cx - span / 2 + i * (size + street) + size / 2, bz = cz - span / 2 + j * (size + street) + size / 2;
        const dc = Math.hypot(i - mid, j - mid);
        if (pc.capitol !== false && dc < 0.8) continue; // capitol square
        if (rnd() < 0.16 || dc > mid + 0.4) {
          m.compose(new THREE.Vector3(bx, ground - 0.2, bz), q, new THREE.Vector3(size, 1.2, size));
          parks.setMatrixAt(np++, m);
          continue;
        }
        // 4 towers per block, taller toward the centre (CBD skyline)
        for (let k = 0; k < 4; k++) {
          const ox = (k % 2 ? 1 : -1) * size / 4, oz = (k < 2 ? 1 : -1) * size / 4;
          const tall = (25 + rnd() * 40) * (1 + 2.2 * Math.max(0, 1 - dc / (mid + 1))) * (pc.heightScale ?? 1);
          const w = size * (0.28 + rnd() * 0.14);
          m.compose(new THREE.Vector3(bx + ox, ground - 1, bz + oz), q, new THREE.Vector3(w, tall, w));
          towers.setMatrixAt(nt, m);
          towers.setColorAt(nt++, col.set(glassCols[Math.floor(rnd() * glassCols.length)]));
          for (let l = 0; l < 3; l++) lamps.push(bx + ox + (rnd() - 0.5) * w, ground + tall * rnd(), bz + oz + (rnd() - 0.5) * w);
        }
      }
    }
    towers.count = nt; parks.count = np; roads.count = nr;
    scene.add(towers, parks, roads, lightPoints(lamps, pc.lightColor ?? '#fff0c8', 3));
    if (pc.capitol !== false) {
      const stone = new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.6 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(size * 1.6, 26, size * 1.1), stone);
      base.position.set(cx, ground + 13, cz);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.32, size * 0.36, 22, 32), stone);
      drum.position.set(cx, ground + 37, cz);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(size * 0.33, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: pc.domeColor ?? '#c9a24a', metalness: 0.8, roughness: 0.3 }));
      dome.position.set(cx, ground + 48, cz);
      scene.add(base, drum, dome);
    }
  }

  return (t) => updaters.forEach((fn) => fn(t));
}

function lightPoints(arr, color, size) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({
    color, size, sizeAttenuation: true, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  return new THREE.Points(g, mat);
}

function mistTexture(n) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // tileable-ish soft noise
      const v = n.fbm(x / 48, y / 48, 4) * 0.5 + 0.5;
      const a = Math.max(0, Math.min(1, (v - 0.42) * 2.2));
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}
