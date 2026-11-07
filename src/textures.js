// Hand-painted-ish canvas textures for tabards, banners and the windmill.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function finish(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const RED = '#c8322f', BLUE = '#2f55a8', GOLD = '#f2c53d', WHITE = '#f4f1ea', DARKBLUE = '#22407f';

function fleur(g, x, y, s) {
  g.fillStyle = GOLD;
  g.beginPath(); g.ellipse(x, y - s * 0.5, s * 0.22, s * 0.5, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x - s * 0.4, y - s * 0.2, s * 0.18, s * 0.35, -0.7, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + s * 0.4, y - s * 0.2, s * 0.18, s * 0.35, 0.7, 0, Math.PI * 2); g.fill();
  g.fillRect(x - s * 0.45, y + s * 0.05, s * 0.9, s * 0.16);
}
function lion(g, x, y, s) {
  g.fillStyle = GOLD;
  g.beginPath(); g.ellipse(x, y, s * 0.6, s * 0.22, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x + s * 0.55, y - s * 0.15, s * 0.22, 0, Math.PI * 2); g.fill();
}
function star(g, x, y, r) {
  g.fillStyle = GOLD;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}
function folds(g, w, h) {
  // soft cloth folds + inked hem
  g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 3;
  for (let x = 8; x < w; x += 21) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 2, h); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, h - 5, w, 5);
}

/**
 * Tabards wrap around a cylinder whose front (+z) is at u = 0.5.
 * kinds: stgeorge | royal | frenchStar | frenchPale
 */
const _cache = {};
export function tabard(kind) {
  if (_cache[kind]) return _cache[kind];
  const [c, g] = canvas(256, 128);
  const W = 256, H = 128;
  if (kind === 'stgeorge') {
    g.fillStyle = WHITE; g.fillRect(0, 0, W, H);
    g.fillStyle = RED;
    for (const cx of [128, 0, 256]) {
      g.fillRect(cx - 11, 0, 22, H);
      g.fillRect(cx - 52, 38, 104, 20);
    }
  } else if (kind === 'royal') {
    for (let x = 0; x < W; x += 64) {
      const q = (x / 64) % 2;
      g.fillStyle = q ? RED : BLUE; g.fillRect(x, 0, 64, H / 2);
      g.fillStyle = q ? BLUE : RED; g.fillRect(x, H / 2, 64, H / 2);
      if (q) { lion(g, x + 26, 18, 18); lion(g, x + 26, 40, 18); fleur(g, x + 32, 92, 16); }
      else { fleur(g, x + 32, 30, 16); lion(g, x + 26, 82, 18); lion(g, x + 26, 104, 18); }
    }
  } else if (kind === 'frenchStar') {
    g.fillStyle = BLUE; g.fillRect(0, 0, W, H);
    star(g, 128, 56, 20); star(g, 0, 56, 20); star(g, 256, 56, 20);
    g.fillStyle = GOLD; g.fillRect(0, H - 22, W, 10);
  } else if (kind === 'frenchPale') {
    for (let x = 0; x < W; x += 64) {
      g.fillStyle = (x / 64) % 2 ? GOLD : BLUE; g.fillRect(x, 0, 64, H);
    }
    g.fillStyle = DARKBLUE; g.fillRect(0, H - 22, W, 10);
  }
  folds(g, W, H);
  return (_cache[kind] = finish(c));
}

export function banner(kind) {
  const key = 'banner-' + kind;
  if (_cache[key]) return _cache[key];
  const [c, g] = canvas(128, 96);
  if (kind === 'fleur') {
    g.fillStyle = BLUE; g.fillRect(0, 0, 128, 96);
    fleur(g, 32, 34, 20); fleur(g, 96, 34, 20); fleur(g, 64, 74, 20);
  } else if (kind === 'stgeorge') {
    g.fillStyle = WHITE; g.fillRect(0, 0, 128, 96);
    g.fillStyle = RED; g.fillRect(54, 0, 20, 96); g.fillRect(0, 38, 128, 20);
  } else {
    // royal quartered
    g.fillStyle = BLUE; g.fillRect(0, 0, 64, 48); g.fillRect(64, 48, 64, 48);
    g.fillStyle = RED; g.fillRect(64, 0, 64, 48); g.fillRect(0, 48, 64, 48);
    fleur(g, 32, 28, 16); fleur(g, 96, 76, 16);
    lion(g, 90, 16, 16); lion(g, 90, 34, 16); lion(g, 26, 64, 16); lion(g, 26, 82, 16);
  }
  g.strokeStyle = '#2b2522'; g.lineWidth = 6; g.strokeRect(0, 0, 128, 96);
  return (_cache[key] = finish(c));
}

export function sailLattice() {
  if (_cache.sail) return _cache.sail;
  const [c, g] = canvas(64, 256);
  g.fillStyle = '#efe4c8'; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = '#6b4a2e'; g.lineWidth = 5;
  for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
  for (let x = 0; x <= 64; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  return (_cache.sail = finish(c));
}

export function planks() {
  if (_cache.planks) return _cache.planks;
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#b8895a'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(70,40,20,0.55)'; g.lineWidth = 3;
  for (let x = 0; x <= 128; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (_cache.planks = t);
}

/** Soft round blob for fake contact shadows. */
export function blob() {
  if (_cache.blob) return _cache.blob;
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 31);
  grd.addColorStop(0, 'rgba(20,16,14,0.55)');
  grd.addColorStop(1, 'rgba(20,16,14,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return (_cache.blob = new THREE.CanvasTexture(c));
}
