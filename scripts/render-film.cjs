// Offline renderer for pages that expose window.__comp(t) (captions/fades burned in).
// 1) npm run build && npm run preview          (serves on :4173)
// 2) node scripts/render-film.cjs lushai.html frames 24 0 2160   (split the range across a few processes)
// 3) ffmpeg -framerate 24 -i frames/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 film.mp4
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [page, out, fps, from, to] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto(`http://localhost:4173/${page}?still=1`);
  await p.waitForFunction(() => window.__comp, null, { timeout: 180000 });
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    const data = await p.evaluate((T) => window.__comp(T), i / fps);
    fs.writeFileSync(`${out}/f${String(i).padStart(5, '0')}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(`frames ${from}-${to} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await b.close();
})();
