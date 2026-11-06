#!/usr/bin/env node
// Frame-accurate renderer: drives the page in headless Chromium, seeks to
// each frame, screenshots it and pipes the frames into ffmpeg.
//
//   npm run render -- scenes/aizawl-1966.json
//   npm run render -- scenes/egypt-1798.json --out out/egypt.mp4 --scale 0.5
//   npm run render -- scenes/egypt-1798.json --still 12 --out out/frame.png
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const scene = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!scene) {
  console.error('usage: npm run render -- <scenes/file.json> [--out file.mp4] [--scale 0.5] [--from s] [--to s] [--still s]');
  process.exit(1);
}
const scale = parseFloat(opt('scale', '1'));
const still = opt('still');
const out = path.resolve(opt('out', path.join('out', path.basename(scene, '.json') + (still ? '.png' : '.mp4'))));
fs.mkdirSync(path.dirname(out), { recursive: true });

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

// no file watching / HMR: editing sources mid-render must not reload the page
const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false, watch: null } });
await server.listen();
const base = server.resolvedUrls.local[0];

const spec = JSON.parse(fs.readFileSync(path.join(root, 'public', scene), 'utf8'));
const W = Math.round((spec.width ?? 1080) * scale);
const H = Math.round((spec.height ?? 1920) * scale);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[page]', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));

const cleanup = async () => { await browser.close(); await server.close(); };

try {
  await page.goto(`${base}?scene=${encodeURIComponent(scene)}&render=1&scale=${scale}`);
  await page.waitForFunction(() => window.__renderer?.ready, null, { timeout: 180000 });
  const info = await page.evaluate(() => {
    const { duration, fps, audio } = window.__renderer;
    return { duration, fps, audio };
  });
  const fps = parseFloat(opt('fps', info.fps));
  const clip = { x: 0, y: 0, width: W, height: H };

  if (still) {
    await page.evaluate((t) => window.__renderer.seek(t), parseFloat(still));
    await page.screenshot({ path: out, clip });
    console.log(`wrote ${out}`);
  } else {
    const from = parseFloat(opt('from', '0'));
    const to = Math.min(parseFloat(opt('to', info.duration)), info.duration);
    const frames = Math.round((to - from) * fps);
    const audioPath = info.audio ? path.join(root, 'public', path.dirname(scene), info.audio) : null;
    const hasAudio = audioPath && fs.existsSync(audioPath);

    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      ...(hasAudio ? ['-ss', String(from), '-i', audioPath] : []),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k'] : []),
      '-t', String(to - from),
      out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => window.__renderer.seek(t), from + f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95, clip });
      if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
      if (f % fps === 0 || f === frames - 1) {
        const rate = (f + 1) / ((Date.now() - t0) / 1000);
        process.stdout.write(`\rframe ${f + 1}/${frames}  (${rate.toFixed(1)} fps)   `);
      }
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    console.log(code === 0 ? `\nwrote ${out}` : `\nffmpeg exited with ${code}`);
  }
} finally {
  await cleanup();
}
