import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'esnext' }, // main.js uses top-level await
});
