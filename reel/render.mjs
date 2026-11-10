// Renders the film frame by frame in headless Chromium and encodes it with ffmpeg.
//   node render.mjs                 full film  -> mizo-youth-reel.mp4
//   node render.mjs --stills 5,25   PNG stills -> frames/still-<t>.png
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const DIR = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const file = path.join(DIR, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!file.startsWith(DIR) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({ args: [] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(url);
await page.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout: 60000 });
const duration = await page.evaluate(() => window.FILM.duration);
const stage = page.locator('#stage');

const stillsArg = process.argv.indexOf('--stills');
if (stillsArg > -1) {
  fs.mkdirSync(path.join(DIR, 'frames'), { recursive: true });
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate(x => window.renderFrame(x), t);
    await stage.screenshot({ path: path.join(DIR, 'frames', `still-${t}.png`) });
    console.log('still', t);
  }
} else {
  const audio = path.join(DIR, 'audio.wav');
  const hasAudio = fs.existsSync(audio);
  const out = path.join(DIR, 'mizo-youth-reel.mp4');
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    ...(hasAudio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    ...(hasAudio ? ['-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-movflags', '+faststart', out];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(duration * FPS);
  const started = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(x => window.renderFrame(x), f / FPS);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('wrote', out, hasAudio ? '(with audio)' : '(silent: run audio.py first for sound)');
}
await browser.close();
server.close();
