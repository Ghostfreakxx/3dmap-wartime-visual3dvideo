// "campaign2d" segment: animated conquest map. Territory per faction,
// units (flag + troop count) that move and grow/shrink, attack arrows,
// battles, and a running date counter (the "every day" map style).
import { makeNoise } from './noise.js';
import { drawFlag, loadFlagImages } from './flags.js';

const TEX_W = 1600;
const DAY = 86400000;

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const parseDate = (s) => Date.parse(s + 'T00:00:00Z');

function merc(lon, lat) {
  const s = Math.sin((lat * Math.PI) / 180);
  return [(lon + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export async function createCampaign(cfg, W, H, u, assetUrl) {
  const style = {
    land: ['#b89366', '#d6bb8a', '#8f7350'],
    water: '#2f4f8f',
    river: '#3a5c9a',
    territoryAlpha: 0.6,
    font: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
    ...cfg.style,
  };
  const factions = Object.fromEntries((cfg.factions || []).map((f) => [f.id, f]));
  await loadFlagImages(cfg.factions || [], assetUrl);

  // ---- projection: lon/lat -> texture pixels ----
  const bbox = cfg.bbox; // [west, south, east, north] — whole drawable area
  const [x0, y0] = merc(bbox[0], bbox[3]);
  const [x1, y1] = merc(bbox[2], bbox[1]);
  const k = TEX_W / (x1 - x0);
  const TEX_H = Math.round((y1 - y0) * k);
  const P = (ll) => {
    const [x, y] = merc(ll[0], ll[1]);
    return [(x - x0) * k, (y - y0) * k];
  };
  const midLat = (bbox[1] + bbox[3]) / 2;
  const pxPerKm = k / (40075 * Math.cos((midLat * Math.PI) / 180));

  // ---- land texture (pseudo-satellite), rendered once ----
  const landTex = paintLand(TEX_W, TEX_H, style.land, cfg.seed ?? 3);
  const layers = cfg.layers || {};

  // ---- keyframes ----
  const kfs = cfg.keyframes.map((kf) => ({ ...kf, day: parseDate(kf.date) }));
  const hold = cfg.hold ?? 1.5;
  const animDur = Math.max(0.001, cfg.duration - hold);
  const dayStart = kfs[0].day, dayEnd = kfs[kfs.length - 1].day;

  function viewFor(b) {
    const [ax, ay] = P([b[0], b[3]]);
    const [bx, by] = P([b[2], b[1]]);
    const fit = cfg.fit === 'cover' ? Math.max : Math.min;
    return { cx: (ax + bx) / 2, cy: (ay + by) / 2, s: fit(W / (bx - ax), H / (by - ay)) };
  }
  const defaultView = viewFor(cfg.view || bbox);
  for (const kf of kfs) kf._view = kf.view ? viewFor(kf.view) : null;
  // carry views forward so every keyframe has one
  let lastView = defaultView;
  for (const kf of kfs) lastView = kf._view = kf._view || lastView;

  const terrLayer = canvas(W, H);
  const tctx = terrLayer.getContext('2d');

  function locate(t) {
    const p = clamp01(t / animDur);
    if (cfg.timing === 'keyframes') {
      // every keyframe interval gets equal screen time, whatever its length in days
      const x = p * (kfs.length - 1);
      const i = Math.min(Math.floor(x), kfs.length - 2);
      const a = kfs[i], b = kfs[i + 1] ?? a;
      const f = clamp01(x - i);
      return { day: lerp(a.day, b.day, f), i, a, b, f };
    }
    const day = lerp(dayStart, dayEnd, p);
    let i = 0;
    while (i < kfs.length - 2 && day >= kfs[i + 1].day) i++;
    const a = kfs[i], b = kfs[Math.min(i + 1, kfs.length - 1)];
    const f = b.day > a.day ? clamp01((day - a.day) / (b.day - a.day)) : 1;
    return { day, i, a, b, f };
  }

  function draw(ctx, t) {
    const { day, i, a, b, f } = locate(t);
    const m = smooth(f);
    const view = {
      cx: lerp(a._view.cx, b._view.cx, m),
      cy: lerp(a._view.cy, b._view.cy, m),
      s: Math.exp(lerp(Math.log(a._view.s), Math.log(b._view.s), m)),
    };
    const toScreen = ([px, py]) => [(px - view.cx) * view.s + W / 2, (py - view.cy) * view.s + H / 2];
    const S = (ll) => toScreen(P(ll));
    const world = (c) => c.setTransform(view.s, 0, 0, view.s, W / 2 - view.cx * view.s, H / 2 - view.cy * view.s);

    // base land
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = style.land[0];
    ctx.fillRect(0, 0, W, H);
    world(ctx);
    ctx.drawImage(landTex, 0, 0);

    // territory: default faction everywhere, then each faction's areas,
    // cross-fading from keyframe a to keyframe b late in the interval.
    const blend = smooth(clamp01((f - 0.35) / 0.65));
    const order = [...new Set([...Object.keys(a.territory || {}), ...Object.keys(b.territory || {})])];
    if (cfg.defaultFaction && factions[cfg.defaultFaction]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = style.territoryAlpha;
      ctx.fillStyle = factions[cfg.defaultFaction].color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    for (const fid of order) {
      const fac = factions[fid];
      if (!fac) continue;
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, W, H);
      world(tctx);
      tctx.fillStyle = tctx.strokeStyle = fac.color;
      tctx.globalAlpha = 1 - blend;
      drawShapes(tctx, a.territory?.[fid], P, pxPerKm);
      tctx.globalAlpha = blend;
      drawShapes(tctx, b.territory?.[fid], P, pxPerKm);
      tctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = fac.alpha ?? style.territoryAlpha;
      ctx.drawImage(terrLayer, 0, 0);
      ctx.globalAlpha = 1;
    }

    // water on top (clips territory to the coast), then rivers
    world(ctx);
    ctx.fillStyle = style.water;
    for (const ring of layers.water || []) fillRing(ctx, ring, P);
    ctx.strokeStyle = style.river;
    ctx.lineJoin = ctx.lineCap = 'round';
    for (const r of layers.rivers || []) {
      ctx.lineWidth = (r.km ?? 3) * pxPerKm;
      strokePath(ctx, r.path || r, P);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawCities(ctx, cfg.cities || [], S, u, style);
    drawArrows(ctx, kfs, i, f, factions, S, u);
    drawBattles(ctx, kfs, i, f, S, u, style, t);
    const units = interpolateUnits(a, b, f);
    drawUnits(ctx, units, factions, S, u, style);
    if (cfg.legend !== false) drawLegend(ctx, factions, units, W, H, u, style, cfg);
    drawDate(ctx, day, W, u, style, cfg.dateFormat);
    if (cfg.caption) drawCaption(ctx, cfg.caption, a.caption, W, u, style);
  }

  return { draw };
}

// ---------- drawing helpers ----------

function paintLand(w, h, [base, light, dark], seed) {
  const n = makeNoise(seed);
  const sw = Math.ceil(w / 2), sh = Math.ceil(h / 2);
  const small = canvas(sw, sh);
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(sw, sh);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const B = hex(base), L = hex(light), D = hex(dark);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const v = n.fbm(x / 140, y / 140, 5);
      const r = n.ridged(x / 60 + 5, y / 60 - 3, 4);
      let t = clamp01(0.5 + v * 0.9);
      const mix = t < 0.5 ? [D, B, t * 2] : [B, L, (t - 0.5) * 2];
      const o = (y * sw + x) * 4;
      for (let c = 0; c < 3; c++) {
        img.data[o + c] = lerp(mix[0][c], mix[1][c], mix[2]) * (0.88 + r * 0.18);
      }
      img.data[o + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  const out = canvas(w, h);
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(small, 0, 0, w, h);
  return out;
}

function ringPath(ctx, ring, P) {
  ctx.beginPath();
  ring.forEach((ll, j) => {
    const [x, y] = P(ll);
    if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  });
}
function fillRing(ctx, ring, P) {
  ringPath(ctx, ring, P);
  ctx.closePath();
  ctx.fill();
}
function strokePath(ctx, path, P) {
  ringPath(ctx, path, P);
  ctx.stroke();
}

/** A shape is either a polygon ring [[lon,lat],...] or a corridor {path, km}. */
function drawShapes(ctx, shapes, P, pxPerKm) {
  for (const sh of shapes || []) {
    if (Array.isArray(sh)) fillRing(ctx, sh, P);
    else if (sh.path) {
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.lineWidth = (sh.km ?? 20) * 2 * pxPerKm;
      strokePath(ctx, sh.path, P);
    }
  }
}

function outlinedText(ctx, text, x, y, size, style, fill = '#fff', stroke = 'rgba(0,0,0,0.85)', weight = '900') {
  ctx.font = `${weight} ${size}px ${style.font}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.16);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawCities(ctx, cities, S, u, style) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const c of cities) {
    const [x, y] = S(c.at);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 4 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    outlinedText(ctx, c.name, x, y + 7 * u, (c.size ?? 24) * u, style, '#f4f1ea', 'rgba(20,20,20,0.7)', '700');
    ctx.globalAlpha = 1;
  }
}

function interpolateUnits(a, b, f) {
  const ua = new Map((a.units || []).map((x) => [x.id, x]));
  const ub = new Map((b.units || []).map((x) => [x.id, x]));
  const ids = new Set([...ua.keys(), ...ub.keys()]);
  const out = [];
  for (const id of ids) {
    const A = ua.get(id), B = ub.get(id);
    if (A && B) {
      out.push({
        ...B,
        at: [lerp(A.at[0], B.at[0], f), lerp(A.at[1], B.at[1], f)],
        troops: Math.round(lerp(A.troops ?? 0, B.troops ?? 0, f)),
        alpha: 1,
      });
    } else if (A) {
      out.push({ ...A, alpha: 1 - smooth(clamp01(f / 0.6)) }); // disbanded/destroyed
    } else if (a !== b) {
      out.push({ ...B, alpha: smooth(clamp01((f - 0.4) / 0.6)) }); // newly raised
    }
  }
  return out.filter((x) => x.alpha > 0.01);
}

function drawUnits(ctx, units, factions, S, u, style) {
  const fw = 46 * u, fh = 30 * u;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const un of units) {
    const fac = factions[un.faction];
    if (!fac) continue;
    const [x, y] = S(un.at);
    ctx.globalAlpha = un.alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6 * u;
    drawFlag(ctx, fac.flag, x - fw / 2, y - fh / 2, fw, fh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(x - fw / 2, y - fh / 2, fw, fh);
    if (un.troops) outlinedText(ctx, un.troops.toLocaleString('en-US'), x, y + fh / 2 + 4 * u, 22 * u, style);
    if (un.label) outlinedText(ctx, un.label, x, y - fh / 2 - 26 * u, 18 * u, style, '#ffe9b0', 'rgba(0,0,0,0.8)', '700');
    ctx.globalAlpha = 1;
  }
}

/** Arrows on keyframe k animate during the interval that ends at k. */
function drawArrows(ctx, kfs, i, f, factions, S, u) {
  const draw = (kf, grow, alpha) => {
    for (const ar of kf.arrows || []) {
      const fac = factions[ar.faction];
      if (!fac || alpha <= 0) continue;
      const pts = ar.path.map(S);
      const lens = [0];
      for (let j = 1; j < pts.length; j++) lens.push(lens[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      const target = lens[lens.length - 1] * grow;
      if (target < 2) continue;
      const shown = [pts[0]];
      for (let j = 1; j < pts.length; j++) {
        if (lens[j] <= target) shown.push(pts[j]);
        else {
          const r = (target - lens[j - 1]) / (lens[j] - lens[j - 1]);
          shown.push([lerp(pts[j - 1][0], pts[j][0], r), lerp(pts[j - 1][1], pts[j][1], r)]);
          break;
        }
      }
      ctx.globalAlpha = alpha;
      ctx.lineJoin = ctx.lineCap = 'round';
      for (const [w, col] of [[14 * u, 'rgba(255,255,255,0.9)'], [8 * u, fac.color]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        shown.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
      const [ex, ey] = shown[shown.length - 1];
      const [px, py] = shown[shown.length - 2];
      const ang = Math.atan2(ey - py, ex - px);
      ctx.fillStyle = fac.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(ang) * 22 * u, ey + Math.sin(ang) * 22 * u);
      ctx.lineTo(ex + Math.cos(ang + 2.4) * 20 * u, ey + Math.sin(ang + 2.4) * 20 * u);
      ctx.lineTo(ex + Math.cos(ang - 2.4) * 20 * u, ey + Math.sin(ang - 2.4) * 20 * u);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
  if (kfs[i + 1]) draw(kfs[i + 1], smooth(f), 0.95); // growing toward the next keyframe
  if (i > 0) draw(kfs[i], 1, 0.95 * (1 - clamp01(f / 0.3))); // just-arrived arrows fade out
}

function drawBattles(ctx, kfs, i, f, S, u, style, t) {
  const show = (kf, alpha) => {
    for (const bt of kf.battles || []) {
      if (alpha <= 0) continue;
      const [x, y] = S(bt.at);
      const pulse = 1 + 0.15 * Math.sin(t * 8);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255,200,60,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, 34 * u * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = 6 * u;
      ctx.lineCap = 'round';
      const r = 18 * u;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * u;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      if (bt.label) outlinedText(ctx, bt.label, x, y - 40 * u, 24 * u, style, '#ffd25a');
      ctx.globalAlpha = 1;
    }
  };
  if (kfs[i + 1]) show(kfs[i + 1], smooth(clamp01((f - 0.7) / 0.3)));
  show(kfs[i], 1 - smooth(clamp01(f / 0.45)));
}

function drawLegend(ctx, factions, units, W, H, u, style, cfg) {
  const totals = {};
  for (const un of units) totals[un.faction] = (totals[un.faction] || 0) + (un.troops || 0) * un.alpha;
  const list = Object.values(factions);
  const x = 36 * u;
  let y = H - (cfg.legendBottom ?? 300) * u - list.length * 58 * u;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x - 16 * u, y - 16 * u, 420 * u, list.length * 58 * u + 18 * u);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const fac of list) {
    drawFlag(ctx, fac.flag, x, y, 42 * u, 28 * u);
    outlinedText(ctx, fac.name, x + 56 * u, y + 8 * u, 24 * u, style, '#fff', 'rgba(0,0,0,0.8)', '700');
    const tot = Math.round(totals[fac.id] || 0);
    if (tot) outlinedText(ctx, tot.toLocaleString('en-US'), x + 56 * u, y + 36 * u, 20 * u, style, '#ffd25a', 'rgba(0,0,0,0.8)', '700');
    y += 58 * u;
  }
}

function drawDate(ctx, day, W, u, style, fmt = 'YYYY/MM/DD') {
  const d = new Date(Math.floor(day / DAY) * DAY);
  const pad = (n) => String(n).padStart(2, '0');
  const text = fmt
    .replace('YYYY', d.getUTCFullYear())
    .replace('MM', pad(d.getUTCMonth() + 1))
    .replace('DD', pad(d.getUTCDate()));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  outlinedText(ctx, text, W / 2, 110 * u, 104 * u, style, '#fff', '#000');
}

function drawCaption(ctx, title, kfCaption, W, u, style) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  outlinedText(ctx, title, W / 2, 230 * u, 40 * u, style, '#ffd25a', '#000');
  if (kfCaption) outlinedText(ctx, kfCaption, W / 2, 285 * u, 30 * u, style, '#fff', '#000', '700');
}
