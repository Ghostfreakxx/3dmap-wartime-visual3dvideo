// "flyover3d" segment: procedural mountain terrain at golden hour with a jet
// flying through it (the Aizawl-style cinematic shot).
import * as THREE from 'three';
import { makeNoise } from './noise.js';
import { addFeatures } from './features3d.js';

const DEFAULT_SKY = {
  zenith: '#2b1d3a',
  horizon: '#ffb347',
  sun: '#fff1b0',
  fog: '#b86a3a',
  sunElevation: 3, // degrees above horizon
};

const DEFAULT_TERRAIN = {
  seed: 7,
  height: 380, // peak height in world units
  scale: 900, // horizontal size of a mountain "cell"
  low: '#1c2610',
  mid: '#4d5a22',
  high: '#8b7a46',
};

export function createFlyover(cfg, W, H) {
  const sky = { ...DEFAULT_SKY, ...cfg.sky };
  const tcfg = { ...DEFAULT_TERRAIN, ...cfg.terrain };
  const cam = { mode: 'headon', distance: 70, height: 10, fov: 50, ...cfg.camera };
  const flight = { speed: 140, altitude: 430, weave: 60, ...cfg.flight };
  const duration = cfg.duration;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(cam.fov, W / H, 1, 12000);

  // In head-on mode the camera looks back (+z) at an approaching jet; the sun
  // sits behind the jet in both modes so the shot is backlit, like the sample.
  const lookSign = cam.mode === 'chase' ? -1 : 1;
  const elev = THREE.MathUtils.degToRad(sky.sunElevation);
  const sunDir = new THREE.Vector3(0, Math.sin(elev), lookSign * Math.cos(elev)).normalize();

  scene.fog = new THREE.Fog(sky.fog, cfg.fogNear ?? 250, cfg.fogFar ?? 2600);

  // ---- terrain ----
  const noise = makeNoise(tcfg.seed);
  const baseHeight = (x, z) => {
    const nx = x / tcfg.scale, nz = z / tcfg.scale;
    const ridges = noise.ridged(nx, nz, 6);
    const massif = 0.35 + 0.65 * (0.5 + 0.5 * noise.fbm(nx * 0.25 + 11, nz * 0.25 - 7, 3));
    return Math.pow(ridges, 1.6) * massif * tcfg.height;
  };
  // terrain.flatten: [{ at, side, dist, radius, level }] levels a plateau for a
  // planned city, `at` along the flight like features (path x/z without height)
  const flatSpots = (tcfg.flatten || []).map((fl) => {
    const T = duration * (fl.at ?? 0.5);
    const x = Math.sin(T * 0.45) * (flight.weave ?? 60) + (fl.side ?? 1) * (fl.dist ?? 0);
    const z = (flight.speed * duration) / 2 - flight.speed * T;
    return { x, z, r: fl.radius ?? 400, level: fl.level ?? 120 };
  });
  const heightAt = (x, z) => {
    let h = baseHeight(x, z);
    for (const fs of flatSpots) {
      const d = Math.hypot(x - fs.x, z - fs.z) / fs.r;
      if (d < 1.6) {
        const k = d < 1 ? 1 : 1 - (d - 1) / 0.6; // full plateau, then a soft shoulder
        const w = k * k * (3 - 2 * k);
        h = h * (1 - w) + fs.level * w;
      }
    }
    return h;
  };

  const SIZE = 7000, SEG = 320;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const cLow = new THREE.Color(tcfg.low), cMid = new THREE.Color(tcfg.mid), cHigh = new THREE.Color(tcfg.high);
  const colors = new Float32Array(pos.count * 3);
  const normals = geo.attributes.normal;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / tcfg.height;
    const slope = 1 - normals.getY(i);
    if (h < 0.45) c.lerpColors(cLow, cMid, h / 0.45);
    else c.lerpColors(cMid, cHigh, Math.min(1, (h - 0.45) / 0.55));
    c.lerp(cHigh, Math.min(1, slope * 0.8)); // rocky steep faces
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  );
  scene.add(terrain);

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(sky.horizon, '#1a1208', 0.55));
  const sunLight = new THREE.DirectionalLight(sky.sun, 2.4);
  sunLight.position.copy(sunDir).multiplyScalar(3000);
  scene.add(sunLight);
  const rim = new THREE.DirectionalLight(sky.horizon, 0.6);
  rim.position.set(-sunDir.x, 0.6, -sunDir.z).multiplyScalar(3000);
  scene.add(rim);

  // ---- sky dome ----
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      zenith: { value: new THREE.Color(sky.zenith) },
      horizon: { value: new THREE.Color(sky.horizon) },
      sunColor: { value: new THREE.Color(sky.sun) },
      sunDir: { value: sunDir },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = wp.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith, horizon, sunColor, sunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizon, zenith, pow(h, 0.42));
        float s = max(dot(d, sunDir), 0.0);
        col += sunColor * (pow(s, 1800.0) * 4.0 + pow(s, 90.0) * 0.6 + pow(s, 7.0) * 0.2);
        if (d.y < 0.0) col = mix(col, horizon * 0.55, clamp(-d.y * 6.0, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), skyMat);
  scene.add(skyDome);

  // ---- jet ----
  const jet = buildJet(cfg.jet);
  jet.visible = !cfg.jet?.hidden; // {jet:{hidden:true}} for a pure landscape flight
  scene.add(jet);

  // Flight path: travels along -z, weaving gently left/right.
  const z0 = (flight.speed * duration) / 2;
  const pathAt = (t) => {
    const z = z0 - flight.speed * t;
    const x = Math.sin(t * 0.45) * flight.weave;
    let ground = 0;
    for (let k = -2; k <= 4; k++) ground = Math.max(ground, heightAt(x, z - k * 30));
    const y = Math.max(flight.altitude, ground + 60);
    return new THREE.Vector3(x, y, z);
  };

  const updateFeatures = cfg.features
    ? addFeatures(scene, cfg.features, { heightAt, pathAt, duration, seed: (tcfg.seed ?? 1) + 11 })
    : () => {};

  function update(t) {
    updateFeatures(t);
    const p = pathAt(t);
    const ahead = pathAt(t + 0.25);
    jet.position.copy(p);
    // Object3D.lookAt aims +z at the target; the nose is -z, so aim behind.
    jet.lookAt(2 * p.x - ahead.x, 2 * p.y - ahead.y, 2 * p.z - ahead.z);
    jet.rotateZ(-(ahead.x - p.x) * 0.02); // bank into turns

    const sway = Math.sin(t * 0.3) * 6;
    if (cam.mode === 'chase') {
      camera.position.set(p.x + sway, p.y + cam.height + 6, p.z + cam.distance);
      // lookDown tilts the drone camera toward the ground (world units at 80 ahead)
      camera.lookAt(p.x, p.y + cam.height + 3 - (cam.lookDown ?? 0), p.z - 80);
    } else {
      // camera flies ahead of the jet, slowly letting it catch up
      const lead = cam.distance * (1.25 - 0.35 * Math.min(1, t / duration));
      camera.position.set(p.x * 0.6 + sway, p.y + cam.height, p.z - lead);
      camera.lookAt(p.x, p.y - 4, p.z + 40);
    }
    skyDome.position.copy(camera.position);
  }

  function dispose() {
    geo.dispose();
    terrain.material.dispose();
    skyMat.dispose();
  }

  return { scene, camera, update, dispose };
}

