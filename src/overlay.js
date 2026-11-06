// Text overlays shared by every segment: location/date title card and
// narration subtitles. Words wrapped in *asterisks* are highlighted.

import { glyph } from './flags.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export function fadeAlpha(t, start, end, fade = 0.35) {
  if (t < start || t > end) return 0;
  return clamp01((t - start) / fade) * clamp01((end - t) / fade);
}

export function drawTitle(ctx, title, alpha, W, u, font) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const y = (title.y ?? 250) * u;
  stroked(ctx, title.text, W / 2, y, (title.size ?? 78) * u, font, '#f4f4f4', '#151515');
  if (title.sub) stroked(ctx, title.sub, W / 2, y + (title.size ?? 78) * 1.05 * u, (title.subSize ?? 48) * u, font, '#f5a340', '#151515');
  ctx.restore();
}

export function drawSubtitle(ctx, text, alpha, W, H, u, font, opts = {}) {
  if (alpha <= 0 || !text) return;
  const size = (opts.size ?? 58) * u;
  const highlight = opts.highlight ?? '#f5a340';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px ${font}`;
  ctx.textBaseline = 'alphabetic';

  // tokenise into words carrying their highlight state
  const words = [];
  let prevSpace = true;
  text.split(/(\*[^*]+\*)/).forEach((chunk) => {
    if (!chunk) return;
    const hl = chunk.startsWith('*') && chunk.endsWith('*');
    const body = hl ? chunk.slice(1, -1) : chunk;
    // "*Aizawl*, after": the ", after" chunk touches the previous word, so glue it
    let glue = words.length > 0 && !prevSpace && !/^\s/.test(body);
    body.split(/\s+/).filter(Boolean).forEach((w) => { words.push({ w, hl, glue }); glue = false; });
    prevSpace = /\s$/.test(body);
  });
  const space = ctx.measureText(' ').width;
  const maxW = W - 120 * u;
  const lines = [[]];
  let lw = 0;
  for (const word of words) {
    word.width = ctx.measureText(word.w).width;
    const line = lines[lines.length - 1];
    if (!word.glue && lw + word.width > maxW && line.length) { lines.push([]); lw = 0; }
    lines[lines.length - 1].push(word);
    lw += word.width + (word.glue ? 0 : space);
  }
  const lineH = size * 1.15;
  let y = H * (opts.y ?? 0.7) - ((lines.length - 1) * lineH) / 2;
  for (const line of lines) {
    const gap = (w, j) => (j > 0 && !w.glue ? space : 0);
    const total = line.reduce((s, w, j) => s + w.width + gap(w, j), 0);
    let x = (W - total) / 2;
    for (const [j, word] of line.entries()) {
      x += gap(word, j);
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.14;
      ctx.strokeStyle = 'rgba(10,10,10,0.9)';
      ctx.strokeText(word.w, x, y);
      ctx.fillStyle = word.hl ? highlight : '#ffffff';
      ctx.fillText(word.w, x, y);
      x += word.width;
    }
    y += lineH;
  }
  ctx.restore();
}

function stroked(ctx, text, x, y, size, font, fill, stroke) {
  ctx.font = `900 ${size}px ${font}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/**
 * Big-number card (campaign-ad style): the number counts up, with a label
 * and a small source/assumption line. Times are local to the segment.
 * { start, end, value, prefix, suffix, decimals, label, sub, color, y }
 */
export function drawCard(ctx, c, t, W, H, u, font) {
  const a = fadeAlpha(t, c.start, c.end, 0.35);
  if (a <= 0) return;
  const p = Math.min(1, (t - c.start) / (c.count ?? 1.4));
  const ease = 1 - Math.pow(1 - p, 3);
  const v = (c.value ?? 0) * ease;
  const num = v.toLocaleString('en-US', { minimumFractionDigits: c.decimals ?? 0, maximumFractionDigits: c.decimals ?? 0 });
  const text = `${c.prefix ?? ''}${num}${c.suffix ?? ''}`;
  const accent = c.color ?? '#ffd25a';
  const y = H * (c.y ?? 0.42);
  const slide = (1 - Math.min(1, (t - c.start) / 0.5)) * 40 * u;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 24 * u;
  let size = (c.size ?? 150) * u;
  ctx.font = `900 ${size}px ${font}`;
  while (ctx.measureText(text).width > W - 100 * u && size > 40 * u) { size *= 0.92; ctx.font = `900 ${size}px ${font}`; }
  ctx.fillStyle = accent;
  ctx.fillText(text, W / 2, y + slide);
  ctx.shadowBlur = 12 * u;
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 90 * u, y + 28 * u + slide, 180 * u, 6 * u);
  if (c.label) {
    ctx.font = `900 ${(c.labelSize ?? 50) * u}px ${font}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(c.label, W / 2, y + 100 * u + slide);
  }
  if (c.sub) {
    ctx.shadowBlur = 6 * u;
    ctx.font = `600 ${26 * u}px ${font}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(c.sub, W / 2, y + 150 * u + slide);
  }
  ctx.restore();
}

