// "battle3d" segment: a 3D war-table diorama. A relief map with fields,
// rivers and cities; armies as miniature infantry squads and tanks that
// march between keyframed positions, carry floating banners, trade rifle
// tracers, call in artillery arcs, and leave explosions and smoke. The
// front (territory, arrows) is painted live onto the table surface.
//
// It takes the same keyframes as campaign2d (units, territory, fights,
// battles, arrows, stats, caption, seconds/hold) plus per-keyframe
// `camera: { at:[lon,lat], dist, pitch, yaw }`.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeNoise } from './noise.js';
import { drawFlag } from './flags.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const frac = (x) => x - Math.floor(x);
const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const DAY = 86400000;

export function createBattle3D(cfg, W, H, u, font, renderer) {
  const factions = Object.fromEntries(cfg.factions.map((f) => [f.id, f]));
  const [w0, s0, e0, n0] = cfg.bbox;
  const lat0 = (s0 + n0) / 2, lon0 = (w0 + e0) / 2;
  const K = cfg.scale ?? 100, cosL = Math.cos((lat0 * Math.PI) / 180);
  const sizeX = (e0 - w0) * K * cosL, sizeZ = (n0 - s0) * K;
  const noise = makeNoise(cfg.seed ?? 4);
  const relief = cfg.relief ?? 2.5;
  const hAt = (x, z) => (noise.fbm(x / 70, z / 70, 4) * 0.5 + 0.5) * relief + Math.max(0, noise.ridged(x / 160 + 3, z / 160, 3) - 0.55) * relief * 3;
  const P = (ll) => { const x = (ll[0] - lon0) * K * cosL, z = -(ll[1] - lat0) * K; return new THREE.Vector3(x, hAt(x, z), z); };

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(cfg.fov ?? 40, W / H, 0.5, 6000);
  const skyTop = cfg.sky?.top ?? '#3b4250', skyBottom = cfg.sky?.bottom ?? '#c9a27a';
  scene.background = gradientTexture(skyTop, skyBottom);
  scene.fog = new THREE.Fog(cfg.sky?.fog ?? '#9a8f84', cfg.fogNear ?? 260, cfg.fogFar ?? 1100);

  scene.add(new THREE.HemisphereLight('#d8dde6', '#4a3f30', 0.85));
  const sun = new THREE.DirectionalLight(cfg.sky?.sun ?? '#ffd9b0', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // ---------- table: base texture + live overlay ----------
  const TW = 2048, TH = Math.round((TW * sizeZ) / sizeX);
  const px = (ll) => [((ll[0] - w0) / (e0 - w0)) * TW, ((n0 - ll[1]) / (n0 - s0)) * TH];
  const base = paintBase(TW, TH, cfg, px, noise);
  const groundGeo = new THREE.PlaneGeometry(sizeX, sizeZ, 220, Math.round((220 * sizeZ) / sizeX));
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, hAt(gp.getX(i), gp.getZ(i)));
  groundGeo.computeVertexNormals();
  const baseTex = new THREE.CanvasTexture(base);
  baseTex.colorSpace = THREE.SRGBColorSpace;
  baseTex.anisotropy = 8;
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.95 }));
  ground.receiveShadow = true;
  scene.add(ground);

  const OW = 1024, OH = Math.round((OW * sizeZ) / sizeX);
  const ovc = document.createElement('canvas');
  ovc.width = OW; ovc.height = OH;
  const octx = ovc.getContext('2d');
  const opx = (ll) => [((ll[0] - w0) / (e0 - w0)) * OW, ((n0 - ll[1]) / (n0 - s0)) * OH];
  const ovTex = new THREE.CanvasTexture(ovc);
  ovTex.colorSpace = THREE.SRGBColorSpace;
  const overlay = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({
    map: ovTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true,
  }));
  overlay.renderOrder = 1;
  scene.add(overlay);

  // ---------- cities ----------
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const rnd = noise.rand;
  for (const c of cfg.cities || []) {
    if (c.region || c.maxView) continue;
    const big = (c.size ?? 24) >= 30;
    const count = big ? 900 : 30, R = big ? 11 : 1.6;
    const mesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), count);
    const ctr = P(c.at), m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    for (let k = 0; k < count; k++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R;
      const x = ctr.x + Math.cos(a) * r, z = ctr.z + Math.sin(a) * r;
      const s = big ? 0.35 + rnd() * 0.5 : 0.3 + rnd() * 0.3;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.round(rnd() * 4) * (Math.PI / 2) + 0.1);
      m.compose(new THREE.Vector3(x, hAt(x, z) - 0.05, z), q, new THREE.Vector3(s, (big ? 0.3 + rnd() * 0.9 : 0.25 + rnd() * 0.3), s * (1 + rnd())));
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k, col.set(['#8c8378', '#a39a8c', '#6f6a64', '#9b6b56', '#7d7468'][Math.floor(rnd() * 5)]));
    }
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  }
  if (cfg.landmark) {
    const lm = P(cfg.landmark.at);
    const stone = new THREE.MeshStandardMaterial({ color: '#b9ae9c', roughness: 0.7 });
    const hall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.5), stone);
    hall.position.set(lm.x, lm.y + 0.45, lm.z);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4c5a5e', metalness: 0.6, roughness: 0.4 }));
    dome.position.set(lm.x, lm.y + 0.9, lm.z);
    for (const o of [hall, dome]) { o.castShadow = true; scene.add(o); }
  }

  // ---------- miniature soldiers and tanks ----------
  const soldierGeo = makeSoldier(cfg.figure ?? 1.0);
  const tankGeo = makeTank(cfg.figure ?? 1.0);
  const UNIFORM = { soviet: '#5d6b3c', polish: '#5d6b3c', german: '#5f6468', us: '#6e6a44', ...cfg.uniforms };
  const ARMOR = { soviet: '#4b5a2c', polish: '#4b5a2c', german: '#6d7175', us: '#5f6136', ...cfg.armor };
  const formations = new Map();

  function formation(un) {
    let F = formations.get(un.id);
    if (F) return F;
    const nInf = un.infantry ?? (un.faction === 'soviet' ? 40 : 28);
    const nTank = un.tanks ?? (un.faction === 'soviet' ? 6 : un.faction === 'german' ? 3 : 3);
    const inf = new THREE.InstancedMesh(soldierGeo, new THREE.MeshStandardMaterial({ color: UNIFORM[un.faction] ?? '#777', roughness: 0.8 }), nInf);
    const tanks = new THREE.InstancedMesh(tankGeo, new THREE.MeshStandardMaterial({ color: ARMOR[un.faction] ?? '#666', roughness: 0.6, metalness: 0.3 }), Math.max(1, nTank));
    tanks.count = nTank;
    for (const o of [inf, tanks]) { o.castShadow = true; o.frustumCulled = false; scene.add(o); }
    const seedBase = [...un.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const offs = Array.from({ length: nInf }, (_, k) => {
      const cols = 8, r = Math.floor(k / cols), c = k % cols;
      return [(c - (cols - 1) / 2) * 0.75 + (hash(seedBase + k) - 0.5) * 0.35, -1.2 - r * 0.8 + (hash(seedBase + k * 3) - 0.5) * 0.35];
    });
    const toffs = Array.from({ length: nTank }, (_, k) => [(k - (nTank - 1) / 2) * 2.2, 1.6 + (k % 2) * 1.0]);
    const banner = makeBanner(factions[un.faction], font);
    scene.add(banner.sprite);
    F = { inf, tanks, offs, toffs, banner, seed: seedBase, prev: null, heading: un.faction === 'soviet' || un.faction === 'polish' ? Math.PI : 0 };
    formations.set(un.id, F);
    return F;
  }

  // ---------- combat FX ----------
  const MAXSEG = 3000;
  const tracerPos = new Float32Array(MAXSEG * 6), tracerCol = new Float32Array(MAXSEG * 6);
  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(tracerPos, 3));
  tracerGeo.setAttribute('color', new THREE.BufferAttribute(tracerCol, 3));
  const tracers = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  tracers.frustumCulled = false;
  scene.add(tracers);
  const MAXF = 1500;
  const flashPos = new Float32Array(MAXF * 3);
  const flashGeo = new THREE.BufferGeometry();
  flashGeo.setAttribute('position', new THREE.BufferAttribute(flashPos, 3));
  const flashes = new THREE.Points(flashGeo, new THREE.PointsMaterial({ color: '#ffd27a', size: 0.9, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, map: dotTexture(), alphaTest: 0.01 }));
  flashes.frustumCulled = false;
  scene.add(flashes);
  const boomPos = new Float32Array(400 * 3);
  const boomGeo = new THREE.BufferGeometry();
  boomGeo.setAttribute('position', new THREE.BufferAttribute(boomPos, 3));
  const booms = new THREE.Points(boomGeo, new THREE.PointsMaterial({ color: '#ff8a2a', size: 5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, map: dotTexture(), alphaTest: 0.01 }));
  booms.frustumCulled = false;
  scene.add(booms);
  const smokeTex = smokeTexture();
  const smokes = Array.from({ length: 90 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: '#5a5550', transparent: true, depthWrite: false, opacity: 0 }));
    scene.add(s);
    return s;
  });

  // ---------- timeline (same schedule as campaign2d) ----------
  const kfs = cfg.keyframes.map((k) => ({ ...k, day: Date.parse(k.date + 'T00:00:00Z') }));
  const schedule = [];
  let t0 = kfs[0].hold ?? 0;
  for (let j = 1; j < kfs.length; j++) {
    const mv = kfs[j].seconds ?? 4, hd = kfs[j].hold ?? 0;
    schedule.push({ i: j - 1, t0, t1: t0 + mv, t2: t0 + mv + hd });
    t0 += mv + hd;
  }
  let lastCam = kfs[0].camera;
  for (const k of kfs) lastCam = k.camera = k.camera ?? lastCam;
  function locate(t) {
    const e = schedule.find((s) => t < s.t2) ?? schedule[schedule.length - 1];
    const a = kfs[e.i], b = kfs[e.i + 1];
    const f = t < e.t0 ? 0 : clamp01((t - e.t0) / (e.t1 - e.t0));
    return { a, b, f, i: e.i, day: lerp(a.day, b.day, smooth(f)) };
  }

  let state = null;

  function update(t) {
    const { a, b, f, i, day } = locate(t);
    const m = smooth(f);
    state = { a, b, f, i, day, t };

    // camera
    const ca = a.camera, cb = b.camera;
    const tgt = P([lerp(ca.at[0], cb.at[0], m), lerp(ca.at[1], cb.at[1], m)]);
    const dist = Math.exp(lerp(Math.log(ca.dist), Math.log(cb.dist), m));
    const pitch = THREE.MathUtils.degToRad(lerp(ca.pitch ?? 45, cb.pitch ?? 45, m));
    const yaw = THREE.MathUtils.degToRad(lerp(ca.yaw ?? 0, cb.yaw ?? 0, m) + t * (cfg.orbit ?? 1.2));
    camera.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(tgt);
    // sun + shadow box follow the action
    sun.position.set(tgt.x - 120, tgt.y + 160, tgt.z + 60);
    sun.target.position.copy(tgt);
    const sc = sun.shadow.camera, half = Math.max(30, dist * 1.1);
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 1; sc.far = 600;
    sc.updateProjectionMatrix();

    // armies
    const units = interpolateUnits(a, b, f);
    const seen = new Set();
    const centers = new Map();
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (const un of units) {
      const F = formation(un);
      seen.add(un.id);
      const c = P(un.at);
      centers.set(un.id, { c, F, un });
      let moving = 0;
      if (F.prev) {
        const dx = c.x - F.prev.x, dz = c.z - F.prev.z, d = Math.hypot(dx, dz);
        if (d > 0.002) { F.heading = Math.atan2(dz, dx); moving = 1; }
      }
      F.prev = c.clone();
      const s = un.alpha;
      const cosH = Math.cos(F.heading), sinH = Math.sin(F.heading);
      const place = (ox, oz, k, bob) => {
        // ox across the line, oz along heading (forward +)
        const x = c.x + cosH * oz - sinH * ox, z = c.z + sinH * oz + cosH * ox;
        return new THREE.Vector3(x, hAt(x, z) + bob, z);
      };
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -F.heading);
      F.offs.forEach(([ox, oz], k) => {
        const bob = moving ? Math.abs(Math.sin(t * 9 + k)) * 0.07 : 0;
        const p = place(ox, oz + (moving ? Math.sin(t * 3 + k) * 0.05 : 0), k, bob);
        mtx.compose(p, q, one.clone().multiplyScalar(s));
        F.inf.setMatrixAt(k, mtx);
      });
      F.inf.instanceMatrix.needsUpdate = true;
      F.toffs.forEach(([ox, oz], k) => {
        mtx.compose(place(ox, oz, k, 0), q, one.clone().multiplyScalar(s));
        F.tanks.setMatrixAt(k, mtx);
      });
      F.tanks.instanceMatrix.needsUpdate = true;
      F.inf.visible = F.tanks.visible = s > 0.02;
      F.banner.update(un, s);
      F.banner.sprite.position.set(c.x, c.y + 6.5, c.z);
      F.banner.sprite.visible = s > 0.05;
    }
    for (const [id, F] of formations) if (!seen.has(id)) F.inf.visible = F.tanks.visible = F.banner.sprite.visible = false;

    // tracers, flashes, artillery
    let ns = 0, nf = 0;
    const seg = (p0, p1, col) => {
      if (ns >= MAXSEG) return;
      tracerPos.set([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z], ns * 6);
      tracerCol.set([col[0] * 0.4, col[1] * 0.4, col[2] * 0.4, col[0], col[1], col[2]], ns * 6);
      ns++;
    };
    const flash = (p) => { if (nf < MAXF) { flashPos.set([p.x, p.y, p.z], nf * 3); nf++; } };
    const active = [];
    if (kfs[i + 1]?.fights) active.push([kfs[i + 1], clamp01((f - 0.05) / 0.1)]);
    if (i > 0 && kfs[i].fights) active.push([kfs[i], 1 - clamp01(f / 0.25)]);
    active.forEach(([kf, alpha], wi) => {
      if (alpha <= 0) return;
      kf.fights.forEach((ft, fi) => {
        const A = centers.get(ft.a), B = centers.get(ft.b);
        if (!A || !B) return;
        const dirs = ft.oneWay ? [[A, B]] : [[A, B], [B, A]];
        dirs.forEach(([S, T], di) => {
          const shots = Math.round(18 * (ft.intensity ?? 2) * alpha);
          for (let k = 0; k < shots; k++) {
            const sd = (wi + 1) * 977 + fi * 131 + di * 53 + k;
            const rate = 0.8 + hash(sd) * 1.2, ph = frac(t * rate + hash(sd * 1.7));
            if (hash(sd * 2.3 + Math.floor(t * rate + hash(sd * 1.7))) < 0.3) continue;
            const so = S.F.offs[k % S.F.offs.length], to = T.F.offs[(k * 7) % T.F.offs.length];
            const p0 = S.c.clone().add(new THREE.Vector3(so[0] * 0.6, 0.75, so[1] * 0.6));
            const p1 = T.c.clone().add(new THREE.Vector3(to[0] * 0.6 + (hash(sd * 5) - 0.5) * 2, 0.6, to[1] * 0.6 + (hash(sd * 7) - 0.5) * 2));
            const head = p0.clone().lerp(p1, ph), tail = p0.clone().lerp(p1, Math.max(0, ph - 0.12));
            const col = S.un.faction === 'german' ? [1, 0.75, 0.45] : [1, 0.95, 0.6];
            seg(tail, head, col);
            if (ph < 0.08) flash(p0);
            if (ph > 0.94) flash(p1);
          }
        });
      });
    });
    // artillery arcs + explosions at battle sites
    let nb = 0;
    const battleList = [];
    if (kfs[i + 1]?.battles) battleList.push([kfs[i + 1], clamp01((f - 0.3) / 0.3)]);
    if (kfs[i]?.battles && i > 0) battleList.push([kfs[i], 1 - clamp01(f / 0.4)]);
    let smokeIdx = 0;
    battleList.forEach(([kf, alpha], bi) => {
      kf.battles.forEach((bt, k) => {
        if (alpha <= 0.02) return;
        const target = P(bt.at);
        const from = P(bt.from ?? [bt.at[0] + 0.55, bt.at[1] + 0.05]);
        for (let s = 0; s < 10; s++) {
          const sd = bi * 1000 + k * 100 + s, ph = frac(t * 0.45 + hash(sd));
          const land = target.clone().add(new THREE.Vector3((hash(sd * 3) - 0.5) * 9, 0, (hash(sd * 5) - 0.5) * 6));
          const arc = (p) => { const v = from.clone().lerp(land, p); v.y += Math.sin(p * Math.PI) * 28; return v; };
          seg(arc(Math.max(0, ph - 0.05)), arc(ph), [1, 0.55, 0.25]);
          if (ph > 0.9 && nb < 400) {
            boomPos.set([land.x, land.y + 0.8, land.z], nb * 3); nb++;
          }
        }
        // smoke columns
        for (let s = 0; s < 8 && smokeIdx < smokes.length; s++, smokeIdx++) {
          const sp = smokes[smokeIdx], sd = bi * 50 + k * 10 + s, life = frac(t * 0.12 + hash(sd));
          const base = target.clone().add(new THREE.Vector3((hash(sd * 3) - 0.5) * 8, 0, (hash(sd * 7) - 0.5) * 6));
          sp.position.set(base.x + life * 3, base.y + 1 + life * 12, base.z);
          const sz = 3 + life * 10;
          sp.scale.set(sz, sz, 1);
          sp.material.opacity = alpha * 0.55 * Math.sin(life * Math.PI);
          sp.visible = true;
        }
      });
    });
    for (; smokeIdx < smokes.length; smokeIdx++) smokes[smokeIdx].visible = false;
    tracerGeo.setDrawRange(0, ns * 2);
    tracerGeo.attributes.position.needsUpdate = tracerGeo.attributes.color.needsUpdate = true;
    flashGeo.setDrawRange(0, nf);
    flashGeo.attributes.position.needsUpdate = true;
    boomGeo.setDrawRange(0, nb);
    boomGeo.attributes.position.needsUpdate = true;
    booms.material.size = 4 + 2 * Math.abs(Math.sin(t * 13));

    paintOverlay(a, b, f, t);
  }

  function paintOverlay(a, b, f, t) {
    octx.clearRect(0, 0, OW, OH);
    const blend = smooth(clamp01((f - 0.3) / 0.7));
    const ring = (ring) => { octx.beginPath(); ring.forEach((ll, k) => { const [x, y] = opx(ll); k ? octx.lineTo(x, y) : octx.moveTo(x, y); }); octx.closePath(); };
    if (cfg.defaultFaction) {
      octx.fillStyle = hexA(factions[cfg.defaultFaction].color, 0.22);
      octx.fillRect(0, 0, OW, OH);
    }
    const order = [...new Set([...Object.keys(a.territory || {}), ...Object.keys(b.territory || {})])];
    for (const fid of order) {
      const col = factions[fid]?.color ?? '#888';
      for (const [kf, al] of [[a, 1 - blend], [b, blend]]) {
        if (al <= 0.01) continue;
        for (const r of kf.territory?.[fid] || []) {
          ring(r);
          octx.fillStyle = hexA(fid === cfg.defaultFaction ? '#2b2b2b' : col, 0.3 * al);
          if (fid === cfg.defaultFaction) octx.fillStyle = hexA(factions[fid].color, 0.75 * al);
          octx.fill();
          octx.lineWidth = 3;
          octx.strokeStyle = hexA(col, 0.95 * al);
          octx.stroke();
        }
      }
    }
    // attack arrows
    const arrows = (kf, grow, al) => {
      for (const ar of kf.arrows || []) {
        const pts = ar.path.map(opx);
        const col = factions[ar.faction]?.color ?? '#fff';
        const lens = [0];
        for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
        const target = lens[lens.length - 1] * grow;
        const shown = [pts[0]];
        for (let k = 1; k < pts.length; k++) {
          if (lens[k] <= target) shown.push(pts[k]);
          else { const r = (target - lens[k - 1]) / (lens[k] - lens[k - 1] || 1); shown.push([lerp(pts[k - 1][0], pts[k][0], r), lerp(pts[k - 1][1], pts[k][1], r)]); break; }
        }
        if (target < 2 || shown.length < 2) continue;
        octx.globalAlpha = al;
        octx.lineCap = octx.lineJoin = 'round';
        for (const [w, c] of [[7, 'rgba(255,255,255,0.85)'], [4, col]]) {
          octx.strokeStyle = c; octx.lineWidth = w;
          octx.beginPath(); shown.forEach(([x, y], k) => (k ? octx.lineTo(x, y) : octx.moveTo(x, y))); octx.stroke();
        }
        const [ex, ey] = shown[shown.length - 1], [qx, qy] = shown[shown.length - 2];
        const an = Math.atan2(ey - qy, ex - qx);
        octx.fillStyle = col;
        octx.beginPath();
        octx.moveTo(ex + Math.cos(an) * 11, ey + Math.sin(an) * 11);
        octx.lineTo(ex + Math.cos(an + 2.4) * 10, ey + Math.sin(an + 2.4) * 10);
        octx.lineTo(ex + Math.cos(an - 2.4) * 10, ey + Math.sin(an - 2.4) * 10);
        octx.closePath(); octx.fill();
        octx.globalAlpha = 1;
      }
    };
    if (b !== a) arrows(b, smooth(f), 0.95);
    // battle rings pulse on the table
    for (const [kf, al] of [[b, clamp01((f - 0.6) / 0.4)], [a, 1 - clamp01(f / 0.4)]]) {
      for (const bt of kf.battles || []) {
        if (al <= 0) continue;
        const [x, y] = opx(bt.at);
        octx.strokeStyle = `rgba(255,190,80,${0.8 * al})`;
        octx.lineWidth = 3;
        octx.beginPath(); octx.arc(x, y, 10 + 6 * Math.sin(t * 5), 0, Math.PI * 2); octx.stroke();
      }
    }
    ovTex.needsUpdate = true;
  }

  // ---------- HUD ----------
  function overlayHud(ctx, t) {
    if (!state) return;
    const { a, b, f, day } = state;
    const d = new Date(Math.floor(day / DAY) * DAY);
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    stroked(ctx, date, W / 2, 105 * u, 100 * u, font, '#ffffff', '#000');
    if (cfg.caption) stroked(ctx, cfg.caption, W / 2, 222 * u, 38 * u, font, '#ffd25a', '#000');
    const cap = (f < 0.5 ? a : b).caption;
    if (cap) stroked(ctx, cap, W / 2, 274 * u, 30 * u, font, '#ffffff', '#000', '700');
    const sk = f < 0.5 ? a : b;
    if (sk.stats) {
      const al = 1 - Math.abs(f - (f < 0.5 ? 0 : 1)) * 2;
      ctx.globalAlpha = Math.min(1, al * 1.5);
      const lh = 34 * u, w = 560 * u, h = sk.stats.length * lh + 32 * u, x = (W - w) / 2, y = 330 * u;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffd25a'; ctx.fillRect(x, y, 6 * u, h);
      ctx.textAlign = 'left';
      sk.stats.forEach((ln, k) => stroked(ctx, ln, x + 24 * u, y + 16 * u + k * lh, 25 * u, font, '#fff', 'rgba(0,0,0,0.7)', '700'));
    }
    ctx.restore();
    if (cfg.footnote) {
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      stroked(ctx, cfg.footnote, W / 2, H - 28 * u, 17 * u, font, 'rgba(255,255,255,0.85)', 'rgba(0,0,0,0.8)', '600');
      ctx.restore();
    }
  }

  return { scene, camera, update, overlay: overlayHud };
}