/** Low-poly twin-engine, twin-tail fighter; nose points to -z. */
function buildJet(opts = {}) {
  const scale = opts.scale ?? 1;
  const metal = new THREE.MeshStandardMaterial({ color: opts.color ?? '#7d7f80', metalness: 0.7, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2c2e', metalness: 0.5, roughness: 0.5 });
  const glow = new THREE.MeshBasicMaterial({ color: '#ffb060' });
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 14, 10), metal);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 10), metal);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -9;
  g.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  canopy.scale.set(1, 0.8, 2.4);
  canopy.position.set(0, 0.7, -4.5);
  g.add(canopy);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -3); wingShape.lineTo(8.5, 2.2); wingShape.lineTo(8.5, 3.4); wingShape.lineTo(0, 3.6);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.25, bevelEnabled: false });
  for (const side of [1, -1]) {
    const w = new THREE.Mesh(wingGeo, metal);
    w.rotation.x = Math.PI / 2;
    w.scale.x = side;
    w.position.set(side * 0.8, 0, 0);
    g.add(w);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 2.6), metal);
    tail.position.set(side * 1.3, 2, 5.4);
    tail.rotation.set(-0.35, 0, side * 0.3);
    g.add(tail);

    const stab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 1.8), metal);
    stab.position.set(side * 2.4, 0, 6.2);
    g.add(stab);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 12), glow);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(side * 0.55, 0, 7.1);
    g.add(nozzle);
  }
  g.scale.setScalar(scale);
  return g;
}
