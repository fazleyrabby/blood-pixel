import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build runs from any sub-path (itch.io, GH Pages)
  base: './',
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
