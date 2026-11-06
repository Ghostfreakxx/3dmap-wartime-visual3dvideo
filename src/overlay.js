// Text overlays shared by every segment: location/date title card and
// narration subtitles. Words wrapped in *asterisks* are highlighted.

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
