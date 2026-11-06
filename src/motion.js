// "motion" segment: pure motion-graphics (no map, no terrain). Neon aurora
// backgrounds, a perspective grid, particles and light streaks, plus
// timed elements: kinetic titles, glass bullet panels, film strips,
// equaliser bars, a self-drawing football pitch and a honeycomb montage.
// Everything is a pure function of t (deterministic for rendering).
//
// segment = { type:"motion", duration, palette:[c1,c2,c3], grid:true,
//             elements:[{type:"title"|"bullets"|"hexgrid"|"filmstrip"|"equalizer"|"pitch", start, end, ...}] }
import { makeNoise } from './noise.js';
import { glyph } from './flags.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeBack = (x) => { x = clamp01(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

export function createMotion(cfg, W, H, u, font) {
  const pal = cfg.palette ?? ['#ff3d7f', '#7b5cff', '#18e0ff'];
  const n = makeNoise(cfg.seed ?? 9);
  const parts = Array.from({ length: 140 }, () => ({ x: n.rand(), y: n.rand(), s: 0.5 + n.rand() * 2.2, v: 0.02 + n.rand() * 0.06, p: n.rand() * 6.28 }));
  const D = cfg.duration;

  function background(ctx, t) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = cfg.bg ?? '#05060d';
    ctx.fillRect(0, 0, W, H);
    // aurora blobs
    ctx.globalCompositeOperation = 'lighter';
    pal.forEach((c, k) => {
      const x = W * (0.5 + 0.38 * Math.sin(t * 0.35 + k * 2.1));
      const y = H * (0.35 + 0.25 * Math.cos(t * 0.27 + k * 1.7));
      const r = H * (0.42 + 0.08 * Math.sin(t * 0.5 + k));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(c, 0.42));
      g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
    ctx.globalCompositeOperation = 'source-over';
    // perspective grid floor
    if (cfg.grid !== false) {
      const hy = H * 0.68;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, hy, W, H - hy); ctx.clip();
      const gg = ctx.createLinearGradient(0, hy, 0, H);
      gg.addColorStop(0, hexA(pal[2], 0));
      gg.addColorStop(1, hexA(pal[2], 0.55));
      ctx.strokeStyle = gg;
      ctx.lineWidth = 2 * u;
      for (let k = -14; k <= 14; k++) {
        ctx.beginPath(); ctx.moveTo(W / 2 + k * 8 * u, hy); ctx.lineTo(W / 2 + k * 260 * u, H); ctx.stroke();
      }
      const off = (t * 0.6) % 1;
      for (let k = 0; k < 14; k++) {
        const z = (k + off) / 14, yy = hy + (H - hy) * z * z;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      }
      ctx.restore();
      const hz = ctx.createLinearGradient(0, hy - 30 * u, 0, hy + 30 * u);
      hz.addColorStop(0, hexA(pal[0], 0)); hz.addColorStop(0.5, hexA(pal[0], 0.8)); hz.addColorStop(1, hexA(pal[0], 0));
      ctx.fillStyle = hz;
      ctx.fillRect(0, hy - 30 * u, W, 60 * u);
    }
    // particles
    for (const p of parts) {
      const y = ((p.y - t * p.v) % 1 + 1) % 1;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + p.p));
      ctx.fillStyle = `rgba(255,255,255,${0.55 * tw})`;
      ctx.beginPath(); ctx.arc(p.x * W, y * H, p.s * u, 0, Math.PI * 2); ctx.fill();
    }
    // light streak sweeping every ~3s
    const sp = (t / 3) % 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(W * (-0.3 + sp * 1.6), 0);
    ctx.rotate(0.35);
    const sg = ctx.createLinearGradient(-60 * u, 0, 60 * u, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.10)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-60 * u, -H, 120 * u, H * 3);
    ctx.restore();
  }

  function title(ctx, e, t) {
    const lt = t - e.start, fade = e.end ? clamp01((e.end - t) / 0.4) : 1;
    const size = (e.size ?? 120) * u, y = H * (e.y ?? 0.4);
    ctx.font = `900 ${size}px ${font}`;
    const letters = [...e.text];
    const widths = letters.map((c) => ctx.measureText(c).width);
    let total = widths.reduce((a, b) => a + b, 0);
    let scale = Math.min(1, (W - 80 * u) / total);
    let x = W / 2 - (total * scale) / 2;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    letters.forEach((c, k) => {
      const p = clamp01((lt - k * 0.045) / 0.5);
      if (p <= 0) { x += widths[k] * scale; return; }
      const s = scale * (1.7 - 0.7 * easeBack(p));
      ctx.save();
      ctx.globalAlpha = p * fade;
      ctx.translate(x + (widths[k] * scale) / 2, y + (1 - easeOut(p)) * 60 * u);
      ctx.scale(s, s);
      ctx.shadowColor = e.glow ?? pal[0];
      ctx.shadowBlur = 30 * u;
      ctx.fillStyle = e.color ?? '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(c, 0, 0);
      ctx.restore();
      x += widths[k] * scale;
    });
    // underline sweep
    const ul = easeOut((lt - 0.4) / 0.6);
    const grad = ctx.createLinearGradient(W / 2 - 300 * u, 0, W / 2 + 300 * u, 0);
    pal.forEach((c, k) => grad.addColorStop(k / (pal.length - 1), c));
    ctx.globalAlpha = fade;
    ctx.fillStyle = grad;
    ctx.fillRect(W / 2 - 280 * u * ul, y + 30 * u, 560 * u * ul, 8 * u);
    if (e.sub) {
      const chars = Math.floor(clamp01((lt - 0.7) / 0.8) * e.sub.length);
      ctx.font = `800 ${(e.subSize ?? 42) * u}px ${font}`;
      ctx.textAlign = 'center';
      ctx.letterSpacing = `${8 * u}px`;
      ctx.fillStyle = e.subColor ?? pal[2];
      ctx.shadowColor = pal[2]; ctx.shadowBlur = 16 * u;
      ctx.fillText(e.sub.slice(0, chars), W / 2, y + 110 * u);
      ctx.letterSpacing = '0px';
    }
    ctx.restore();
  }

  function bullets(ctx, e, t) {
    const fade = e.end ? clamp01((e.end - t) / 0.4) : 1;
    let y = H * (e.y ?? 0.5);
    const bw = W - 120 * u, x0 = 60 * u;
    e.items.forEach((it, k) => {
      const p = easeOut((t - e.start - k * (e.step ?? 0.45)) / 0.55);
      if (p <= 0) { y += (it.h ?? 120) * u + 22 * u; return; }
      const h = (it.h ?? 120) * u;
      const x = x0 + (1 - p) * W * 0.6;
      ctx.save();
      ctx.globalAlpha = p * fade;
      // glass panel
      roundRect(ctx, x, y, bw, h, 26 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      const bg = ctx.createLinearGradient(x, y, x + bw, y + h);
      bg.addColorStop(0, hexA(it.color ?? pal[k % pal.length], 0.9)); bg.addColorStop(1, 'rgba(255,255,255,0.15)');
      ctx.strokeStyle = bg; ctx.lineWidth = 2.5 * u; ctx.stroke();
      // icon badge
      const cx = x + 70 * u, cy = y + h / 2;
      ctx.fillStyle = it.color ?? pal[k % pal.length];
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 24 * u;
      ctx.beginPath(); ctx.arc(cx, cy, 42 * u, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      glyph(ctx, it.icon ?? 'shield', cx, cy, 24 * u, '#0b0f17');
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${(it.size ?? 38) * u}px ${font}`;
      ctx.fillText(it.title, x + 135 * u, cy - (it.sub ? 18 * u : 0));
      if (it.sub) {
        ctx.font = `600 ${26 * u}px ${font}`;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(it.sub, x + 135 * u, cy + 24 * u);
      }
      ctx.restore();
      y += h + 22 * u;
    });
  }

  function hexgrid(ctx, e, t) {
    const lt = t - e.start, fade = e.end ? clamp01((e.end - t) / 0.4) : 1;
    const R = (e.radius ?? 108) * u, cols = e.cols ?? 3;
    const rows = Math.ceil(e.items.length / cols);
    const dx = R * Math.sqrt(3), dy = R * 1.5;
    const gw = dx * cols, gh = dy * (rows - 1);
    const cx0 = W / 2 - gw / 2 + dx / 2, cy0 = H * (e.y ?? 0.5) - gh / 2;
    const zoom = 1 + 0.04 * Math.sin(lt * 2);
    e.items.forEach((it, k) => {
      const r = Math.floor(k / cols), c = k % cols;
      const x = cx0 + c * dx + (r % 2 ? dx / 2 : 0) - (r % 2 ? dx / 4 : 0), y = cy0 + r * dy;
      const p = easeBack((lt - k * 0.09) / 0.45);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp01(p) * fade;
      ctx.translate(W / 2 + (x - W / 2) * zoom, H / 2 + (y - H / 2) * zoom);
      ctx.scale(p * 0.95, p * 0.95);
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = Math.PI / 6 + (s * Math.PI) / 3;
        s ? ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R) : ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      }
      ctx.closePath();
      const col = it.color ?? pal[k % pal.length];
      const hg = ctx.createLinearGradient(0, -R, 0, R);
      hg.addColorStop(0, hexA(col, 0.95)); hg.addColorStop(1, hexA(col, 0.55));
      ctx.fillStyle = hg;
      ctx.shadowColor = col; ctx.shadowBlur = 28 * u;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2 * u; ctx.stroke();
      glyph(ctx, it.icon, 0, -18 * u, 30 * u, '#0b0f17');
      ctx.fillStyle = '#0b0f17';
      ctx.font = `900 ${21 * u}px ${font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      wrapLines(ctx, it.label, R * 1.5).forEach((ln, j, arr) => ctx.fillText(ln, 0, 34 * u + (j - (arr.length - 1) / 2) * 23 * u));
      ctx.restore();
    });
  }

  function filmstrip(ctx, e, t) {
    const fade = Math.min(clamp01((t - e.start) / 0.5), e.end ? clamp01((e.end - t) / 0.4) : 1);
    const fh = 170 * u, fw = 230 * u;
    for (const [yy, dir, rot] of [[H * (e.y ?? 0.22), 1, -0.08], [H * (e.y2 ?? 0.78), -1, 0.08]]) {
      ctx.save();
      ctx.globalAlpha = fade * 0.9;
      ctx.translate(W / 2, yy);
      ctx.rotate(rot);
      ctx.fillStyle = '#0d0d12';
      ctx.fillRect(-W, -fh / 2 - 34 * u, W * 2, fh + 68 * u);
      const off = ((t * 120 * u * dir) % (fw + 24 * u));
      for (let k = -7; k <= 7; k++) {
        const x = k * (fw + 24 * u) + off;
        const g = ctx.createLinearGradient(x - fw / 2, -fh / 2, x + fw / 2, fh / 2);
        g.addColorStop(0, hexA(pal[(k + 9) % pal.length], 0.9)); g.addColorStop(1, hexA(pal[(k + 10) % pal.length], 0.6));
        ctx.fillStyle = g;
        ctx.fillRect(x - fw / 2, -fh / 2, fw, fh);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let s = 0; s < 4; s++) {
          ctx.fillRect(x - fw / 2 + s * fw / 4 + 12 * u, -fh / 2 - 24 * u, 22 * u, 14 * u);
          ctx.fillRect(x - fw / 2 + s * fw / 4 + 12 * u, fh / 2 + 10 * u, 22 * u, 14 * u);
        }
        // play triangle
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.moveTo(x - 18 * u, -24 * u); ctx.lineTo(x + 26 * u, 0); ctx.lineTo(x - 18 * u, 24 * u); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  function equalizer(ctx, e, t) {
    const fade = Math.min(clamp01((t - e.start) / 0.4), e.end ? clamp01((e.end - t) / 0.4) : 1);
    const bars = e.bars ?? 28, bw = (W - 120 * u) / bars, base = H * (e.y ?? 0.66);
    ctx.save();
    ctx.globalAlpha = fade;
    for (let k = 0; k < bars; k++) {
      const h = (40 + 180 * Math.abs(Math.sin(t * (2.5 + (k % 5) * 0.7) + k * 0.9)) * (0.5 + 0.5 * Math.sin(k * 0.35 + 1))) * u;
      const g = ctx.createLinearGradient(0, base - h, 0, base);
      g.addColorStop(0, pal[k % pal.length]); g.addColorStop(1, hexA(pal[(k + 1) % pal.length], 0.3));
      ctx.fillStyle = g;
      ctx.shadowColor = pal[k % pal.length]; ctx.shadowBlur = 14 * u;
      roundRect(ctx, 60 * u + k * bw + bw * 0.15, base - h, bw * 0.7, h, 6 * u);
      ctx.fill();
    }
    ctx.restore();
  }

  function pitch(ctx, e, t) {
    const p = easeOut((t - e.start) / (e.draw ?? 1.6));
    const fade = e.end ? clamp01((e.end - t) / 0.4) : 1;
    const pw = W * 0.82, ph = H * 0.62, x0 = (W - pw) / 2, y0 = H * (e.y ?? 0.2);
    ctx.save();
    ctx.globalAlpha = fade * 0.85;
    ctx.strokeStyle = e.color ?? '#5dffb0';
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18 * u;
    ctx.lineWidth = 4 * u;
    const L = 4000 * u;
    ctx.setLineDash([L * p, L]);
    ctx.strokeRect(x0, y0, pw, ph);
    ctx.beginPath(); ctx.moveTo(x0, y0 + ph / 2); ctx.lineTo(x0 + pw, y0 + ph / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, y0 + ph / 2, pw * 0.16, 0, Math.PI * 2 * p); ctx.stroke();
    ctx.strokeRect(W / 2 - pw * 0.3, y0, pw * 0.6, ph * 0.16);
    ctx.strokeRect(W / 2 - pw * 0.3, y0 + ph * 0.84, pw * 0.6, ph * 0.16);
    ctx.setLineDash([]);
    // ball bouncing along a passing move
    if (p > 0.6) {
      const bt = (t * 0.6) % 1;
      const pts = [[0.2, 0.8], [0.65, 0.62], [0.35, 0.4], [0.55, 0.12]];
      const seg = Math.min(2, Math.floor(bt * 3)), f = bt * 3 - seg;
      const bx = x0 + pw * (pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * f);
      const by = y0 + ph * (pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * f);
      ctx.shadowBlur = 24 * u;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(bx, by, 14 * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function note(ctx, e, t) {
    const a = Math.min(clamp01((t - e.start) / 0.5), e.end ? clamp01((e.end - t) / 0.4) : 1);
    ctx.save();
    ctx.globalAlpha = a * 0.75;
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${(e.size ?? 22) * u}px ${font}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    wrapLines(ctx, e.text, W - 140 * u).forEach((ln, j) => ctx.fillText(ln, W / 2, H * (e.y ?? 0.955) + j * 30 * u));
    ctx.restore();
  }

  const DRAW = { title, bullets, hexgrid, filmstrip, equalizer, pitch, note };

  function draw(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    background(ctx, t);
    for (const e of cfg.elements || []) {
      if (t < e.start || (e.end != null && t > e.end)) continue;
      DRAW[e.type]?.(ctx, e, t);
    }
    // fade in/out the whole segment
    const edge = Math.min(t / 0.3, (D - t) / 0.3);
    if (edge < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, edge)})`; ctx.fillRect(0, 0, W, H); }
  }
  return { draw };
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  const out = []; let line = '';
  for (const w of String(text).split(' ')) {
    const tst = line ? `${line} ${w}` : w;
    if (ctx.measureText(tst).width > maxW && line) { out.push(line); line = w; } else line = tst;
  }
  if (line) out.push(line);
  return out;
}