// ---------- helpers ----------

function interpolateUnits(a, b, f) {
  const ua = new Map((a.units || []).map((x) => [x.id, x]));
  const ub = new Map((b.units || []).map((x) => [x.id, x]));
  const out = [];
  for (const id of new Set([...ua.keys(), ...ub.keys()])) {
    const A = ua.get(id), B = ub.get(id);
    if (A && B) out.push({ ...B, at: [lerp(A.at[0], B.at[0], smooth(f)), lerp(A.at[1], B.at[1], smooth(f))], troops: Math.round(lerp(A.troops ?? 0, B.troops ?? 0, f)), alpha: 1 });
    else if (A) out.push({ ...A, alpha: 1 - smooth(clamp01(f / 0.6)) });
    else if (a !== b) out.push({ ...B, alpha: smooth(clamp01((f - 0.4) / 0.6)) });
  }
  return out.filter((x) => x.alpha > 0.01);
}

function makeSoldier(s) {
  const parts = [];
  const add = (g, x, y, z) => { g.translate(x, y, z); parts.push(g.toNonIndexed()); };
  add(new THREE.BoxGeometry(0.24, 0.34, 0.16), 0, 0.17, 0);          // legs
  add(new THREE.BoxGeometry(0.28, 0.4, 0.18), 0, 0.54, 0);           // torso
  add(new THREE.SphereGeometry(0.11, 8, 6), 0, 0.85, 0);             // head
  add(new THREE.SphereGeometry(0.135, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.88, 0); // helmet
  add(new THREE.BoxGeometry(0.62, 0.04, 0.04), 0.22, 0.62, 0.12);    // rifle, pointing forward (+x)
  const g = mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; }));
  g.scale(s, s, s);
  return g;
}

