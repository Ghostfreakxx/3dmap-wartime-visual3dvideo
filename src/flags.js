// Procedural flags so scenes work offline; use {type:"image", src} for real ones.
//   {type:"tricolor-v", colors:[a,b,c]}   vertical bands (France, Italy, ...)
//   {type:"tricolor-h", colors:[a,b,c]}   horizontal bands
//   {type:"crescent", bg, fg}             crescent and star
//   {type:"solid", color}
//   {type:"image", src:"flags/x.png"}     relative to the scene file

const images = new Map();

export async function loadFlagImages(factions, assetUrl) {
  await Promise.all(
    factions
      .filter((f) => f.flag?.type === 'image')
      .map(
        (f) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { images.set(f.flag.src, img); resolve(); };
            img.onerror = () => { console.warn('flag image failed', f.flag.src); resolve(); };
            img.src = assetUrl(f.flag.src);
          }),
      ),
  );
}

export function drawFlag(ctx, flag = { type: 'solid', color: '#888' }, x, y, w, h) {
  ctx.save();
  switch (flag.type) {
    case 'tricolor-v':
      flag.colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + (w * i) / 3, y, w / 3 + 0.5, h); });
      break;
    case 'tricolor-h':
      flag.colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x, y + (h * i) / 3, w, h / 3 + 0.5); });
      break;
    case 'crescent': {
      ctx.fillStyle = flag.bg ?? '#e30a17';
      ctx.fillRect(x, y, w, h);
      const cx = x + w * 0.4, cy = y + h / 2, r = h * 0.3;
      ctx.fillStyle = flag.fg ?? '#fff';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flag.bg ?? '#e30a17';
      ctx.beginPath(); ctx.arc(cx + r * 0.25, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
      star(ctx, x + w * 0.66, cy, h * 0.12, flag.fg ?? '#fff');
      break;
    }
    case 'image': {
      const img = images.get(flag.src);
      if (img) ctx.drawImage(img, x, y, w, h);
      else { ctx.fillStyle = '#888'; ctx.fillRect(x, y, w, h); }
      break;
    }
    default:
      ctx.fillStyle = flag.color ?? '#888';
      ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function star(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + Math.PI / 2; // point to the left like the Turkish flag
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
