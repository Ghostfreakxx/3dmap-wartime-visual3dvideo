#!/usr/bin/env node
// MapLibre 6 ships its web worker as a separate ES module that bundlers do not pick up.
// Copy it into public/ so the app can serve it from its own origin (works offline / PWA).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const out = join(root, "public/vendor/maplibre");
mkdirSync(out, { recursive: true });
copyFileSync(join(dist, "maplibre-gl-worker.mjs"), join(out, "maplibre-gl-worker.mjs"));
console.log("maplibre worker copied to public/vendor/maplibre/");
