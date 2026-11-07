// Offline renderer: writes JPEG frames (with captions/fades burned in) for ffmpeg.
// 1) npm run build && npm run preview   (serves on :4173)
// 2) node scripts/render-frames.cjs frames 24 0 1704     (run several in parallel on frame ranges)
// 3) ffmpeg -framerate 24 -i frames/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 film.mp4
// usage: node render-frames.cjs outDir fps from to   (frame indices, end exclusive)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, fps, from, to] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5]];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto('http://localhost:4173/?still=1');
  await p.waitForFunction(() => window.__film, null, { timeout: 120000 });
  await p.evaluate(() => {
    const f = window.__film, W = 1280, H = 720;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const wrap = (text, maxW) => { const words = text.split(' '), lines = []; let l = '';
      for (const w of words) { const t = l ? l + ' ' + w : w; if (g.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; }
      lines.push(l); return lines; };
    window.__comp = (T) => {
      f.setTime(T); f.frame();
      g.drawImage(document.querySelector('#stage canvas'), 0, 0, W, H);
      const S = f.SHOTS; let si = 0; for (let i = 0; i < S.length; i++) if (T >= S[i].start) si = i;
      const shot = S[si], t = T - shot.start;
      // caption
      const ca = Math.min(clamp((t - 0.6) / 0.4), clamp((shot.dur - 0.5 - t) / 0.4));
      if (ca > 0) {
        g.save(); g.globalAlpha = ca;
        g.font = '900 30px Nunito, "DejaVu Sans", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const lines = wrap(shot.caption, W * 0.74), lh = 38;
        const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 48, bh = lines.length * lh + 24;
        const x = W / 2, y = H * 0.9 - bh / 2 + (1 - ca) * 10;
        g.fillStyle = 'rgba(43,37,34,0.85)'; g.strokeStyle = '#2b2522'; g.lineWidth = 4;
        g.beginPath(); g.roundRect(x - bw / 2, y - bh / 2, bw, bh, 16); g.fill(); g.stroke();
        g.fillStyle = '#f6eee0';
        lines.forEach((l, i) => g.fillText(l, x, y - (lines.length - 1) * lh / 2 + i * lh));
        g.restore();
      }
      // title
      if (shot.title) {
        const ta = Math.min(clamp((t - 0.4) / 0.5), clamp((4.2 - t) / 0.5));
        if (ta > 0) {
          g.save(); g.globalAlpha = ta; g.textAlign = 'center'; g.textBaseline = 'middle';
          const s = 0.9 + 0.1 * ta; g.translate(W / 2, H * 0.32); g.scale(s, s);
          g.font = '900 84px "DejaVu Sans", Impact, sans-serif';
          g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#2b2522';
          g.fillStyle = '#2b2522'; g.fillText(shot.title, 0, 7);
          g.strokeText(shot.title, 0, 0); g.fillStyle = '#f6eee0'; g.fillText(shot.title, 0, 0);
          g.restore();
        }
      }
      // cuts
      const fadeIn = si === 0 ? 1 - t / 1.2 : 1 - t / 0.35;
      const fadeOut = si === S.length - 1 ? (t - shot.dur + 1.5) / 1.5 : (t - shot.dur + 0.3) / 0.3;
      const fa = clamp(Math.max(fadeIn, fadeOut));
      if (fa > 0) { g.fillStyle = `rgba(0,0,0,${fa})`; g.fillRect(0, 0, W, H); }
      return c.toDataURL('image/jpeg', 0.92);
    };
  });
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    const data = await p.evaluate((T) => window.__comp(T), i / fps);
    fs.writeFileSync(`${out}/f${String(i).padStart(5, '0')}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(`frames ${from}-${to} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await b.close();
})();
