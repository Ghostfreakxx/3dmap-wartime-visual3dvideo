import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), lushai: resolve(__dirname, 'lushai.html'), mnf: resolve(__dirname, 'mnf.html'), convoy: resolve(__dirname, 'convoy.html') } } },
});
