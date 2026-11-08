// Dumps the sound cue sheet of a film page (window.__audioPlan) to JSON.
// node scripts/export-audio-plan.cjs rangers.html out.json   (needs `npm run preview` on :4173)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto(`http://localhost:4173/${process.argv[2]}?still=1`);
  await p.waitForFunction(() => window.__audioPlan, null, { timeout: 180000 });
  const plan = await p.evaluate(() => window.__audioPlan(24));
  fs.writeFileSync(process.argv[3], JSON.stringify(plan));
  const counts = {}; plan.events.forEach((e) => (counts[e.type] = (counts[e.type] || 0) + 1));
  console.log('frames', plan.frames.length, 'events', plan.events.length, counts, 'subs', plan.subs.length);
  await b.close();
})();
