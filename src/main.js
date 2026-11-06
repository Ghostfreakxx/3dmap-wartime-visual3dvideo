// Loads a scene JSON, builds its segments and exposes a deterministic
// seek(t) used both by the live preview and the frame-by-frame renderer.
import * as THREE from 'three';
import { createFlyover } from './flyover.js';
import { createCampaign } from './campaign.js';
import { createMotion } from './motion.js';
import { createBattle3D } from './battle3d.js';
import { drawTitle, drawSubtitle, drawCard, drawPolicy, fadeAlpha } from './overlay.js';

const params = new URLSearchParams(location.search);
const sceneUrl = params.get('scene') || 'scenes/aizawl-1966.json';
const renderMode = params.has('render');
const scale = parseFloat(params.get('scale') || '1');

const base = new URL(sceneUrl, location.href);
const assetUrl = (p) => new URL(p, base).href;

const spec = await (await fetch(base)).json();
const W = Math.round((spec.width ?? 1080) * scale);
const H = Math.round((spec.height ?? 1920) * scale);
const fps = spec.fps ?? 30;
const u = W / 1080; // all layout sizes are authored for a 1080px-wide frame
const font = spec.font ?? '"Arial Black", "Helvetica Neue", Arial, sans-serif';
document.title = spec.title ?? 'Wartime visual';

const stage = document.getElementById('stage');
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;
const glCanvas = document.getElementById('gl');
const mapCanvas = document.getElementById('map');
const ovCanvas = document.getElementById('overlay');
for (const c of [mapCanvas, ovCanvas]) { c.width = W; c.height = H; }
const mapCtx = mapCanvas.getContext('2d');
const ovCtx = ovCanvas.getContext('2d');

let renderer = null;
const getRenderer = () => {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // filmic grade
    renderer.toneMappingExposure = spec.exposure ?? 1.05;
  }
  return renderer;
};

// ---- build segments ----
let start = 0;
const segments = [];
for (const seg of spec.segments) {
  let impl;
  if (seg.type === 'flyover3d') { getRenderer(); impl = createFlyover(seg, W, H); }
  else if (seg.type === 'campaign2d') impl = await createCampaign(seg, W, H, u, assetUrl);
  else if (seg.type === 'motion') impl = createMotion(seg, W, H, u, font);
  else if (seg.type === 'battle3d') impl = createBattle3D(seg, W, H, u, font, getRenderer());
  else throw new Error(`unknown segment type: ${seg.type}`);
  segments.push({ ...seg, impl, start, end: start + seg.duration });
  start += seg.duration;
}
const duration = start;

function locate(t) {
  const seg = segments.find((s) => t < s.end) ?? segments[segments.length - 1];
  return { seg, local: Math.min(t - seg.start, seg.duration - 1e-6) };
}

function seek(t) {
  t = Math.max(0, Math.min(duration - 1e-6, t));
  const { seg, local } = locate(t);
  const is3d = seg.type === 'flyover3d' || seg.type === 'battle3d';
  glCanvas.style.display = is3d ? 'block' : 'none';
  mapCanvas.style.display = is3d ? 'none' : 'block';
  if (is3d) {
    seg.impl.update(local);
    renderer.render(seg.impl.scene, seg.impl.camera);
  } else {
    seg.impl.draw(mapCtx, local);
  }

  ovCtx.setTransform(1, 0, 0, 1, 0, 0);
  ovCtx.clearRect(0, 0, W, H);
  // subtle vignette for the cinematic look
  const g = ovCtx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${seg.vignette ?? (is3d ? 0.45 : 0.25)})`);
  ovCtx.fillStyle = g;
  ovCtx.fillRect(0, 0, W, H);

  seg.impl.overlay?.(ovCtx, local);
  if (seg.title) {
    const ti = seg.title;
    drawTitle(ovCtx, ti, fadeAlpha(local, ti.start ?? 0, ti.end ?? seg.duration), W, u, font);
  }
  for (const card of seg.cards || []) drawCard(ovCtx, card, local, W, H, u, font);
  if (seg.policy) drawPolicy(ovCtx, seg.policy, local, W, H, u, font);
  for (const s of spec.subtitles || []) {
    const a = fadeAlpha(t, s.start, s.end, 0.2);
    if (a > 0) drawSubtitle(ovCtx, s.text, a, W, H, u, font, spec.subtitleStyle);
  }

  // fade through black between segments
  const fade = spec.transition ?? 0.4;
  const edge = Math.min(seg.start > 0 ? local : Infinity, seg.end < duration ? seg.duration - local : Infinity);
  if (edge < fade) {
    ovCtx.fillStyle = `rgba(0,0,0,${1 - edge / fade})`;
    ovCtx.fillRect(0, 0, W, H);
  }
}

window.__renderer = { ready: true, duration, fps, width: W, height: H, seek, audio: spec.audio ?? null };

// ---- live preview ----
if (renderMode) {
  document.body.classList.add('render');
  seek(0);
} else {
  setupPreview();
}

function setupPreview() {
  const play = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const time = document.getElementById('time');
  const audio = spec.audio ? new Audio(assetUrl(spec.audio)) : null;
  scrub.max = duration;
  let t = 0, playing = false, last = 0;

  const fit = () => {
    const s = Math.min(innerWidth / W, (innerHeight - 64) / H);
    stage.style.transform = `scale(${s})`;
  };
  addEventListener('resize', fit);
  fit();

  const show = () => {
    seek(t);
    scrub.value = t;
    time.textContent = `${t.toFixed(1)} / ${duration.toFixed(1)}s`;
  };
  const toggle = () => {
    playing = !playing;
    play.textContent = playing ? 'Pause' : 'Play';
    if (playing) {
      if (t >= duration - 0.05) t = 0;
      last = performance.now();
      if (audio) { audio.currentTime = t; audio.play().catch(() => {}); }
      requestAnimationFrame(loop);
    } else audio?.pause();
  };
  const loop = (now) => {
    if (!playing) return;
    t += (now - last) / 1000;
    last = now;
    if (t >= duration) { t = duration; toggle(); }
    show();
    if (playing) requestAnimationFrame(loop);
  };
  play.onclick = toggle;
  scrub.oninput = () => { t = parseFloat(scrub.value); if (audio) audio.currentTime = t; show(); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); toggle(); } });

  const select = document.getElementById('scene');
  fetch('scenes/index.json').then((r) => r.json()).then((list) => {
    for (const s of list) select.add(new Option(s.name, s.file, false, s.file === sceneUrl));
  }).catch(() => select.remove());
  select.onchange = () => { location.search = `?scene=${encodeURIComponent(select.value)}`; };
  show();
}
