import { defineConfig } from 'vite';

// base './' keeps every built URL relative, so the game runs from any sub-path (GitHub Pages: /Padel_Game/).
// The gamepad test page is a second entry so it ships too.
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { main: 'index.html', padtest: 'tools/padtest.html' } } },
});
