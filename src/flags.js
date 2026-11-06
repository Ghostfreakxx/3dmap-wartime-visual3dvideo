// Procedural flags so scenes work offline; use {type:"image", src} for real ones.
//   {type:"tricolor-v", colors:[a,b,c]}   vertical bands (France, Italy, ...)
//   {type:"tricolor-h", colors:[a,b,c], wheel?, star?}   horizontal bands
//   {type:"crescent", bg, fg}             crescent and star
//   {type:"union"}                        Union Flag
//   {type:"disc", bg, fg}                 plain field with a central disc
//   {type:"icon", glyph, bg, fg}          badge: sun house leaf chip shield anchor road rail coin
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
      if (flag.wheel) { // e.g. India's Ashoka Chakra
        ctx.strokeStyle = flag.wheel;
        ctx.lineWidth = Math.max(1, h * 0.04);
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.13, 0, Math.PI * 2); ctx.stroke();
      }
      if (flag.star) star(ctx, x + w * 0.2, y + h / 6, h * 0.12, flag.star, -Math.PI / 2);
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
    case 'union': {
      // Union Flag (simplified proportions)
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = '#012169'; ctx.fillRect(x, y, w, h);
      const diag = (width, color) => {
        ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
        ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
        ctx.stroke();
      };
      diag(h * 0.2, '#fff');
      diag(h * 0.07, '#c8102e');
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h);
      ctx.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
      ctx.fillStyle = '#c8102e';
      ctx.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h);
      ctx.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2);
      break;
    }
    case 'disc': {
      ctx.fillStyle = flag.bg ?? '#fff';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = flag.fg ?? '#c8102e';
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'icon': {
      // round badge with a simple glyph: sun house leaf chip shield anchor road rail coin
      ctx.fillStyle = flag.bg ?? '#333';
      ctx.fillRect(x, y, w, h);
      glyph(ctx, flag.glyph, x + w / 2, y + h / 2, h * 0.36, flag.fg ?? '#fff');
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
      if (flag.star) star(ctx, x + w / 2, y + h / 2, h * 0.32, flag.star, -Math.PI / 2);
  }
  ctx.restore();
}

function star(ctx, cx, cy, r, color, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5; // rot=0 points right (Turkish flag style)
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function glyph(ctx, g, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, r * 0.22);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (g) {
    case 'sun':
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        ctx.moveTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.stroke();
      break;
    case 'house':
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - r * 0.65, cy, r * 1.3, r * 0.85);
      break;
    case 'leaf':
      ctx.ellipse(cx, cy, r * 0.5, r, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
      break;
    case 'chip':
      ctx.strokeRect(cx - r * 0.6, cy - r * 0.6, r * 1.2, r * 1.2);
      ctx.fillRect(cx - r * 0.25, cy - r * 0.25, r * 0.5, r * 0.5);
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(cx + k * r * 0.4, cy - r * 0.6); ctx.lineTo(cx + k * r * 0.4, cy - r);
        ctx.moveTo(cx + k * r * 0.4, cy + r * 0.6); ctx.lineTo(cx + k * r * 0.4, cy + r);
      }
      ctx.stroke();
      break;
    case 'shield':
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy - r * 0.6); ctx.lineTo(cx + r * 0.6, cy + r * 0.4);
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.6, cy + r * 0.4); ctx.lineTo(cx - r * 0.8, cy - r * 0.6); ctx.closePath(); ctx.fill();
      break;
    case 'anchor':
      ctx.arc(cx, cy - r * 0.7, r * 0.22, 0, Math.PI * 2);
      ctx.moveTo(cx, cy - r * 0.48); ctx.lineTo(cx, cy + r);
      ctx.moveTo(cx - r * 0.75, cy + r * 0.25); ctx.quadraticCurveTo(cx, cy + r * 1.3, cx + r * 0.75, cy + r * 0.25);
      ctx.moveTo(cx - r * 0.45, cy - r * 0.15); ctx.lineTo(cx + r * 0.45, cy - r * 0.15);
      ctx.stroke();
      break;
    case 'road':
      ctx.moveTo(cx - r * 0.3, cy - r); ctx.lineTo(cx - r * 0.9, cy + r);
      ctx.moveTo(cx + r * 0.3, cy - r); ctx.lineTo(cx + r * 0.9, cy + r);
      ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy - r * 0.3);
      ctx.moveTo(cx, cy + r * 0.1); ctx.lineTo(cx, cy + r * 0.6);
      ctx.stroke();
      break;
    case 'rail':
      ctx.moveTo(cx - r * 0.45, cy - r); ctx.lineTo(cx - r * 0.45, cy + r);
      ctx.moveTo(cx + r * 0.45, cy - r); ctx.lineTo(cx + r * 0.45, cy + r);
      for (let k = -2; k <= 2; k++) { ctx.moveTo(cx - r * 0.8, cy + k * r * 0.4); ctx.lineTo(cx + r * 0.8, cy + k * r * 0.4); }
      ctx.stroke();
      break;
    case 'coin':
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `900 ${r * 1.2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('₿', cx, cy + r * 0.05);
      break;
    default:
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