/**
 * Manifesto policy card: icon badge, "POLICY 01", title, bullets that
 * appear one by one, and an optional small legal/source note.
 * { start, end, num, title, icon, color, context, bullets: [], note }
 */
export function drawPolicy(ctx, p, t, W, H, u, font) {
  const a = fadeAlpha(t, p.start ?? 0, p.end ?? 9, 0.4);
  if (a <= 0) return;
  const t0 = t - (p.start ?? 0);
  const accent = p.color ?? '#ffd25a';
  ctx.save();
  ctx.globalAlpha = a;
  // darken the frame so text reads over any background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(5,8,14,0.62)');
  g.addColorStop(0.45, 'rgba(5,8,14,0.55)');
  g.addColorStop(0.75, 'rgba(5,8,14,0.15)');
  g.addColorStop(1, 'rgba(5,8,14,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const pop = 1 - Math.pow(1 - clamp01(t0 / 0.5), 3);
  const bx = W / 2, by = 330 * u, br = 86 * u * (0.7 + 0.3 * pop);
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 40 * u;
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  glyph(ctx, p.icon ?? 'shield', bx, by, br * 0.55, '#0b0f17');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.font = `800 ${32 * u}px ${font}`;
  ctx.letterSpacing = `${6 * u}px`;
  ctx.fillText(p.label ?? `POLICY ${p.num ?? ''}`.trim(), W / 2, 490 * u);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#ffffff';
  let size = 70 * u;
  const lines = wrap(ctx, p.title ?? '', W - 140 * u, size, font);
  ctx.font = `900 ${size}px ${font}`;
  lines.forEach((ln, k) => ctx.fillText(ln, W / 2, 580 * u + k * size * 1.08));
  let y = 580 * u + lines.length * size * 1.08 + 10 * u;

  if (p.context) {
    ctx.font = `600 ${27 * u}px ${font}`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    for (const ln of wrap(ctx, p.context, W - 180 * u, 27 * u, font, '600')) { ctx.fillText(ln, W / 2, y + 20 * u); y += 36 * u; }
    y += 18 * u;
  }

  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 60 * u, y + 6 * u, 120 * u, 5 * u);
  y += 60 * u;

  ctx.textAlign = 'left';
  const left = 110 * u;
  (p.bullets ?? []).forEach((b, k) => {
    const bt = clamp01((t0 - 0.8 - k * (p.step ?? 0.7)) / 0.4);
    if (bt <= 0) return;
    ctx.globalAlpha = a * bt;
    const slide = (1 - bt) * 30 * u;
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(left - 30 * u + slide, y - 12 * u, 9 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    const bl = wrap(ctx, b, W - left - 80 * u, 38 * u, font, '700');
    ctx.font = `700 ${38 * u}px ${font}`;
    bl.forEach((ln, j) => ctx.fillText(ln, left + slide, y + j * 46 * u));
    y += bl.length * 46 * u + 22 * u;
  });

  // report-card verdict pill: { text, color }
  if (p.verdict) {
    const vt = clamp01((t0 - 0.8 - (p.bullets ?? []).length * (p.step ?? 0.7) - 0.3) / 0.4);
    if (vt > 0) {
      ctx.globalAlpha = a * vt;
      ctx.font = `900 ${36 * u}px ${font}`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(p.verdict.text).width + 70 * u;
      const vy = y + 20 * u, vh = 70 * u, sc = 0.85 + 0.15 * vt;
      ctx.save();
      ctx.translate(W / 2, vy + vh / 2);
      ctx.scale(sc, sc);
      ctx.fillStyle = p.verdict.color ?? '#ffd25a';
      const r = vh / 2;
      ctx.beginPath();
      ctx.moveTo(-tw / 2 + r, -r); ctx.lineTo(tw / 2 - r, -r); ctx.arc(tw / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-tw / 2 + r, r); ctx.arc(-tw / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.fill();
      ctx.fillStyle = '#0b0f17';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.verdict.text, 0, 2 * u);
      ctx.restore();
      ctx.textBaseline = 'alphabetic';
    }
  }

  if (p.note) {
    ctx.globalAlpha = a * clamp01((t0 - 1.5) / 0.6);
    ctx.textAlign = 'center';
    ctx.font = `600 ${24 * u}px ${font}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const nl = wrap(ctx, p.note, W - 160 * u, 24 * u, font, '600');
    nl.forEach((ln, j) => ctx.fillText(ln, W / 2, H - 330 * u + j * 32 * u));
  }
  ctx.restore();
}

function wrap(ctx, text, maxW, size, font, weight = '900') {
  ctx.font = `${weight} ${size}px ${font}`;
  const out = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
  }
  if (line) out.push(line);
  return out;
}
