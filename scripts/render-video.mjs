#!/usr/bin/env node
/**
 * Frame-accurate MP4 export of an episode reel.
 *
 *   npm run build && npm start            # in another terminal (default http://localhost:3000)
 *   node scripts/render-video.mjs 2       # -> renders/ep02.mp4 (1080x1920, 30 fps)
 *   node scripts/render-video.mjs 7 --fps 25 --format 16x9 --base http://localhost:3100
 *
 * The player is put in render mode (?render=1): time is driven from here, frame by frame,
 * so the output is smooth regardless of how slowly this machine renders WebGL.
 * Needs: Playwright (with Chromium) and ffmpeg on PATH. Output is silent (narrate over it).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const episode = Number(args[0]);
if (!episode) {
  console.error("usage: node scripts/render-video.mjs <episode> [--fps 30] [--format 9x16|16x9] [--base URL] [--out file.mp4]");
  process.exit(1);
}
const fps = Number(opt("fps", 30));
const format = opt("format", "9x16");
const base = opt("base", "http://localhost:3000");
const out = opt("out", join(root, "renders", `ep${String(episode).padStart(2, "0")}${format === "16x9" ? "-16x9" : ""}.mp4`));
const viewport = format === "16x9" ? { width: 960, height: 540 } : { width: 540, height: 960 };

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)("playwright"));
} catch {
  ({ chromium } = createRequire(join(process.env.NODE_PATH ?? "", "x"))("playwright"));
}

mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport, deviceScaleFactor: 2 })).newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`${base}/watch/${episode}?render=1&format=${format}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__ahom?.mapReady(), null, { timeout: 60000 });
const total = await page.evaluate(() => window.__ahom.total);
const frames = Math.ceil((total / 1000) * fps);
console.log(`Episode ${episode}: ${(total / 1000).toFixed(1)} s -> ${frames} frames @ ${fps} fps -> ${out}`);

const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  out,
], { stdio: ["pipe", "inherit", "inherit"] });
const ffDone = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  const t = Math.min(total, (i * 1000) / fps);
  await page.evaluate(async (t) => {
    window.__ahom.seek(t);
    const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
    await raf();
    await raf();
    const until = performance.now() + 4000;
    while (!window.__ahom.tilesLoaded() && performance.now() < until) await raf();
  }, t);
  const jpg = await page.screenshot({ type: "jpeg", quality: 92, animations: "disabled" });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % fps === 0) process.stdout.write(`\r  ${Math.round((i / frames) * 100)}%  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ff.stdin.end();
await ffDone;
await browser.close();
console.log(`\n  done in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${out}`);
