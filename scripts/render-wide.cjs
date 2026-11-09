// Renders a film page that exposes window.__compWide(t) to numbered JPEG frames.
// node scripts/render-wide.cjs <page.html> <outDir> <fps> <from> <to>   (needs `npm run preview` on :4173)
// RESUME=1 skips frames already on disk; REVERSE=1 walks the range backwards (a helper for a slow range).
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [page, out, fps, from, to] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto(`http://localhost:4173/${page}?still=1`);
  await p.waitForFunction(() => window.__compWide, null, { timeout: 180000 });
  const total = await p.evaluate(() => window.__film.TOTAL);
  const end = Math.min(to, Math.round(total * fps));
  const order = [...Array(Math.max(0, end - from)).keys()].map((k) => from + k);
  if (process.env.REVERSE) order.reverse();
  const t0 = Date.now();
  for (const i of order) {
    const name = `${out}/f${String(i).padStart(5, '0')}.jpg`;
    if (process.env.RESUME && fs.existsSync(name)) continue;
    const w = await p.evaluate((t) => window.__compWide(t), i / fps);
    fs.writeFileSync(name, Buffer.from(w.split(',')[1], 'base64'));
  }
  console.log(`frames ${from}-${end} of ${Math.round(total * fps)} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await b.close();
})();
