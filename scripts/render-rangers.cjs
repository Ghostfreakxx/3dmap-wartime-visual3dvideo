// Renders rangers.html into two frame sequences: wide (16:9 cinema) and reel (9:16).
// node scripts/render-convoy.cjs <outDir> <fps> <from> <to>      (needs `npm run preview` on :4173)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, fps, from, to] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5]];
  for (const d of ['wide', 'reel']) fs.mkdirSync(`${out}/${d}`, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto('http://localhost:4173/rangers.html?still=1');
  await p.waitForFunction(() => window.__compBoth, null, { timeout: 180000 });
  const total = await p.evaluate(() => window.__film.TOTAL);
  const end = Math.min(to, Math.round(total * fps));
  const t0 = Date.now();
  const order = [...Array(Math.max(0, end - from)).keys()].map((k) => from + k);
  if (process.env.REVERSE) order.reverse(); // a helper can eat a range from the back while another works from the front
  for (const i of order) {
    const name = `f${String(i).padStart(5, '0')}.jpg`;
    if (process.env.RESUME && fs.existsSync(`${out}/wide/${name}`) && fs.existsSync(`${out}/reel/${name}`)) continue; // resume
    const [w, r] = await p.evaluate((t) => window.__compBoth(t), i / fps);
    fs.writeFileSync(`${out}/wide/${name}`, Buffer.from(w.split(',')[1], 'base64'));
    fs.writeFileSync(`${out}/reel/${name}`, Buffer.from(r.split(',')[1], 'base64'));
  }
  console.log(`frames ${from}-${end} of ${Math.round(total * fps)} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await b.close();
})();