function makeTank(s) {
  const parts = [];
  const add = (g, x, y, z) => { g.translate(x, y, z); parts.push(g.toNonIndexed()); };
  add(new THREE.BoxGeometry(1.5, 0.38, 0.9), 0, 0.3, 0);             // hull
  add(new THREE.BoxGeometry(1.6, 0.28, 0.22), 0, 0.14, 0.38);        // tracks
  add(new THREE.BoxGeometry(1.6, 0.28, 0.22), 0, 0.14, -0.38);
  add(new THREE.BoxGeometry(0.7, 0.3, 0.6), -0.05, 0.64, 0);         // turret
  const barrel = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8);
  barrel.rotateZ(Math.PI / 2);
  add(barrel, 0.75, 0.66, 0);
  const g = mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; }));
  g.scale(s, s, s);
  return g;
}

function makeBanner(fac, font) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 150;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false }));
  sprite.renderOrder = 10;
  sprite.scale.set(0.2, 0.047, 1);
  sprite.center.set(0.5, 0);
  let key = '';
  return {
    sprite,
    update(un, alpha) {
      sprite.material.opacity = alpha;
      const k = `${un.label}|${un.troops ?? ''}`;
      if (k === key) return;
      key = k;
      ctx.clearRect(0, 0, 640, 150);
      ctx.fillStyle = 'rgba(10,12,16,0.78)';
      ctx.beginPath(); ctx.roundRect(4, 4, 632, 110, 18); ctx.fill();
      ctx.strokeStyle = fac?.color ?? '#fff'; ctx.lineWidth = 5; ctx.stroke();
      drawFlag(ctx, fac?.flag, 22, 24, 96, 66);
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 34px ${font}`;
      ctx.textBaseline = 'middle';
      const label = un.label ?? fac?.name ?? '';
      ctx.fillText(label.length > 30 ? label.slice(0, 29) + '…' : label, 136, un.troops ? 40 : 58);
      if (un.troops) { ctx.fillStyle = '#ffd25a'; ctx.font = `900 34px ${font}`; ctx.fillText(un.troops.toLocaleString('en-US'), 136, 82); }
      // pole
      ctx.fillStyle = fac?.color ?? '#fff';
      ctx.beginPath(); ctx.moveTo(305, 114); ctx.lineTo(335, 114); ctx.lineTo(320, 146); ctx.closePath(); ctx.fill();
      tex.needsUpdate = true;
    },
  };
}

function paintBase(TW, TH, cfg, px, noise) {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  // low-res noise for soil and forest tones, scaled up
  const sw = 384, sh = Math.round((sw * TH) / TW);
  const small = document.createElement('canvas');
  small.width = sw; small.height = sh;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(sw, sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const v = noise.fbm(x / 40, y / 40, 4) * 0.5 + 0.5, fz = noise.fbm(x / 18 + 9, y / 18, 3);
    const forest = fz > 0.18;
    const o = (y * sw + x) * 4;
    const [r, g, b] = forest ? [62, 84, 52] : [Math.round(150 + 40 * v), Math.round(140 + 34 * v), Math.round(98 + 20 * v)];
    img.data.set([r, g, b, 255], o);
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, TW, TH);
  // field patchwork
  const rnd = noise.rand;
  for (let k = 0; k < 2600; k++) {
    const x = rnd() * TW, y = rnd() * TH, w = 10 + rnd() * 34, h = 8 + rnd() * 26;
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 0.6);
    ctx.fillStyle = ['rgba(120,138,70,0.35)', 'rgba(170,150,90,0.35)', 'rgba(110,95,60,0.3)', 'rgba(140,160,90,0.3)'][Math.floor(rnd() * 4)];
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  // water
  ctx.fillStyle = '#3b5f86';
  for (const ring of cfg.layers?.water || []) { ctx.beginPath(); ring.forEach((ll, k) => { const [x, y] = px(ll); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = '#4a74a3'; ctx.lineCap = ctx.lineJoin = 'round';
  for (const r of cfg.layers?.rivers || []) {
    ctx.lineWidth = (r.km ?? 2) * 2.2;
    ctx.beginPath(); (r.path || r).forEach((ll, k) => { const [x, y] = px(ll); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
  }
  // city labels painted on the table, like a war-room map
  ctx.fillStyle = 'rgba(20,20,20,0.85)';
  ctx.textAlign = 'center';
  for (const ct of cfg.cities || []) {
    if (ct.region || ct.maxView) continue;
    const [x, y] = px(ct.at);
    ctx.font = `700 ${(ct.size ?? 24) >= 30 ? 30 : 17}px serif`;
    ctx.fillText(ct.name, x, y + ((ct.size ?? 24) >= 30 ? 70 : 22));
  }
  return c;
}

function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d').createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  const ctx = c.getContext('2d'); ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  for (let k = 0; k < 14; k++) {
    const x = 40 + Math.random() * 48, y = 40 + Math.random() * 48, r = 20 + Math.random() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function hexA(hex, a) {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function stroked(ctx, text, x, y, size, font, fill, stroke, weight = '900') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.16);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
